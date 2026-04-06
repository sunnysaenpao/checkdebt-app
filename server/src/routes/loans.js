import { Router } from 'express';
import prisma from '../prisma.js';
import { authenticate } from '../middleware/auth.js';
import { calculateLoan, generateSchedule } from '../services/loanCalculation.js';

const router = Router();
router.use(authenticate);

/** List all loans for this lender */
router.get('/', async (req, res) => {
  try {
    const loans = await prisma.loan.findMany({
      where: { lender_id: req.user.lender_id },
      include: { borrower: { select: { id: true, name: true, phone: true } } },
      orderBy: { created_at: 'desc' },
    });
    res.json(loans);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch loans' });
  }
});

/** Get single loan with schedule and payments */
router.get('/:id', async (req, res) => {
  try {
    const loan = await prisma.loan.findFirst({
      where: { id: req.params.id, lender_id: req.user.lender_id },
      include: {
        borrower: true,
        schedules: { orderBy: { installment: 'asc' } },
        payments: { orderBy: { payment_date: 'desc' } },
      },
    });
    if (!loan) return res.status(404).json({ error: 'Loan not found' });
    res.json(loan);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch loan' });
  }
});

/** Preview loan calculation (no DB write) */
router.post('/preview', (req, res) => {
  try {
    const result = calculateLoan(req.body);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message });
  }
});

/** Create a new loan with generated payment schedule */
router.post('/', async (req, res) => {
  try {
    const {
      borrower_id, principal, interest_rate, interest_rate_unit,
      interest_method, term_length, term_unit, payment_frequency,
      interest_behavior, collateral, disbursed_at,
      sig_lender, sig_borrower, sig_witness1, sig_witness2,
      witness1_name, witness2_name,
    } = req.body;

    // Verify borrower belongs to this lender
    const borrower = await prisma.borrower.findFirst({
      where: { id: borrower_id, lender_id: req.user.lender_id },
    });
    if (!borrower) return res.status(404).json({ error: 'Borrower not found' });

    // Calculate loan terms
    const calc = calculateLoan({
      principal: parseFloat(principal),
      interest_rate: parseFloat(interest_rate),
      interest_rate_unit, interest_method, term_length: parseInt(term_length),
      term_unit, payment_frequency, interest_behavior,
    });

    const disbursementDate = disbursed_at ? new Date(disbursed_at) : new Date();

    // Create loan + schedule in a transaction
    const loan = await prisma.$transaction(async (tx) => {
      const newLoan = await tx.loan.create({
        data: {
          lender_id: req.user.lender_id,
          borrower_id,
          principal: parseFloat(principal),
          interest_rate: parseFloat(interest_rate),
          interest_rate_unit, interest_method: interest_method || 'flat',
          term_length: parseInt(term_length), term_unit,
          payment_frequency, interest_behavior,
          collateral: collateral || null,
          daily_rate: calc.daily_rate,
          total_interest: calc.total_interest,
          total_payable: calc.total_payable,
          installment_count: calc.installment_count,
          installment_amount: calc.installment_amount,
          outstanding_balance: calc.total_payable,
          disbursed_at: disbursementDate,
          sig_lender: sig_lender || null,
          sig_borrower: sig_borrower || null,
          sig_witness1: sig_witness1 || null,
          sig_witness2: sig_witness2 || null,
          witness1_name: witness1_name || null,
          witness2_name: witness2_name || null,
        },
      });

      // Generate and insert payment schedule
      const schedule = generateSchedule({
        ...newLoan,
        disbursed_at: disbursementDate,
      });

      for (const item of schedule) {
        await tx.paymentSchedule.create({
          data: {
            lender_id: req.user.lender_id,
            loan_id: newLoan.id,
            installment: item.installment,
            due_date: item.due_date,
            principal_due: item.principal_due,
            interest_due: item.interest_due,
            total_due: item.total_due,
          },
        });
      }

      return newLoan;
    });

    // Return the full loan with schedule
    const fullLoan = await prisma.loan.findUnique({
      where: { id: loan.id },
      include: { borrower: true, schedules: { orderBy: { installment: 'asc' } } },
    });

    res.status(201).json(fullLoan);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create loan' });
  }
});

