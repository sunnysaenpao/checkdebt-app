import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import prisma from '../prisma.js';
import { authenticateAdmin } from '../middleware/adminAuth.js';

const router = Router();

// ─── Plan config ────────────────────────────────────────────────────────────

const PLAN_DURATION = {
  monthly: 30,
  quarterly: 90,
  semiannual: 180,
  yearly: 365,
};

const PLAN_PREFIX = {
  monthly: '1M',
  quarterly: '3M',
  semiannual: '6M',
  yearly: '1Y',
};

// ─── Auth routes ────────────────────────────────────────────────────────────

/** Admin login */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const admin = await prisma.admin.findUnique({ where: { email } });
    if (!admin || !(await bcrypt.compare(password, admin.password))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: admin.id, email: admin.email, isAdmin: true },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({ token, admin: { id: admin.id, email: admin.email, name: admin.name } });
  } catch (err) {
    console.error('Admin login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

/** Get current admin profile */
router.get('/me', authenticateAdmin, async (req, res) => {
  try {
    const admin = await prisma.admin.findUnique({ where: { id: req.admin.id } });
    if (!admin) return res.status(404).json({ error: 'Admin not found' });

    res.json({ id: admin.id, email: admin.email, name: admin.name });
  } catch (err) {
    console.error('Admin profile error:', err);
    res.status(500).json({ error: 'Failed to fetch admin profile' });
  }
});

// ─── Lender management ─────────────────────────────────────────────────────

/** List all lenders with aggregated counts */
router.get('/lenders', authenticateAdmin, async (req, res) => {
  try {
    const now = new Date();
    const lenders = await prisma.lender.findMany({
      include: {
        _count: { select: { users: true, loans: true, borrowers: true } },
        subscriptions: { orderBy: { created_at: 'desc' }, take: 1 },
      },
      orderBy: { created_at: 'desc' },
    });

    const result = lenders.map((l) => ({
      id: l.id,
      name: l.name,
      license_status: l.license_status,
      trial_ends_at: l.trial_ends_at,
      license_expires: l.license_expires,
      created_at: l.created_at,
      _count: l._count,
      latest_subscription: l.subscriptions[0] || null,
      is_trial_expired: l.trial_ends_at < now && l.license_status === 'trial',
    }));

    res.json(result);
  } catch (err) {
    console.error('List lenders error:', err);
    res.status(500).json({ error: 'Failed to fetch lenders' });
  }
});

/** Single lender detail */
router.get('/lenders/:id', authenticateAdmin, async (req, res) => {
  try {
    const lender = await prisma.lender.findUnique({
      where: { id: req.params.id },
      include: {
        users: { select: { id: true, email: true, name: true, role: true, created_at: true } },
        loans: { orderBy: { created_at: 'desc' }, take: 20 },
        subscriptions: { orderBy: { created_at: 'desc' } },
        _count: { select: { users: true, loans: true, borrowers: true } },
      },
    });

    if (!lender) return res.status(404).json({ error: 'Lender not found' });

    res.json(lender);
  } catch (err) {
    console.error('Lender detail error:', err);
    res.status(500).json({ error: 'Failed to fetch lender' });
  }
});

/** Update lender license status */
router.patch('/lenders/:id/status', authenticateAdmin, async (req, res) => {
  try {
    const { license_status } = req.body;
    if (!license_status) {
      return res.status(400).json({ error: 'license_status is required' });
    }

    const lender = await prisma.lender.update({
      where: { id: req.params.id },
      data: { license_status },
    });

    res.json(lender);
  } catch (err) {
    console.error('Update lender status error:', err);
    res.status(500).json({ error: 'Failed to update lender status' });
  }
});

// ─── License code management ────────────────────────────────────────────────

/** List all license codes */
router.get('/licenses', authenticateAdmin, async (req, res) => {
  try {
    const codes = await prisma.licenseCode.findMany({
      orderBy: { created_at: 'desc' },
    });

    // Resolve lender names for used codes
    const usedByIds = [...new Set(codes.filter(c => c.used_by).map(c => c.used_by))];
    const lenders = usedByIds.length > 0
      ? await prisma.lender.findMany({ where: { id: { in: usedByIds } }, select: { id: true, name: true } })
      : [];
    const lenderMap = Object.fromEntries(lenders.map(l => [l.id, l.name]));

    const result = codes.map(c => ({
      ...c,
      used_by_name: c.used_by ? (lenderMap[c.used_by] || 'Unknown') : null,
    }));

    res.json(result);
  } catch (err) {
    console.error('List licenses error:', err);
    res.status(500).json({ error: 'Failed to fetch license codes' });
  }
});

/** Generate new license codes */
router.post('/licenses', authenticateAdmin, async (req, res) => {
  try {
    const { plan, quantity = 1 } = req.body;

    if (!PLAN_DURATION[plan]) {
      return res.status(400).json({ error: `Invalid plan. Must be one of: ${Object.keys(PLAN_DURATION).join(', ')}` });
    }

    const count = Math.min(Math.max(1, Number(quantity)), 50);
    const prefix = PLAN_PREFIX[plan];
    const durationDays = PLAN_DURATION[plan];

    const codes = [];
    for (let i = 0; i < count; i++) {
      const random = crypto.randomBytes(5).toString('hex').toUpperCase().slice(0, 8);
      codes.push({
        code: `LIC-${prefix}-${random}`,
        plan,
        duration_days: durationDays,
      });
    }

    const created = await prisma.$transaction(
      codes.map((c) =>
        prisma.licenseCode.create({ data: c })
      )
    );

    res.status(201).json(created);
  } catch (err) {
    console.error('Generate licenses error:', err);
    res.status(500).json({ error: 'Failed to generate license codes' });
  }
});

/** Delete an unused license code */
router.delete('/licenses/:id', authenticateAdmin, async (req, res) => {
  try {
    const code = await prisma.licenseCode.findUnique({ where: { id: req.params.id } });

    if (!code) return res.status(404).json({ error: 'License code not found' });
    if (code.is_used) return res.status(400).json({ error: 'Cannot delete a used license code' });

    await prisma.licenseCode.delete({ where: { id: req.params.id } });

    res.json({ message: 'License code deleted' });
  } catch (err) {
    console.error('Delete license error:', err);
    res.status(500).json({ error: 'Failed to delete license code' });
  }
});

// ─── Dashboard stats ────────────────────────────────────────────────────────

/** Platform-wide statistics */
router.get('/stats', authenticateAdmin, async (req, res) => {
  try {
    const now = new Date();

    const [
      totalLenders,
      activeLenders,
      trialLenders,
      totalLicenseCodes,
      unusedLicenseCodes,
      usedCodesByPlan,
    ] = await Promise.all([
      prisma.lender.count(),
      prisma.lender.count({ where: { license_status: 'active' } }),
      prisma.lender.count({ where: { license_status: 'trial', trial_ends_at: { gt: now } } }),
      prisma.licenseCode.count(),
      prisma.licenseCode.count({ where: { is_used: false } }),
      prisma.licenseCode.groupBy({ by: ['plan'], where: { is_used: true }, _count: true }),
    ]);

    const usedLicenseCodes = totalLicenseCodes - unusedLicenseCodes;

    // Expired = trial with expired trial_ends_at + active with expired license_expires
    const expiredLenders = await prisma.lender.count({
      where: {
        OR: [
          { license_status: 'trial', trial_ends_at: { lte: now } },
          { license_status: 'active', license_expires: { lte: now } },
        ],
      },
    });

    // Revenue breakdown by plan (count of used codes per plan)
    const totalRevenue = usedCodesByPlan.reduce((acc, entry) => {
      acc[entry.plan] = entry._count;
      return acc;
    }, {});

    res.json({
      totalLenders,
      activeLenders,
      trialLenders,
      expiredLenders,
      totalLicenseCodes,
      unusedLicenseCodes,
      usedLicenseCodes,
      totalRevenue,
    });
  } catch (err) {
    console.error('Stats error:', err);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

export default router;
