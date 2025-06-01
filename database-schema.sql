-- InfluencerFlow Database Schema for Supabase
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE users (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  email VARCHAR UNIQUE NOT NULL,
  name VARCHAR NOT NULL,
  role VARCHAR NOT NULL DEFAULT 'brand',
  company VARCHAR,
  avatar_url VARCHAR,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  gmail_access_token TEXT, -- Should be encrypted in transit and at rest
  gmail_refresh_token TEXT, -- Should be encrypted in transit and at rest
  gmail_token_expiry TIMESTAMP,
  gmail_last_sync TIMESTAMP -- Track last time emails were checked or synced
);

-- Creators table  
CREATE TABLE creators (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  channel_name VARCHAR NOT NULL,
  youtube_channel_url VARCHAR,
  instagram_url VARCHAR,
  tiktok_url VARCHAR,
  subscriber_count VARCHAR,
  follower_count VARCHAR,
  categories TEXT[],
  contact_email VARCHAR,
  avatar_url VARCHAR,
  stats JSONB DEFAULT '{}',
  social_stats JSONB DEFAULT '{}',
  notes TEXT,
  tags TEXT[],
  status VARCHAR DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Campaigns table
CREATE TABLE campaigns (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR NOT NULL,
  description TEXT,
  budget DECIMAL,
  currency VARCHAR DEFAULT 'USD',
  status VARCHAR DEFAULT 'draft',
  start_date DATE,
  end_date DATE,
  deliverables JSONB DEFAULT '[]',
  target_creators JSONB DEFAULT '[]',
  requirements JSONB DEFAULT '{}',
  metrics JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Contracts table
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

-- Conversations table (for AI chat tracking)
CREATE TABLE conversations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  creator_email VARCHAR NOT NULL,
  creator_name VARCHAR,
  stage VARCHAR DEFAULT 'initial_contact',
  messages JSONB[] DEFAULT '{}',
  ai_analysis JSONB DEFAULT '{}',
  needs_human_approval BOOLEAN DEFAULT FALSE,
  human_notes TEXT,
  email_thread_id VARCHAR,
  last_message_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Outreach emails table
CREATE TABLE outreach_emails (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  creator_id UUID REFERENCES creators(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
  subject VARCHAR NOT NULL,
  content TEXT NOT NULL,
  template_name VARCHAR,
  status VARCHAR DEFAULT 'draft',
  provider VARCHAR DEFAULT 'gmail',
  external_id VARCHAR,
  sent_at TIMESTAMP,
  opened_at TIMESTAMP,
  replied_at TIMESTAMP,
  reply_content TEXT,
  bounce_reason TEXT,
  tracking_data JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Human approvals table (for AI escalations)
CREATE TABLE human_approvals (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR NOT NULL, -- 'negotiation', 'contract', 'pricing'
  priority VARCHAR DEFAULT 'medium', -- 'low', 'medium', 'high'
  creator_message TEXT NOT NULL,
  ai_suggested_response TEXT,
  ai_analysis JSONB DEFAULT '{}',
  human_response TEXT,
  status VARCHAR DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'custom'
  reviewed_at TIMESTAMP,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Email templates table
CREATE TABLE email_templates (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR NOT NULL,
  subject VARCHAR NOT NULL,
  content TEXT NOT NULL,
  type VARCHAR DEFAULT 'outreach', -- 'outreach', 'follow_up', 'contract'
  variables JSONB DEFAULT '[]',
  is_default BOOLEAN DEFAULT FALSE,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Campaign applications table (when creators apply)
CREATE TABLE campaign_applications (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  creator_id UUID REFERENCES creators(id) ON DELETE CASCADE,
  status VARCHAR DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  proposed_rate DECIMAL,
  message TEXT,
  portfolio_urls TEXT[],
  reviewed_at TIMESTAMP,
  reviewer_notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Analytics/tracking table
CREATE TABLE analytics_events (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  event_type VARCHAR NOT NULL, -- 'email_sent', 'email_opened', 'creator_added', 'campaign_created'
  event_data JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_creators_user_id ON creators(user_id);
CREATE INDEX idx_creators_email ON creators(contact_email);
CREATE INDEX idx_campaigns_user_id ON campaigns(user_id);
CREATE INDEX idx_campaigns_status ON campaigns(status);
CREATE INDEX idx_conversations_campaign_id ON conversations(campaign_id);
CREATE INDEX idx_conversations_stage ON conversations(stage);
CREATE INDEX idx_conversations_email ON conversations(creator_email);
CREATE INDEX idx_outreach_emails_campaign_id ON outreach_emails(campaign_id);
CREATE INDEX idx_outreach_emails_status ON outreach_emails(status);
CREATE INDEX idx_human_approvals_status ON human_approvals(status);
CREATE INDEX idx_human_approvals_priority ON human_approvals(priority);

-- Row Level Security (RLS) Policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE creators ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE outreach_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE human_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

-- RLS for contracts table
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;

-- Users can only see their own data
CREATE POLICY "Users can view own profile" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid() = id);

-- Creators policies
CREATE POLICY "Users can view own creators" ON creators FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own creators" ON creators FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own creators" ON creators FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own creators" ON creators FOR DELETE USING (auth.uid() = user_id);

-- Campaigns policies
CREATE POLICY "Users can view own campaigns" ON campaigns FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own campaigns" ON campaigns FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own campaigns" ON campaigns FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own campaigns" ON campaigns FOR DELETE USING (auth.uid() = user_id);

-- Conversations policies
CREATE POLICY "Users can view own conversations" ON conversations 
  FOR SELECT USING (
    auth.uid() IN (
      SELECT user_id FROM campaigns WHERE id = conversations.campaign_id
    )
  );

-- Contracts policies
CREATE POLICY "Users can manage own contracts" ON contracts
  FOR ALL USING (
    auth.uid() IN (
      SELECT user_id FROM campaigns WHERE id = contracts.campaign_id
    )
  );

-- Similar policies for other tables...
-- (You can add more specific policies as needed)

-- Create some default data
INSERT INTO users (id, email, name, role, company) VALUES 
  ('550e8400-e29b-41d4-a716-446655440000', 'demo@influencerflow.com', 'Demo User', 'brand', 'InfluencerFlow Demo');

-- Create storage buckets for file uploads
INSERT INTO storage.buckets (id, name, public) VALUES 
  ('creator-avatars', 'creator-avatars', true),
  ('campaign-assets', 'campaign-assets', true),
  ('email-attachments', 'email-attachments', false);

-- Storage policies
CREATE POLICY "Users can upload creator avatars" ON storage.objects FOR INSERT 
  WITH CHECK (bucket_id = 'creator-avatars' AND auth.role() = 'authenticated');

CREATE POLICY "Users can view creator avatars" ON storage.objects FOR SELECT 
  USING (bucket_id = 'creator-avatars');

-- Functions for updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at triggers
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_creators_updated_at BEFORE UPDATE ON creators 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_campaigns_updated_at BEFORE UPDATE ON campaigns 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON conversations 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_outreach_emails_updated_at BEFORE UPDATE ON outreach_emails 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_human_approvals_updated_at BEFORE UPDATE ON human_approvals 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add updated_at trigger for contracts table
CREATE TRIGGER update_contracts_updated_at BEFORE UPDATE ON contracts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_email_templates_updated_at BEFORE UPDATE ON email_templates 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Success message
SELECT 'InfluencerFlow database schema created successfully! 🚀' AS message; 