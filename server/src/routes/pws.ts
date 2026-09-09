import express from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { supabaseAdmin } from '../utils/supabase';
import { z } from 'zod';
import { encrypt, decrypt } from '../utils/encryption';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const router = express.Router();
router.use(requireAuth);

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-for-pin-session';

const PWSSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  url: z.string().optional(),
  username: z.string().optional(),
  password: z.string().min(1, 'Password is required'), // will be encrypted
  notes: z.string().optional(),
});

// Setup PIN for the first time
router.post('/setup-pin', async (req: AuthRequest, res) => {
  try {
    const { pin } = req.body;
    if (!pin || pin.length < 4) {
      res.status(400).json({ error: 'Valid PIN is required (min 4 characters)' });
      return;
    }

    const { data: userProfile } = await supabaseAdmin
      .from('users_profile')
      .select('hashed_pin')
      .eq('id', req.user.id)
      .single();

    if (userProfile && userProfile.hashed_pin) {
      res.status(400).json({ error: 'PIN is already setup' });
      return;
    }

    const hashedPin = await bcrypt.hash(pin, 10);
    
    const { error } = await supabaseAdmin
      .from('users_profile')
      .upsert({ id: req.user.id, hashed_pin: hashedPin });

    if (error) throw error;
    res.json({ message: 'PIN setup successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Verify PIN and issue short-lived session
router.post('/verify-pin', async (req: AuthRequest, res) => {
  try {
    const { pin } = req.body;
    
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('users_profile')
      .select('hashed_pin')
      .eq('id', req.user.id)
      .single();

    if (profileError || !userProfile || !userProfile.hashed_pin) {
       res.status(400).json({ error: 'PIN not setup' });
       return;
    }

    const isValid = await bcrypt.compare(pin, userProfile.hashed_pin);
    if (!isValid) {
       res.status(401).json({ error: 'Invalid PIN' });
       return;
    }

    // Issue short-lived session token (e.g. 10 minutes)
    const pinToken = jwt.sign({ userId: req.user.id, purpose: 'pws_reveal' }, JWT_SECRET, { expiresIn: '10m' });

    res.cookie('pin_session', pinToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 10 * 60 * 1000 // 10 minutes
    });

    res.json({ message: 'PIN verified successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Middleware to check pin_session cookie
const requirePinSession = (req: AuthRequest, res: express.Response, next: express.NextFunction): void => {
  const token = req.cookies?.pin_session;
  if (!token) {
    res.status(403).json({ error: 'PIN verification required' });
    return;
  }
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    if (decoded.userId !== req.user.id) {
      throw new Error('User mismatch');
    }
    next();
  } catch (err) {
    res.status(403).json({ error: 'PIN session expired or invalid' });
  }
};

// Check if pin session is valid
router.get('/session', requirePinSession, (req, res) => {
  res.json({ valid: true });
});

// Get all credentials (passwords masked)
router.get('/', async (req: AuthRequest, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('pws_credentials')
      .select('id, name, url, username, notes, created_at, updated_at')
      .eq('user_id', req.user.id)
      .order('name', { ascending: true });

    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get/reveal single credential password (Requires PIN session)
router.get('/:id/reveal', requirePinSession, async (req: AuthRequest, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('pws_credentials')
      .select('encrypted_password')
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .single();

    if (error || !data) {
       res.status(404).json({ error: 'Credential not found' });
       return;
    }

    const decryptedPassword = decrypt(data.encrypted_password);
    res.json({ password: decryptedPassword });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to reveal credential' });
  }
});

// Create a new credential
router.post('/', requirePinSession, async (req: AuthRequest, res) => {
  try {
    const validatedData = PWSSchema.parse(req.body);
    const encryptedPassword = encrypt(validatedData.password);
    
    const { data, error } = await supabaseAdmin
      .from('pws_credentials')
      .insert({
        user_id: req.user.id,
        name: validatedData.name,
        url: validatedData.url,
        username: validatedData.username,
        encrypted_password: encryptedPassword,
        notes: validatedData.notes
      })
      .select('id, name, url, username, notes, created_at, updated_at')
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
       res.status(400).json({ error: error.issues });
       return;
    }
    res.status(500).json({ error: error.message });
  }
});

// Update a credential
router.put('/:id', requirePinSession, async (req: AuthRequest, res) => {
  try {
    const validatedData = PWSSchema.parse(req.body);
    const encryptedPassword = encrypt(validatedData.password);
    
    const { data, error } = await supabaseAdmin
      .from('pws_credentials')
      .update({
        name: validatedData.name,
        url: validatedData.url,
        username: validatedData.username,
        encrypted_password: encryptedPassword,
        notes: validatedData.notes,
        updated_at: new Date().toISOString()
      })
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .select('id, name, url, username, notes, created_at, updated_at')
      .single();

    if (error) throw error;
    if (!data) {
       res.status(404).json({ error: 'Credential not found' });
       return;
    }
    res.json(data);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
       res.status(400).json({ error: error.issues });
       return;
    }
    res.status(500).json({ error: error.message });
  }
});

// Delete a credential
router.delete('/:id', requirePinSession, async (req: AuthRequest, res) => {
  try {
    const { error } = await supabaseAdmin
      .from('pws_credentials')
      .delete()
      .eq('id', req.params.id)
      .eq('user_id', req.user.id);

    if (error) throw error;
    res.status(204).send();
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Logout PIN session
router.post('/logout-pin', (req, res) => {
  res.clearCookie('pin_session');
  res.json({ message: 'PIN session cleared' });
});

export default router;
