import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import notesRouter from './routes/notes';
import eventsRouter from './routes/events';
import documentsRouter from './routes/documents';
import pwsRouter from './routes/pws';
import notificationsRouter from './routes/notifications';
import birthdaysRouter from './routes/birthdays';

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cookieParser());

// Routes
app.use('/api/notes', notesRouter);
app.use('/api/events', eventsRouter);
app.use('/api/documents', documentsRouter);
app.use('/api/pws', pwsRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/birthdays', birthdaysRouter);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal Server Error' });
});

if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
  app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
    
    // Local cron simulation: ping the cron endpoint every 1 minute
    setInterval(() => {
      fetch(`http://localhost:${port}/api/notifications/cron`)
        .then(res => res.json())
        .then(data => {
          if (data.message && data.message !== 'No events found.' && !data.message.includes('Sent 0 notifications')) {
             console.log('[Cron]', data.message);
          }
        })
        .catch(err => console.error('[Cron] Error pinging cron endpoint:', err));
    }, 60000); // 1 minute
  });
}

export default app;
