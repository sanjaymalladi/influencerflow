ALTER TABLE public.outreach_emails
ADD COLUMN user_id UUID REFERENCES public.users(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.outreach_emails.user_id IS 'Reference to the user who initiated this outreach email.';

-- If you want to ensure it's always set (not NULL), you can alter after adding:
-- ALTER TABLE public.outreach_emails ALTER COLUMN user_id SET NOT NULL;
-- However, this would require existing rows to have a user_id or a default, 
-- and might conflict if campaigns are the primary owner.
-- For now, allowing NULL might be safer if campaigns truly own the user link. 