import express from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { supabaseAdmin } from '../utils/supabase';

const router = express.Router();

router.use(requireAuth);

router.get('/', async (req: AuthRequest, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('birthdays')
      .select('*')
      .eq('user_id', req.user.id)
      .order('birthday_date', { ascending: true });

    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', async (req: AuthRequest, res) => {
  try {
    const { person_name, birthday_date, whatsapp_number, message_template, notify_days_before, notify_time } = req.body;
    
    if (!person_name || !birthday_date) {
      res.status(400).json({ error: 'Name and birthday date are required' });
      return;
    }

    const { data, error } = await supabaseAdmin
      .from('birthdays')
      .insert({
        user_id: req.user.id,
        person_name,
        birthday_date,
        whatsapp_number,
        message_template,
        notify_days_before: notify_days_before || 0,
        notify_time: notify_time || '09:00:00'
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id', async (req: AuthRequest, res) => {
  try {
    const { person_name, birthday_date, whatsapp_number, message_template, notify_days_before, notify_time } = req.body;
    
    const { data, error } = await supabaseAdmin
      .from('birthdays')
      .update({
        person_name,
        birthday_date,
        whatsapp_number,
        message_template,
        notify_days_before,
        notify_time
      })
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', async (req: AuthRequest, res) => {
  try {
    const { error } = await supabaseAdmin
      .from('birthdays')
      .delete()
      .eq('id', req.params.id)
      .eq('user_id', req.user.id);

    if (error) throw error;
    res.json({ message: 'Birthday deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
