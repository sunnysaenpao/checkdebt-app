import { Router } from 'express';
import prisma from '../prisma.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

/** Redeem a license code to activate a subscription */
router.post('/activate', authenticate, async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ error: 'License code is required' });

    const licenseCode = await prisma.licenseCode.findUnique({ where: { code } });

    if (!licenseCode || licenseCode.is_used) {
      return res.status(400).json({ error: 'Invalid or already used license code' });
    }

    const now = new Date();
    const endsAt = new Date(now.getTime() + licenseCode.duration_days * 24 * 60 * 60 * 1000);
    const lenderId = req.user.lender_id;

    const result = await prisma.$transaction(async (tx) => {
      // Mark license code as used
      await tx.licenseCode.update({
        where: { id: licenseCode.id },
        data: {
          is_used: true,
          used_by: lenderId,
          used_at: now,
        },
      });

      // Update lender license status
      const lender = await tx.lender.update({
        where: { id: lenderId },
        data: {
          license_status: 'active',
          license_expires: endsAt,
        },
      });

      // Create subscription record
      const subscription = await tx.subscription.create({
        data: {
          lender_id: lenderId,
          license_code: licenseCode.code,
          plan: licenseCode.plan,
          starts_at: now,
          ends_at: endsAt,
        },
      });

      return { lender, subscription };
    });

    res.json({
      message: 'License activated successfully',
      lender: {
        id: result.lender.id,
        name: result.lender.name,
        license_status: result.lender.license_status,
        license_expires: result.lender.license_expires,
      },
      subscription: result.subscription,
    });
  } catch (err) {
    console.error('License activation error:', err);
    res.status(500).json({ error: 'Failed to activate license' });
  }
});

/** Get current license status for the logged-in lender */
router.get('/status', authenticate, async (req, res) => {
  try {
    const now = new Date();
    const lender = await prisma.lender.findUnique({
      where: { id: req.user.lender_id },
      include: {
        subscriptions: { orderBy: { created_at: 'desc' } },
      },
    });

    if (!lender) return res.status(404).json({ error: 'Lender not found' });

    // Enrich subscriptions with license code details
    const codeLookup = lender.subscriptions.map(s => s.license_code);
    const codes = codeLookup.length > 0
      ? await prisma.licenseCode.findMany({
          where: { code: { in: codeLookup } },
          select: { code: true, plan: true, duration_days: true },
        })
      : [];
    const codeMap = Object.fromEntries(codes.map(c => [c.code, c]));

    const subscriptions = lender.subscriptions.map(s => ({
      ...s,
      duration_days: codeMap[s.license_code]?.duration_days || null,
      is_active: s.ends_at > now,
    }));

    res.json({
      license_status: lender.license_status,
      trial_ends_at: lender.trial_ends_at,
      license_expires: lender.license_expires,
      is_trial_active: lender.trial_ends_at ? lender.trial_ends_at > now : false,
      subscriptions,
    });
  } catch (err) {
    console.error('License status error:', err);
    res.status(500).json({ error: 'Failed to fetch license status' });
  }
});

export default router;
