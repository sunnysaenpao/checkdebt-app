import { Router } from 'express';
import prisma from '../prisma.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

/** Dashboard aggregation — all amounts scoped to lender_id */
router.get('/', async (req, res) => {
  try {
    const lenderId = req.user.lender_id;

    // All loans for this lender
    const loans = await prisma.loan.findMany({
      where: { lender_id: lenderId },
    });

    const totalLent = loans.reduce((sum, l) => sum + l.principal, 0);
    const totalCollected = loans.reduce((sum, l) => sum + l.total_paid, 0);
    const totalOutstanding = loans.reduce((sum, l) => sum + l.outstanding_balance, 0);

    // Find overdue schedules (due_date < now AND not paid)
    const overdueSchedules = await prisma.paymentSchedule.findMany({
      where: {
        lender_id: lenderId,
        due_date: { lt: new Date() },
        status: { in: ['pending', 'partial'] },
      },
    });

    const overdueAmount = overdueSchedules.reduce(
      (sum, s) => sum + (s.total_due - s.interest_paid - s.principal_paid), 0
    );

    // Interest collected = sum of interest_paid from all payments
    const payments = await prisma.payment.findMany({
      where: { lender_id: lenderId },
      select: { interest_paid: true },
    });
    const interestCollected = payments.reduce((sum, p) => sum + p.interest_paid, 0);

    // Future interest = total interest from all active loans minus interest already paid
    // We get it from schedules: sum of (interest_due - interest_paid) for unpaid schedules
    const unpaidSchedules = await prisma.paymentSchedule.findMany({
      where: {
        lender_id: lenderId,
        status: { in: ['pending', 'partial'] },
      },
      select: { interest_due: true, interest_paid: true },
    });
    const futureInterest = unpaidSchedules.reduce(
      (sum, s) => sum + (s.interest_due - s.interest_paid), 0
    );

    // Counts
    const activeLoanCount = loans.filter(l => l.status === 'active').length;
    const borrowerCount = await prisma.borrower.count({ where: { lender_id: lenderId } });

    // Recent loans
    const recentLoans = await prisma.loan.findMany({
      where: { lender_id: lenderId },
      include: { borrower: { select: { name: true } } },
      orderBy: { created_at: 'desc' },
      take: 5,
    });

    res.json({
      totalLent,
      totalCollected,
      totalOutstanding,
      overdueAmount,
      interestCollected,
      futureInterest,
      activeLoanCount,
      borrowerCount,
      recentLoans,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load dashboard' });
  }
});

export default router;
