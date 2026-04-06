import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import prisma from '../prisma.js';
import { authenticate } from '../middleware/auth.js';
import { applyPayment } from '../services/loanCalculation.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const storage = multer.diskStorage({
  destination: path.join(__dirname, '../../uploads'),
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `slip-${unique}${path.extname(file.originalname)}`);
  },
});

const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } }); // 5MB

const router = Router();
router.use(authenticate);

/**
 * Record a payment for a specific loan schedule item.
 * Supports multipart form data for bank transfer slip upload.
 */
router.post('/:loanId', upload.single('slip_image'), async (req, res) => {
  try {
    const { amount, schedule_id, notes, payment_type } = req.body;
    const paymentAmount = parseFloat(amount);

    if (!paymentAmount || paymentAmount <= 0) {
      return res.status(400).json({ error: 'Invalid payment amount' });
    }

    // Verify loan belongs to this lender
    const loan = await prisma.loan.findFirst({
      where: { id: req.params.loanId, lender_id: req.user.lender_id },
    });
    if (!loan) return res.status(404).json({ error: 'Loan not found' });

    // Get the target schedule item
    const schedule = await prisma.paymentSchedule.findFirst({
      where: { id: schedule_id, loan_id: loan.id, lender_id: req.user.lender_id },
    });
    if (!schedule) return res.status(404).json({ error: 'Schedule item not found' });

    // Calculate how payment is allocated (interest first, then principal)
    const remainingInterest = schedule.interest_due - schedule.interest_paid;
    const remainingPrincipal = schedule.principal_due - schedule.principal_paid;
    const allocation = applyPayment(
      paymentAmount, { interest_due: remainingInterest, principal_due: remainingPrincipal },
      loan.interest_behavior, loan.outstanding_balance
    );

    // Slip image path (only for bank_transfer)
    const slipPath = req.file ? `/uploads/${req.file.filename}` : null;

    // Execute all updates in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create payment record
      const payment = await tx.payment.create({
        data: {
          lender_id: req.user.lender_id,
          loan_id: loan.id,
          schedule_id,
          amount: paymentAmount,
          interest_paid: allocation.interest_paid,
          principal_paid: allocation.principal_paid,
          payment_type: payment_type || 'cash',
          slip_image: slipPath,
          notes,
        },
      });

      // 2. Update schedule item
      const newInterestPaid = schedule.interest_paid + allocation.interest_paid;
      const newPrincipalPaid = schedule.principal_paid + allocation.principal_paid;
      const fullyPaid = newInterestPaid >= schedule.interest_due && newPrincipalPaid >= schedule.principal_due;

      await tx.paymentSchedule.update({
        where: { id: schedule_id },
        data: {
          interest_paid: newInterestPaid,
          principal_paid: newPrincipalPaid,
          status: fullyPaid ? 'paid' : 'partial',
        },
      });

      // 3. Update loan running balance
      const newOutstanding = allocation.new_outstanding;
      const newTotalPaid = loan.total_paid + paymentAmount;
      const capitalizeAdj = allocation.capitalize_amount;

      await tx.loan.update({
        where: { id: loan.id },
        data: {
          outstanding_balance: newOutstanding + capitalizeAdj,
          total_paid: newTotalPaid,
          status: newOutstanding + capitalizeAdj <= 0 ? 'completed' : 'active',
        },
      });

      return payment;
    });

    // Return updated loan with schedule
    const updatedLoan = await prisma.loan.findUnique({
      where: { id: loan.id },
      include: { schedules: { orderBy: { installment: 'asc' } }, payments: { orderBy: { payment_date: 'desc' } } },
    });

    res.json({ payment: result, loan: updatedLoan });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to record payment' });
  }
});

/** Get all payments for a loan */
router.get('/:loanId', async (req, res) => {
  try {
    const payments = await prisma.payment.findMany({
      where: { loan_id: req.params.loanId, lender_id: req.user.lender_id },
      orderBy: { payment_date: 'desc' },
    });
    res.json(payments);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch payments' });
  }
});

export default router;
