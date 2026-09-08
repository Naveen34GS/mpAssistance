import express from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { supabaseAdmin } from '../utils/supabase';
import { z } from 'zod';

const router = express.Router();
router.use(requireAuth);

const EventSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  event_date: z.string(),
  start_time: z.string(),
  status: z.enum(['pending', 'completed', 'cancelled']).default('pending')
});

// Get all events for user
router.get('/', async (req: AuthRequest, res) => {
  try {
    const { date } = req.query;
    let query = supabaseAdmin
      .from('events')
      .select('*')
      .eq('user_id', req.user.id)
      .order('event_date', { ascending: true })
      .order('start_time', { ascending: true });

    if (date) {
      query = query.eq('event_date', date);
    }

    const { data, error } = await query;
    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create a new event
router.post('/', async (req: AuthRequest, res) => {
  try {
    const validatedData = EventSchema.parse(req.body);
    
    const { data, error } = await supabaseAdmin
      .from('events')
      .insert({
        ...validatedData,
        user_id: req.user.id
      })
      .select()
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

// Update an event
router.put('/:id', async (req: AuthRequest, res) => {
  try {
    const validatedData = EventSchema.parse(req.body);
    
    const { data, error } = await supabaseAdmin
      .from('events')
      .update(validatedData)
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .select()
      .single();

    if (error) throw error;
    if (!data) {
       res.status(404).json({ error: 'Event not found' });
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

// Delete an event
router.delete('/:id', async (req: AuthRequest, res) => {
  try {
    const { error } = await supabaseAdmin
      .from('events')
      .delete()
      .eq('id', req.params.id)
      .eq('user_id', req.user.id);

    if (error) throw error;
    res.status(204).send();
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
