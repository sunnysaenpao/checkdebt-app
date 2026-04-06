import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../prisma.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

/** Register a new lender + owner user */
router.post('/register', async (req, res) => {
  try {
    const { email, password, name, lenderName } = req.body;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(400).json({ error: 'Email already registered' });

    const hashed = await bcrypt.hash(password, 10);

    // Create lender and owner in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const trialEnds = new Date();
      trialEnds.setMonth(trialEnds.getMonth() + 3);
      const lender = await tx.lender.create({ data: { name: lenderName, trial_ends_at: trialEnds } });
      const user = await tx.user.create({
        data: {
          email,
          password: hashed,
          name,
          role: 'owner',
          lender_id: lender.id,
        },
      });
      return { lender, user };
    });

    const token = jwt.sign(
      { id: result.user.id, email, role: 'owner', lender_id: result.lender.id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      token,
      user: { id: result.user.id, email, name, role: 'owner', lender_id: result.lender.id, lenderName: result.lender.name },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

/** Login */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({
      where: { email },
      include: { lender: true },
    });

    if (!user || !user.password || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, lender_id: user.lender_id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: { id: user.id, email: user.email, name: user.name, role: user.role, lender_id: user.lender_id, lenderName: user.lender.name },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Login failed' });
  }
});

/** Get current user profile */
router.get('/me', authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { lender: true },
    });
    if (!user) return res.status(404).json({ error: 'User not found' });

    res.json({
      id: user.id, email: user.email, name: user.name,
      role: user.role, lender_id: user.lender_id, lenderName: user.lender.name,
      license_status: user.lender.license_status,
      trial_ends_at: user.lender.trial_ends_at,
      license_expires: user.lender.license_expires,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

/** Create staff user (owner only) */
router.post('/staff', authenticate, async (req, res) => {
  if (req.user.role !== 'owner') return res.status(403).json({ error: 'Owner only' });

  try {
    const { email, password, name } = req.body;
    const hashed = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { email, password: hashed, name, role: 'staff', lender_id: req.user.lender_id },
    });
    res.status(201).json({ id: user.id, email: user.email, name: user.name, role: user.role });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create staff' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Social Login: shared helper to find-or-create a user from an OAuth provider
// ─────────────────────────────────────────────────────────────────────────────
async function socialLogin(provider, providerId, email, name, avatarUrl) {
  // Check if user already exists (by provider ID or email)
  let user = await prisma.user.findFirst({
    where: { OR: [{ auth_provider: provider, provider_id: providerId }, { email }] },
    include: { lender: true },
  });

  if (user) {
    // Update provider info if user registered with email first
    if (!user.auth_provider) {
      await prisma.user.update({
        where: { id: user.id },
        data: { auth_provider: provider, provider_id: providerId, avatar_url: avatarUrl },
      });
    }
  } else {
    // New user — create lender + owner in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const trialEnd = new Date();
      trialEnd.setMonth(trialEnd.getMonth() + 3);
      const lender = await tx.lender.create({ data: { name: `${name}'s Lending`, trial_ends_at: trialEnd } });
      const newUser = await tx.user.create({
        data: {
          email,
          name,
          role: 'owner',
          lender_id: lender.id,
          auth_provider: provider,
          provider_id: providerId,
          avatar_url: avatarUrl,
        },
      });
      return { lender, user: newUser };
    });
    user = { ...result.user, lender: result.lender };
  }

  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role, lender_id: user.lender_id },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

  return {
    token,
    user: {
      id: user.id, email: user.email, name: user.name,
      role: user.role, lender_id: user.lender_id,
      lenderName: user.lender?.name, avatar_url: user.avatar_url,
    },
  };
}

/** Google Sign-In: verify the ID token from Google and login/register */
router.post('/google', async (req, res) => {
  try {
    const { credential } = req.body;
    const { OAuth2Client } = await import('google-auth-library');
    const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();

    const result = await socialLogin(
      'google', payload.sub, payload.email, payload.name, payload.picture
    );
    res.json(result);
  } catch (err) {
    console.error('Google auth error:', err);
    res.status(401).json({ error: 'Google authentication failed' });
  }
});

/** Facebook Login: verify the access token with Facebook Graph API */
router.post('/facebook', async (req, res) => {
  try {
    const { accessToken, userID } = req.body;

    // Verify token with Facebook
    const fbRes = await fetch(
      `https://graph.facebook.com/v19.0/${userID}?fields=id,name,email,picture.type(large)&access_token=${accessToken}`
    );
    const fbData = await fbRes.json();

    if (fbData.error) {
      return res.status(401).json({ error: 'Facebook authentication failed' });
    }

    const result = await socialLogin(
      'facebook', fbData.id, fbData.email || `${fbData.id}@facebook.com`,
      fbData.name, fbData.picture?.data?.url
    );
    res.json(result);
  } catch (err) {
    console.error('Facebook auth error:', err);
    res.status(401).json({ error: 'Facebook authentication failed' });
  }
});

export default router;
