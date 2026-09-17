import express from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { supabaseAdmin } from '../utils/supabase';
import { z } from 'zod';

const router = express.Router();
router.use(requireAuth);

const QaScriptSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  content: z.array(z.object({
    question: z.string().min(1, 'Question is required'),
    answer: z.string().min(1, 'Answer is required'),
  })),
});

// Get all QA scripts (with content)
router.get('/', async (req: AuthRequest, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('qa_scripts')
      .select('*')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get a specific QA script with content
router.get('/:id', async (req: AuthRequest, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('qa_scripts')
      .select('*')
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .single();

    if (error) throw error;
    if (!data) {
      res.status(404).json({ error: 'Not found' });
      return;
    }
    
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create a new QA script
router.post('/', async (req: AuthRequest, res) => {
  try {
    const validatedData = QaScriptSchema.parse(req.body);
    
    if (validatedData.content.length === 0) {
      res.status(400).json({ error: 'JSON array is empty.' });
      return;
    }

    const { data, error } = await supabaseAdmin
      .from('qa_scripts')
      .insert({
        user_id: req.user.id,
        title: validatedData.title,
        content: validatedData.content
      })
      .select();

    if (error) throw error;
    res.status(201).json(data[0]);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
       res.status(400).json({ error: 'Invalid JSON format. Expected an array of objects with "question" and "answer".' });
       return;
    }
    res.status(500).json({ error: error.message || 'Database error occurred' });
  }
});

// Delete a QA script
router.delete('/:id', async (req: AuthRequest, res) => {
  try {
    const { error } = await supabaseAdmin
      .from('qa_scripts')
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
