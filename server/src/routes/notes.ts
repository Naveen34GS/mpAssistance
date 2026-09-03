import express from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { supabaseAdmin } from '../utils/supabase';
import { z } from 'zod';

const router = express.Router();
router.use(requireAuth);

const NoteSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  content: z.string().optional(),
  note_date: z.string().optional(),
  note_time: z.string().optional(),
});

// Get all notes for user
router.get('/', async (req: AuthRequest, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('notes')
      .select('*')
      .eq('user_id', req.user.id)
      .order('note_date', { ascending: false })
      .order('note_time', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create a new note
router.post('/', async (req: AuthRequest, res) => {
  try {
    const validatedData = NoteSchema.parse(req.body);
    
    const { data, error } = await supabaseAdmin
      .from('notes')
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

// Update a note
router.put('/:id', async (req: AuthRequest, res) => {
  try {
    const validatedData = NoteSchema.parse(req.body);
    
    const { data, error } = await supabaseAdmin
      .from('notes')
      .update(validatedData)
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .select()
      .single();

    if (error) throw error;
    if (!data) {
       res.status(404).json({ error: 'Note not found' });
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

// Delete a note
router.delete('/:id', async (req: AuthRequest, res) => {
  try {
    const { error } = await supabaseAdmin
      .from('notes')
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
