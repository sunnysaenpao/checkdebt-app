import { Router } from 'express';
import prisma from '../prisma.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

/** Get all map data: lender location + all borrowers with lat/lng */
router.get('/', async (req, res) => {
  try {
    const lenderId = req.user.lender_id;

    const lender = await prisma.lender.findUnique({
      where: { id: lenderId },
      select: { id: true, name: true, address: true, lat: true, lng: true },
    });

    const borrowers = await prisma.borrower.findMany({
      where: { lender_id: lenderId },
      select: {
        id: true, name: true, phone: true,
        registered_address: true, registered_lat: true, registered_lng: true,
        residential_address: true, residential_lat: true, residential_lng: true,
        work_address: true, work_lat: true, work_lng: true,
        lat: true, lng: true,
        _count: { select: { loans: true } },
      },
    });

    // Only return borrowers that have coordinates
    const mappedBorrowers = borrowers.map((b) => ({
      ...b,
      loan_count: b._count.loans,
    }));

    res.json({ lender, borrowers: mappedBorrowers });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load map data' });
  }
});

/** Update lender's own location */
router.put('/lender-location', async (req, res) => {
  try {
    const { address, lat, lng } = req.body;
    const lender = await prisma.lender.update({
      where: { id: req.user.lender_id },
      data: {
        address,
        lat: lat ? parseFloat(lat) : null,
        lng: lng ? parseFloat(lng) : null,
      },
    });
    res.json({ id: lender.id, address: lender.address, lat: lender.lat, lng: lender.lng });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update location' });
  }
});

export default router;
