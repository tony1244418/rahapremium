-- Drop the table if it already exists to avoid errors
DROP TABLE IF EXISTS public.qr_login_sessions;

-- Create the table for WhatsApp-style QR login sessions
CREATE TABLE public.qr_login_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    user_id UUID REFERENCES public.rahapremium_users(id) ON DELETE CASCADE,
    phone_number TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Enable RLS
ALTER TABLE public.qr_login_sessions ENABLE ROW LEVEL SECURITY;

-- Allow anonymous insertion (the waiting device needs to create a session)
CREATE POLICY "Allow anonymous insert" ON public.qr_login_sessions
    FOR INSERT WITH CHECK (true);

-- Allow anonymous read of their own session (waiting device checking status)
CREATE POLICY "Allow read own session" ON public.qr_login_sessions
    FOR SELECT USING (true);

-- Allow logged-in users to update the session (to approve it)
CREATE POLICY "Allow authenticated update" ON public.qr_login_sessions
    FOR UPDATE USING (true) WITH CHECK (true);

-- Enable Realtime for the table so the waiting device gets instant updates
ALTER PUBLICATION supabase_realtime ADD TABLE qr_login_sessions;
