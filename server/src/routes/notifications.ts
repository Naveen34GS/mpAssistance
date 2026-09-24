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

// Test push notification with 5 seconds delay
router.post('/test', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { data: subscriptions, error } = await supabaseAdmin
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', req.user.id);
      
    if (error) throw error;
    if (!subscriptions || subscriptions.length === 0) {
      res.status(404).json({ error: 'No active push subscriptions found.' });
      return;
    }

    await new Promise(resolve => setTimeout(resolve, 5000));

    for (const sub of subscriptions) {
      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: { p256dh: sub.p256dh, auth: sub.auth }
      };
      const payload = JSON.stringify({
        title: 'Test Notification',
        body: 'This is a test notification from your Assistant!',
        url: '/profile'
      });
      try {
        await webPush.sendNotification(pushSubscription, payload);
      } catch (err: any) {
        console.error('Failed to send test push notification:', err);
      }
    }

    res.status(200).json({ message: 'Test notification sent after 5 seconds.' });
  } catch (error: any) {
    console.error('Test notification error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: error.message });
    }
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

    // Find tasks happening in exactly 30 minutes
    const thirtyMinutesFromNow = new Date(Date.now() + 30 * 60000);
    const thirtyOneMinutesFromNow = new Date(Date.now() + 31 * 60000);

    const { data: events, error } = await supabaseAdmin
      .from('events')
      .select('id, title, start_time, date, user_id')
      .gte('date', thirtyMinutesFromNow.toISOString().split('T')[0])
      // A more robust check would involve combining date and time, but for simplicity we'll check if the time matches
      // the upcoming minute.
      // E.g., if task is at 14:30, at 14:00 we send it.

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
      
      // If the event is between 30 and 31 minutes from now
      if (eventDateTime >= thirtyMinutesFromNow && eventDateTime < thirtyOneMinutesFromNow) {
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
            title: 'Upcoming Task in 30 Minutes',
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

    // --- CHECK BIRTHDAYS ---
    const { data: birthdays, error: bdError } = await supabaseAdmin
      .from('birthdays')
      .select('*');

    if (bdError) console.error('Error fetching birthdays:', bdError);
    else if (birthdays && birthdays.length > 0) {
      for (const bd of birthdays) {
        if (!bd.birthday_date || !bd.notify_time) continue;
        
        // Calculate the actual notification date by subtracting notify_days_before
        const bdayDate = new Date(bd.birthday_date);
        const today = new Date();
        bdayDate.setFullYear(today.getFullYear());
        
        const pureBday = new Date(bdayDate);
        pureBday.setHours(0,0,0,0);
        const todayStart = new Date(today);
        todayStart.setHours(0,0,0,0);
        
        if (pureBday < todayStart) {
          bdayDate.setFullYear(today.getFullYear() + 1);
        }

        bdayDate.setDate(bdayDate.getDate() - (bd.notify_days_before || 0));
        const notificationDateStr = bdayDate.toISOString().split('T')[0];
        
        // Construct the full datetime when the notification should be sent today
        const notifyDateTime = new Date(`${notificationDateStr}T${bd.notify_time}`);
        
        // If it's between 30 and 31 minutes from now
        if (notifyDateTime >= thirtyMinutesFromNow && notifyDateTime < thirtyOneMinutesFromNow) {
          const { data: subscriptions, error: subError } = await supabaseAdmin
            .from('push_subscriptions')
            .select('*')
            .eq('user_id', bd.user_id);
            
          if (subError || !subscriptions) continue;

          for (const sub of subscriptions) {
            const pushSubscription = {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth }
            };

            const dayText = bd.notify_days_before === 0 ? 'Today' : `In ${bd.notify_days_before} day(s)`;
            const payload = JSON.stringify({
              title: `Upcoming Birthday: ${bd.person_name}`,
              body: `${bd.person_name}'s birthday is ${dayText.toLowerCase()}!`,
              url: '/birthdays'
            });

            try {
              await webPush.sendNotification(pushSubscription, payload);
              notificationsSent++;
            } catch (err: any) {
               console.error('Failed to send bday push notification:', err);
               if (err.statusCode === 410 || err.statusCode === 404) {
                 await supabaseAdmin.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
               }
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
