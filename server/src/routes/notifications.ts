import express, { Response } from 'express';
import webPush from 'web-push';
import { supabaseAdmin } from '../utils/supabase';
import { AuthRequest, requireAuth } from '../middleware/auth';

const router = express.Router();

// Generate VAPID keys if not present (only for development/testing, in production these should be in .env)
const vapidKeys = {
  publicKey: process.env.VAPID_PUBLIC_KEY || webPush.generateVAPIDKeys().publicKey,
  privateKey: process.env.VAPID_PRIVATE_KEY || webPush.generateVAPIDKeys().privateKey
};

// We must set the details
webPush.setVapidDetails(
  'mailto:example@yourdomain.org',
  vapidKeys.publicKey,
  vapidKeys.privateKey
);

// Route to get the public key for the frontend
router.get('/vapid-public-key', (req, res) => {
  res.send(vapidKeys.publicKey);
});

// Subscribe to push notifications
router.post('/subscribe', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const subscription = req.body;
    
    if (!subscription || !subscription.endpoint || !subscription.keys) {
       res.status(400).json({ error: 'Invalid subscription object' });
       return;
    }

    const { error } = await supabaseAdmin
      .from('push_subscriptions')
      .upsert({
        user_id: req.user.id,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        updated_at: new Date().toISOString()
      }, { onConflict: 'endpoint' });

    if (error) throw error;
    res.status(201).json({ message: 'Subscription saved.' });
  } catch (error: any) {
    console.error('Error saving subscription:', error);
    res.status(500).json({ error: error.message });
  }
});

// Cron job endpoint to trigger notifications 10 minutes before tasks
// This should be called every minute by Vercel Cron or a similar service
router.get('/cron', async (req, res) => {
  try {
    // Check for authorization header if you want to secure the cron endpoint
    // if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    //   return res.status(401).end('Unauthorized');
    // }

    // Find tasks happening in exactly 10 minutes
    const tenMinutesFromNow = new Date(Date.now() + 10 * 60000);
    const elevenMinutesFromNow = new Date(Date.now() + 11 * 60000);

    const { data: events, error } = await supabaseAdmin
      .from('events')
      .select('id, title, start_time, date, user_id')
      .gte('date', tenMinutesFromNow.toISOString().split('T')[0])
      // A more robust check would involve combining date and time, but for simplicity we'll check if the time matches
      // the upcoming minute.
      // E.g., if task is at 14:30, at 14:20 we send it.

    if (error) throw error;
    if (!events || events.length === 0) {
       res.status(200).json({ message: 'No events found.' });
       return;
    }

    let notificationsSent = 0;

    for (const event of events) {
      if (!event.start_time) continue;

      // Combine date and time
      const eventDateTime = new Date(`${event.date}T${event.start_time}`);
      
      // If the event is between 10 and 11 minutes from now
      if (eventDateTime >= tenMinutesFromNow && eventDateTime < elevenMinutesFromNow) {
        // Fetch user subscriptions
        const { data: subscriptions, error: subError } = await supabaseAdmin
          .from('push_subscriptions')
          .select('*')
          .eq('user_id', event.user_id);
          
        if (subError || !subscriptions) continue;

        for (const sub of subscriptions) {
          const pushSubscription = {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth
            }
          };

          const payload = JSON.stringify({
            title: 'Upcoming Task in 10 Minutes',
            body: event.title,
            url: '/'
          });

          try {
            await webPush.sendNotification(pushSubscription, payload);
            notificationsSent++;
          } catch (err: any) {
             console.error('Failed to send push notification:', err);
             if (err.statusCode === 410 || err.statusCode === 404) {
               // Subscription has expired or is no longer valid, delete it
               await supabaseAdmin.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
             }
          }
        }
      }
    }

    res.status(200).json({ message: `Sent ${notificationsSent} notifications.` });
  } catch (error: any) {
    console.error('Cron error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
