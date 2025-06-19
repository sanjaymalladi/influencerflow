import { Contact, Campaign, NegotiationTerms } from '@/types/negotiation';

// Default Contacts for Testing
export const DEFAULT_CONTACTS: Contact[] = [
  {
    id: 'sanjay_malladi_sim',
    name: 'Sanjay Malladi',
    email: 'sanjay@example.com',
    phone: '+1-555-0123',
    socialMedia: {
      youtube: '@sanjaytech',
      instagram: '@sanjayreviews',
      twitter: '@sanjaytech'
    }
  },
  {
    id: 'jane_doe_creator',
    name: 'Jane Doe',
    email: 'jane@example.com',
    socialMedia: {
      youtube: '@janedoecreates',
      instagram: '@janecreates'
    }
  },
  {
    id: 'mike_tech_reviewer',
    name: 'Mike Chen',
    email: 'mike@example.com',
    socialMedia: {
      youtube: '@miketechreviews',
      twitter: '@miketech'
    }
  }
];

// Default Campaigns for Testing
export const DEFAULT_CAMPAIGNS: Campaign[] = [
  {
    id: 'summer-tech-campaign',
    name: 'Summer Tech Review Campaign',
    description: 'Looking for tech reviewers to showcase our latest smartphone innovations',
    initialPromptTemplate: `Hi {contactName},

I hope this email finds you well! I'm reaching out about an exciting collaboration opportunity with {campaignName}.

We've been following your content and are impressed by your authentic reviews and engaged audience. We'd love to discuss a potential partnership.

Best regards,
Alex from InfluencerFlow Team`,
    deliverables: ['Unboxing video', '2 Instagram posts', 'Detailed review video']
  },
  {
    id: 'holiday-lifestyle-campaign',
    name: 'Holiday Lifestyle Collection',
    description: 'Promoting our new lifestyle products for the holiday season',
    initialPromptTemplate: `Hello {contactName},

Greetings! We have an amazing opportunity with our {campaignName} that we think would be perfect for your audience.

Your content style aligns perfectly with our brand values, and we'd love to explore a collaboration.

Warm regards,
Alex`,
    deliverables: ['Holiday-themed content', '3 social media posts', 'Story highlights']
  },
  {
    id: 'fitness-gear-campaign',
    name: 'New Fitness Gear Launch',
    description: 'Showcasing our latest fitness equipment and accessories',
    initialPromptTemplate: `Dear {contactName},

I'm excited to reach out about our {campaignName}. We believe your fitness-focused content would be an excellent match for our new product line.

Would you be interested in discussing the details?

Best,
Alex`,
    deliverables: ['Workout demonstration', '2 Instagram reels', 'Product review']
  }
];

// Default Negotiation Terms
export const DEFAULT_NEGOTIATION_TERMS: NegotiationTerms = {
  compensation: 2000,
  deliverables: '3 social media posts and 1 detailed review video',
  timeline: '4 weeks',
  revisions: '2 rounds included',
  exclusivity: 'Non-exclusive',
  usage_rights: '1 year commercial use'
};

// Sanjay ID for simulation
export const SANJAY_ID = 'sanjay_malladi_sim';

// Negotiation Stage Display Names
export const STAGE_DISPLAY_NAMES: Record<string, string> = {
  'SELECT_CONTACT_CAMPAIGN': 'Contact & Campaign Selection',
  'INITIAL_EMAIL_DRAFTING': 'Drafting Initial Email',
  'INITIAL_EMAIL_PENDING_SEND': 'Email Ready to Send',
  'WAITING_FOR_SANJAY_REPLY': 'Waiting for Reply',
  'AI_ANALYZING_REPLY': 'AI Analyzing Response',
  'HUMAN_INPUT_NEEDED': 'Human Input Required',
  'AI_DRAFTING_REPLY': 'AI Drafting Response',
  'AI_REPLY_PENDING_SEND': 'Reply Ready to Send',
  'CONTRACT_DRAFTING': 'Drafting Contract',
  'CONTRACT_PENDING_VERIFICATION': 'Contract Review',
  'CONTRACT_PENDING_SEND': 'Contract Ready to Send',
  'WAITING_FOR_SIGNED_CONTRACT': 'Awaiting Signed Contract',
  'CONTRACT_SIGNED_PENDING_VERIFICATION': 'Contract Verification',
  'NEGOTIATION_COMPLETE': 'Negotiation Complete',
  'ERROR': 'Error Occurred'
};

// Message sender colors for UI
export const SENDER_COLORS = {
  ai: 'bg-blue-100 dark:bg-blue-900 border-blue-200 dark:border-blue-800',
  human: 'bg-green-100 dark:bg-green-900 border-green-200 dark:border-green-800',
  user: 'bg-green-100 dark:bg-green-900 border-green-200 dark:border-green-800',
  sanjay: 'bg-purple-100 dark:bg-purple-900 border-purple-200 dark:border-purple-800',
  system: 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
};

// Message sender icons
export const SENDER_ICONS = {
  ai: '🤖',
  human: '👤',
  user: '👤',
  sanjay: '📧',
  system: '⚙️'
};

// Loading messages for different stages
export const LOADING_MESSAGES = {
  'INITIAL_EMAIL_DRAFTING': 'AI is crafting the perfect initial email...',
  'AI_ANALYZING_REPLY': 'AI is analyzing the response...',
  'AI_DRAFTING_REPLY': 'AI is preparing a response...',
  'CONTRACT_DRAFTING': 'AI is drafting the contract email...',
  'WAITING_FOR_SANJAY_REPLY': 'Monitoring for incoming messages...',
  'WAITING_FOR_SIGNED_CONTRACT': 'Waiting for contract signature...'
};

export default {
  DEFAULT_CONTACTS,
  DEFAULT_CAMPAIGNS,
  DEFAULT_NEGOTIATION_TERMS,
  SANJAY_ID,
  STAGE_DISPLAY_NAMES,
  SENDER_COLORS,
  SENDER_ICONS,
  LOADING_MESSAGES
}; 