-- Migration: Add Contracts Table and Gmail Token Columns to Users
-- Adds the 'contracts' table and extends the 'users' table with Gmail integration fields.

-- Add Contracts Table
CREATE TABLE contracts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE NOT NULL,
  creator_id UUID REFERENCES creators(id) ON DELETE CASCADE NOT NULL,
  conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL, -- Link to the negotiation conversation
  final_terms JSONB NOT NULL, -- Store agreed upon deliverables, payment, etc.
  contract_pdf_url VARCHAR, -- Path to the generated PDF in storage
  status VARCHAR DEFAULT 'draft' NOT NULL, -- e.g., 'draft', 'awaiting_user_signature', 'awaiting_creator_signature', 'active', 'completed', 'cancelled'
  user_signed_at TIMESTAMP,
  creator_signed_at TIMESTAMP,
  created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL, -- User who initiated/approved contract
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Add columns for Gmail OAuth tokens to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS gmail_access_token TEXT, -- Should be encrypted in transit and at rest
ADD COLUMN IF NOT EXISTS gmail_refresh_token TEXT, -- Should be encrypted in transit and at rest
ADD COLUMN IF NOT EXISTS gmail_token_expiry TIMESTAMP,
ADD COLUMN IF NOT EXISTS gmail_last_sync TIMESTAMP; -- Track last time emails were checked or synced

-- Row Level Security (RLS) for contracts table
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own contracts" ON contracts
  FOR ALL USING (
    auth.uid() IN (
      SELECT user_id FROM campaigns WHERE id = contracts.campaign_id
    )
  );

-- Add updated_at trigger for contracts table
-- Ensure the update_updated_at_column function already exists from the initial schema.
CREATE TRIGGER update_contracts_updated_at BEFORE UPDATE ON contracts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add updated_at trigger for users table if it doesn't already cover new columns (usually it does)
-- If the existing trigger on 'users' table (update_users_updated_at) is generic, 
-- it will automatically handle 'updated_at' for these new gmail columns as well.
-- No new trigger needed for 'users' specifically for these columns if a general one exists.

SELECT 'V2 Migration: Contracts table and Gmail token columns added successfully.' AS message; 