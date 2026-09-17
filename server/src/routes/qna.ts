import express from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { supabaseAdmin } from '../utils/supabase';
import { z } from 'zod';

const router = express.Router();
router.use(requireAuth);

const QnASchema = z.array(z.object({
  question: z.string().min(1, 'Question is required'),
  answer: z.string().min(1, 'Answer is required'),
}));

// Get all Q&A for user
router.get('/', async (req: AuthRequest, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('qna')
      .select('*')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Bulk insert Q&A from JSON
router.post('/bulk', async (req: AuthRequest, res) => {
  try {
    const validatedData = QnASchema.parse(req.body);
    
    if (validatedData.length === 0) {
      res.status(400).json({ error: 'JSON array is empty.' });
      return;
    }
    
    const insertData = validatedData.map(item => ({
      ...item,
      user_id: req.user.id
    }));

    const { data, error } = await supabaseAdmin
      .from('qna')
      .insert(insertData)
      .select();

    if (error) throw error;
    res.status(201).json({ message: `Successfully imported ${data.length} Q&A pairs`, count: data.length });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
       res.status(400).json({ error: 'Invalid JSON format. Expected an array of objects with "question" and "answer".' });
       return;
    }
    res.status(500).json({ error: error.message || 'Database error occurred' });
  }
});

// Delete a QnA
router.delete('/:id', async (req: AuthRequest, res) => {
  try {
    const { error } = await supabaseAdmin
      .from('qna')
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
