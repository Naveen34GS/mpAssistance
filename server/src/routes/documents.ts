import express from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { supabaseAdmin } from '../utils/supabase';

const router = express.Router();
router.use(requireAuth);

// Get all documents for user
router.get('/', async (req: AuthRequest, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('documents')
      .select('*')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create a new document metadata entry
router.post('/', async (req: AuthRequest, res) => {
  try {
    // The actual file upload will happen directly from the client to Supabase Storage
    // This endpoint just records the metadata
    const { file_name, original_name, file_path, file_type, file_size } = req.body;
    
    if (!file_name || !file_path) {
       res.status(400).json({ error: 'Missing required document information' });
       return;
    }

    const { data, error } = await supabaseAdmin
      .from('documents')
      .insert({
        user_id: req.user.id,
        file_name,
        original_name,
        file_path,
        file_type,
        file_size
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Delete a document
router.delete('/:id', async (req: AuthRequest, res) => {
  try {
    const { error } = await supabaseAdmin
      .from('documents')
      .delete()
      .eq('id', req.params.id)
      .eq('user_id', req.user.id);

    if (error) throw error;
    // Note: The actual file should be deleted from Supabase Storage by the client or via edge function/trigger
    // or we could do it here: supabaseAdmin.storage.from('documents').remove([data.file_path])
    res.status(204).send();
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
