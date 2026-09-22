-- Create birthdays table
CREATE TABLE IF NOT EXISTS public.birthdays (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    person_name TEXT NOT NULL,
    birthday_date DATE NOT NULL,
    whatsapp_number TEXT,
    message_template TEXT,
    notify_days_before INTEGER DEFAULT 0,
    notify_time TIME DEFAULT '09:00:00',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.birthdays ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own birthdays"
    ON public.birthdays FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own birthdays"
    ON public.birthdays FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own birthdays"
    ON public.birthdays FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own birthdays"
    ON public.birthdays FOR DELETE
    USING (auth.uid() = user_id);
