-- Add end_date column to events table
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS end_date TEXT;
