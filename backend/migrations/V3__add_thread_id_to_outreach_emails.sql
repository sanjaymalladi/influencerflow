ALTER TABLE public.outreach_emails
ADD COLUMN email_thread_id TEXT NULL;

COMMENT ON COLUMN public.outreach_emails.email_thread_id IS 'The Gmail thread ID for the initial outreach email, used to track conversation replies.';

-- Optionally, you might want to add an index if you query by this column frequently
-- CREATE INDEX IF NOT EXISTS idx_outreach_emails_email_thread_id ON public.outreach_emails(email_thread_id); 