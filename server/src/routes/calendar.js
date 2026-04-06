import { Router } from 'express';
import prisma from '../prisma.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

/** Get all payment schedules for calendar view (includes paid items) */
router.get('/', async (req, res) => {
  try {
    const { from, to } = req.query;
    const now = new Date();

    const where = {
      lender_id: req.user.lender_id,
    };

    if (from || to) {
      where.due_date = {};
      if (from) where.due_date.gte = new Date(from);
      if (to) where.due_date.lte = new Date(to);
    }

    const schedules = await prisma.paymentSchedule.findMany({
      where,
      include: {
        loan: {
          select: {
            id: true,
            borrower: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { due_date: 'asc' },
    });

    const items = schedules.map((s) => ({
      ...s,
      borrower_id: s.loan.borrower.id,
      borrower_name: s.loan.borrower.name,
      loan_id: s.loan.id,
      is_overdue: s.due_date < now && s.status !== 'paid',
    }));

    res.json(items);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch calendar data' });
  }
});

/** Get list of borrowers (for the filter dropdown) */
router.get('/borrowers', async (req, res) => {
  try {
    const borrowers = await prisma.borrower.findMany({
      where: { lender_id: req.user.lender_id },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });
    res.json(borrowers);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch borrowers' });
  }
});

export default router;