/** Update a loan and regenerate its payment schedule (only if no payments made yet) */
router.put('/:id', async (req, res) => {
  try {
    const existing = await prisma.loan.findFirst({
      where: { id: req.params.id, lender_id: req.user.lender_id },
      include: { payments: true },
    });
    if (!existing) return res.status(404).json({ error: 'Loan not found' });

    // Block editing if payments have already been made
    if (existing.payments.length > 0) {
      return res.status(400).json({ error: 'Cannot edit a loan that already has payments recorded' });
    }

    const {
      principal, interest_rate, interest_rate_unit,
      interest_method, term_length, term_unit, payment_frequency,
      interest_behavior, disbursed_at,
    } = req.body;

    // Recalculate loan terms
    const calc = calculateLoan({
      principal: parseFloat(principal),
      interest_rate: parseFloat(interest_rate),
      interest_rate_unit, interest_method: interest_method || 'flat',
      term_length: parseInt(term_length),
      term_unit, payment_frequency, interest_behavior,
    });

    const disbursementDate = disbursed_at ? new Date(disbursed_at) : existing.disbursed_at;

    // Update loan + regenerate schedule in a transaction
    const updatedLoan = await prisma.$transaction(async (tx) => {
      // Delete old schedule
      await tx.paymentSchedule.deleteMany({ where: { loan_id: existing.id } });

      // Update loan record
      const loan = await tx.loan.update({
        where: { id: existing.id },
        data: {
          principal: parseFloat(principal),
          interest_rate: parseFloat(interest_rate),
          interest_rate_unit,
          interest_method: interest_method || 'flat',
          term_length: parseInt(term_length),
          term_unit,
          payment_frequency,
          interest_behavior,
          daily_rate: calc.daily_rate,
          total_interest: calc.total_interest,
          total_payable: calc.total_payable,
          installment_count: calc.installment_count,
          installment_amount: calc.installment_amount,
          outstanding_balance: calc.total_payable,
          total_paid: 0,
          disbursed_at: disbursementDate,
        },
      });

      // Generate new schedule
      const schedule = generateSchedule({ ...loan, disbursed_at: disbursementDate });
      for (const item of schedule) {
        await tx.paymentSchedule.create({
          data: {
            lender_id: req.user.lender_id,
            loan_id: loan.id,
            installment: item.installment,
            due_date: item.due_date,
            principal_due: item.principal_due,
            interest_due: item.interest_due,
            total_due: item.total_due,
          },
        });
      }

      return loan;
    });

    const fullLoan = await prisma.loan.findUnique({
      where: { id: updatedLoan.id },
      include: { borrower: true, schedules: { orderBy: { installment: 'asc' } } },
    });

    res.json(fullLoan);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update loan' });
  }
});

/** Reschedule a single payment's due date */
router.patch('/:id/schedule/:scheduleId', async (req, res) => {
  try {
    const { due_date } = req.body;
    if (!due_date) return res.status(400).json({ error: 'New due date is required' });

    // Verify loan belongs to this lender
    const loan = await prisma.loan.findFirst({
      where: { id: req.params.id, lender_id: req.user.lender_id },
    });
    if (!loan) return res.status(404).json({ error: 'Loan not found' });

    // Verify schedule belongs to this loan
    const schedule = await prisma.paymentSchedule.findFirst({
      where: { id: req.params.scheduleId, loan_id: loan.id, lender_id: req.user.lender_id },
    });
    if (!schedule) return res.status(404).json({ error: 'Schedule item not found' });

    // Only allow rescheduling if not fully paid
    if (schedule.status === 'paid') {
      return res.status(400).json({ error: 'Cannot reschedule a fully paid installment' });
    }

    const updated = await prisma.paymentSchedule.update({
      where: { id: schedule.id },
      data: { due_date: new Date(due_date) },
    });

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to reschedule payment' });
  }
});

export default router;
