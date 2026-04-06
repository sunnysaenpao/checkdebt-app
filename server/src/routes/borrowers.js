import { Router } from 'express';
import prisma from '../prisma.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

/** List all borrowers for this lender */
router.get('/', async (req, res) => {
  try {
    const borrowers = await prisma.borrower.findMany({
      where: { lender_id: req.user.lender_id },
      include: { _count: { select: { loans: true } } },
      orderBy: { created_at: 'desc' },
    });
    res.json(borrowers);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch borrowers' });
  }
});

/** Get single borrower with loans */
router.get('/:id', async (req, res) => {
  try {
    const borrower = await prisma.borrower.findFirst({
      where: { id: req.params.id, lender_id: req.user.lender_id },
      include: {
        loans: { orderBy: { created_at: 'desc' } },
        documents: { orderBy: { created_at: 'desc' } },
      },
    });
    if (!borrower) return res.status(404).json({ error: 'Borrower not found' });
    res.json(borrower);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch borrower' });
  }
});

/** Create borrower */
router.post('/', async (req, res) => {
  try {
    const {
      name, phone, registered_address, residential_address, work_address,
      lat, lng, registered_lat, registered_lng, residential_lat, residential_lng,
      work_lat, work_lng,
    } = req.body;
    const pf = (v) => v ? parseFloat(v) : null;
    const borrower = await prisma.borrower.create({
      data: {
        lender_id: req.user.lender_id,
        name, phone, registered_address, residential_address, work_address: work_address || null,
        lat: pf(lat), lng: pf(lng),
        registered_lat: pf(registered_lat), registered_lng: pf(registered_lng),
        residential_lat: pf(residential_lat), residential_lng: pf(residential_lng),
        work_lat: pf(work_lat), work_lng: pf(work_lng),
      },
    });
    res.status(201).json(borrower);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create borrower' });
  }
});

/** Update borrower */
router.put('/:id', async (req, res) => {
  try {
    const existing = await prisma.borrower.findFirst({
      where: { id: req.params.id, lender_id: req.user.lender_id },
    });
    if (!existing) return res.status(404).json({ error: 'Borrower not found' });

    const {
      name, phone, registered_address, residential_address, work_address,
      lat, lng, registered_lat, registered_lng, residential_lat, residential_lng,
      work_lat, work_lng,
    } = req.body;
    const pf = (v) => v ? parseFloat(v) : null;
    const borrower = await prisma.borrower.update({
      where: { id: req.params.id },
      data: {
        name, phone, registered_address, residential_address, work_address: work_address || null,
        lat: pf(lat), lng: pf(lng),
        registered_lat: pf(registered_lat), registered_lng: pf(registered_lng),
        residential_lat: pf(residential_lat), residential_lng: pf(residential_lng),
        work_lat: pf(work_lat), work_lng: pf(work_lng),
      },
    });
    res.json(borrower);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update borrower' });
  }
});

/** Delete borrower */
router.delete('/:id', async (req, res) => {
  try {
    const existing = await prisma.borrower.findFirst({
      where: { id: req.params.id, lender_id: req.user.lender_id },
    });
    if (!existing) return res.status(404).json({ error: 'Borrower not found' });

    await prisma.borrower.delete({ where: { id: req.params.id } });
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete borrower' });
  }
});

export default router;
