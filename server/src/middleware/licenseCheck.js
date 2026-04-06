import prisma from '../prisma.js';

/**
 * Middleware to check if the lender has a valid license or active trial.
 * Allows access if:
 *   1. license_status === 'active' AND license_expires > now
 *   2. license_status === 'trial' AND trial_ends_at > now
 * Otherwise returns 403 with license_expired error.
 *
 * This runs AFTER authenticate middleware (req.user must exist).
 */
export async function checkLicense(req, res, next) {
  try {
    const lender = await prisma.lender.findUnique({
      where: { id: req.user.lender_id },
      select: { license_status: true, trial_ends_at: true, license_expires: true },
    });

    if (!lender) {
      return res.status(403).json({ error: 'Lender not found', code: 'LICENSE_EXPIRED' });
    }

    const now = new Date();

    // Active paid license
    if (lender.license_status === 'active' && lender.license_expires && lender.license_expires > now) {
      return next();
    }

    // Active trial
    if (lender.license_status === 'trial' && lender.trial_ends_at > now) {
      return next();
    }

    // If license was active but has expired, update status
    if (lender.license_status === 'active' && lender.license_expires && lender.license_expires <= now) {
      await prisma.lender.update({
        where: { id: req.user.lender_id },
        data: { license_status: 'expired' },
      });
    }

    return res.status(403).json({
      error: 'Your license has expired. Please activate a license to continue.',
      code: 'LICENSE_EXPIRED',
    });
  } catch (err) {
    console.error('License check error:', err);
    return next(); // fail open on error to not block users
  }
}
