const fs = require('fs');
const path = require('path');

// Data directory
const DATA_DIR = path.join(__dirname, '../../data');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// File paths
const CREATORS_FILE = path.join(DATA_DIR, 'creators.json');
const CAMPAIGNS_FILE = path.join(DATA_DIR, 'campaigns.json');
const OUTREACH_EMAILS_FILE = path.join(DATA_DIR, 'outreach_emails.json');
const OUTREACH_CAMPAIGNS_FILE = path.join(DATA_DIR, 'outreach_campaigns.json');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const CAMPAIGN_APPLICATIONS_FILE = path.join(DATA_DIR, 'campaign_applications.json');
const EMAIL_TEMPLATES_FILE = path.join(DATA_DIR, 'email_templates.json');

// Generic file operations
const readJsonFile = (filePath, defaultData = []) => {
  try {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(data);
    }
    return defaultData;
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error);
    return defaultData;
  }
};

const writeJsonFile = (filePath, data) => {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error(`Error writing ${filePath}:`, error);
    return false;
  }
};

// Initialize default data if files don't exist
const initializeDefaultData = () => {
  // Default creators
  const defaultCreators = [
    {
      id: '1',
      channelName: 'Linus Tech Tips',
      profileImageUrl: 'https://yt3.ggpht.com/ytc/AL5GRJWSZwKNK8wHLU8YJz8hLvxuPXGQR4Wh8KTrVSzR=s176-c-k-c0x00ffffff-no-rj',
      youtubeChannelUrl: 'https://www.youtube.com/@LinusTechTips',
      bio: 'Leading technology channel focusing on PC hardware reviews, builds, and tech news.',
      subscriberCount: '15.2M',
      viewCount: '2.8B',
      videoCount: '5234',
      matchPercentage: 95,
      categories: ['Technology', 'Hardware Reviews', 'PC Building', 'Tech News'],
      typicalViews: '1.8M',
      engagementRate: '3.4%',
      dataSource: 'Hybrid (YouTube primary)',
      createdAt: new Date().toISOString(),
      addedBy: '1'
    },
    {
      id: '2',
      channelName: 'Marques Brownlee',
      profileImageUrl: 'https://yt3.ggpht.com/ytc/AL5GRJWSZwKNK8wHLU8YJz8hLvxuPXGQR4Wh8KTrVSzR=s176-c-k-c0x00ffffff-no-rj',
      youtubeChannelUrl: 'https://www.youtube.com/@mkbhd',
      bio: 'Tech reviews and commentary on the latest consumer technology.',
      subscriberCount: '18.1M',
      viewCount: '3.2B',
      videoCount: '1892',
      matchPercentage: 92,
      categories: ['Technology', 'Reviews', 'Mobile Tech', 'Consumer Electronics'],
      typicalViews: '2.1M',
      engagementRate: '4.2%',
      dataSource: 'Hybrid (YouTube primary)',
      createdAt: new Date().toISOString(),
      addedBy: '1'
    }
  ];

  // Default campaigns
  const defaultCampaigns = [
    {
      id: 'demo-campaign-1',
      name: 'Tech Product Launch Q1 2024',
      description: 'Launch campaign for our new smartphone featuring top tech reviewers',
      budget: 50000,
      startDate: '2024-01-15',
      endDate: '2024-03-15',
      status: 'active',
      goals: ['Brand Awareness', 'Product Reviews', 'Social Media Buzz'],
      deliverables: [
        { type: 'Video Review', quantity: 5, price: 5000 },
        { type: 'Social Media Posts', quantity: 10, price: 1000 },
        { type: 'Unboxing Video', quantity: 3, price: 3000 }
      ],
      createdBy: '1',
      createdAt: new Date().toISOString()
    }
  ];

  // Default campaign applications
  const defaultCampaignApplications = [
    {
      id: '1',
      campaignId: 'demo-campaign-1',
      creatorId: '2',
      status: 'pending',
      message: 'I would love to be part of this campaign. I have experience with tech reviews.',
      proposedRate: 4500,
      deliverables: ['Video Review', 'Social Media Posts'],
      appliedAt: new Date().toISOString(),
      createdAt: new Date().toISOString()
    }
  ];

  // Default email templates
  const defaultEmailTemplates = [
    {
      id: 'tech-partnership',
      name: 'Tech Partnership Template',
      subject: 'Partnership Opportunity - {{campaignName}}',
      body: 'Hi {{creatorName}},\n\nI hope this email finds you well! I\'ve been following your content in the {{niche}} space and I\'m really impressed by your work.\n\nI\'m reaching out about an exciting collaboration opportunity with our {{campaignName}} campaign.\n\nCampaign Details:\n- {{campaignDescription}}\n- Budget: ${{budget}}\n- Goals: {{goals}}\n- Deliverables: {{deliverables}}\n\nWe believe your unique voice and engaged audience would be perfect for this campaign, and we\'re offering competitive compensation.\n\nWould you be interested in learning more about this partnership opportunity?\n\nBest regards,\n{{senderName}}',
      createdBy: 'system',
      createdAt: new Date().toISOString()
    },
    {
      id: 'lifestyle-collab',
      name: 'Lifestyle Collaboration',
      subject: 'Exciting Collaboration Opportunity - {{campaignName}}',
      body: 'Hello {{creatorName}},\n\nYour content resonates so well with our brand values! We\'d love to explore a partnership opportunity.\n\nAbout our campaign:\n{{campaignDescription}}\n\nWe\'re offering:\n{{deliverables}}\n\nLet\'s chat about how we can work together!\n\nBest,\n{{senderName}}',
      createdBy: 'system',
      createdAt: new Date().toISOString()
    }
  ];

  // Initialize files with default data if they don't exist
  if (!fs.existsSync(CREATORS_FILE)) {
    writeJsonFile(CREATORS_FILE, defaultCreators);
  }
  
  if (!fs.existsSync(CAMPAIGNS_FILE)) {
    writeJsonFile(CAMPAIGNS_FILE, defaultCampaigns);
  }
  
  if (!fs.existsSync(OUTREACH_EMAILS_FILE)) {
    writeJsonFile(OUTREACH_EMAILS_FILE, []);
  }
  
  if (!fs.existsSync(OUTREACH_CAMPAIGNS_FILE)) {
    writeJsonFile(OUTREACH_CAMPAIGNS_FILE, []);
  }
  
  if (!fs.existsSync(USERS_FILE)) {
    writeJsonFile(USERS_FILE, []);
  }

  if (!fs.existsSync(CAMPAIGN_APPLICATIONS_FILE)) {
    writeJsonFile(CAMPAIGN_APPLICATIONS_FILE, defaultCampaignApplications);
  }

  if (!fs.existsSync(EMAIL_TEMPLATES_FILE)) {
    writeJsonFile(EMAIL_TEMPLATES_FILE, defaultEmailTemplates);
  }
};

// Creators data operations
const creatorsData = {
  getAll: () => readJsonFile(CREATORS_FILE, []),
  save: (creators) => writeJsonFile(CREATORS_FILE, creators),
  add: (creator) => {
    const creators = creatorsData.getAll();
    const newId = Math.max(0, ...creators.map(c => parseInt(c.id) || 0)) + 1;
    const newCreator = { ...creator, id: newId.toString() };
    creators.push(newCreator);
    creatorsData.save(creators);
    return newCreator;
  },
  findById: (id) => {
    const creators = creatorsData.getAll();
    return creators.find(c => c.id === id);
  },
  update: (id, updatedCreator) => {
    const creators = creatorsData.getAll();
    const index = creators.findIndex(c => c.id === id);
    if (index !== -1) {
      creators[index] = { ...creators[index], ...updatedCreator };
      creatorsData.save(creators);
      return creators[index];
    }
    return null;
  },
  delete: (id) => {
    const creators = creatorsData.getAll();
    const filtered = creators.filter(c => c.id !== id);
    creatorsData.save(filtered);
    return filtered.length !== creators.length;
  }
};

// Campaigns data operations
const campaignsData = {
  getAll: () => readJsonFile(CAMPAIGNS_FILE, []),
  save: (campaigns) => writeJsonFile(CAMPAIGNS_FILE, campaigns),
  add: (campaign) => {
    const campaigns = campaignsData.getAll();
    const newId = Math.max(0, ...campaigns.map(c => parseInt(c.id.replace(/\D/g, '')) || 0)) + 1;
    const newCampaign = { ...campaign, id: `campaign-${newId}` };
    campaigns.push(newCampaign);
    campaignsData.save(campaigns);
    return newCampaign;
  },
  findById: (id) => {
    const campaigns = campaignsData.getAll();
    return campaigns.find(c => c.id === id);
  },
  update: (id, updatedCampaign) => {
    const campaigns = campaignsData.getAll();
    const index = campaigns.findIndex(c => c.id === id);
    if (index !== -1) {
      campaigns[index] = { ...campaigns[index], ...updatedCampaign };
      campaignsData.save(campaigns);
      return campaigns[index];
    }
    return null;
  },
  delete: (id) => {
    const campaigns = campaignsData.getAll();
    const filtered = campaigns.filter(c => c.id !== id);
    campaignsData.save(filtered);
    return filtered.length !== campaigns.length;
  }
};

// Outreach emails data operations
const outreachEmailsData = {
  getAll: () => readJsonFile(OUTREACH_EMAILS_FILE, []),
  save: (emails) => writeJsonFile(OUTREACH_EMAILS_FILE, emails),
  add: (email) => {
    const emails = outreachEmailsData.getAll();
    const newId = Math.max(0, ...emails.map(e => parseInt(e.id) || 0)) + 1;
    const newEmail = { ...email, id: newId.toString() };
    emails.push(newEmail);
    outreachEmailsData.save(emails);
    return newEmail;
  },
  findById: (id) => {
    const emails = outreachEmailsData.getAll();
    return emails.find(e => e.id === id);
  },
  update: (id, updatedEmail) => {
    const emails = outreachEmailsData.getAll();
    const index = emails.findIndex(e => e.id === id);
    if (index !== -1) {
      emails[index] = { ...emails[index], ...updatedEmail };
      outreachEmailsData.save(emails);
      return emails[index];
    }
    return null;
  },
  delete: (id) => {
    const emails = outreachEmailsData.getAll();
    const filtered = emails.filter(e => e.id !== id);
    outreachEmailsData.save(filtered);
    return filtered.length !== emails.length;
  }
};

// Campaign applications data operations
const campaignApplicationsData = {
  getAll: () => readJsonFile(CAMPAIGN_APPLICATIONS_FILE, []),
  save: (applications) => writeJsonFile(CAMPAIGN_APPLICATIONS_FILE, applications),
  add: (application) => {
    const applications = campaignApplicationsData.getAll();
    const newId = Math.max(0, ...applications.map(a => parseInt(a.id) || 0)) + 1;
    const newApplication = { ...application, id: newId.toString() };
    applications.push(newApplication);
    campaignApplicationsData.save(applications);
    return newApplication;
  },
  findById: (id) => {
    const applications = campaignApplicationsData.getAll();
    return applications.find(a => a.id === id);
  },
  findByCampaignId: (campaignId) => {
    const applications = campaignApplicationsData.getAll();
    return applications.filter(a => a.campaignId === campaignId);
  },
  findByCreatorId: (creatorId) => {
    const applications = campaignApplicationsData.getAll();
    return applications.filter(a => a.creatorId === creatorId);
  },
  update: (id, updatedApplication) => {
    const applications = campaignApplicationsData.getAll();
    const index = applications.findIndex(a => a.id === id);
    if (index !== -1) {
      applications[index] = { ...applications[index], ...updatedApplication };
      campaignApplicationsData.save(applications);
      return applications[index];
    }
    return null;
  },
  delete: (id) => {
    const applications = campaignApplicationsData.getAll();
    const filtered = applications.filter(a => a.id !== id);
    campaignApplicationsData.save(filtered);
    return filtered.length !== applications.length;
  }
};

// Email templates data operations
const emailTemplatesData = {
  getAll: () => readJsonFile(EMAIL_TEMPLATES_FILE, []),
  save: (templates) => writeJsonFile(EMAIL_TEMPLATES_FILE, templates),
  add: (template) => {
    const templates = emailTemplatesData.getAll();
    const newId = Math.max(0, ...templates.map(t => parseInt(t.id.replace(/\D/g, '')) || 0)) + 1;
    const newTemplate = { ...template, id: `template-${newId}` };
    templates.push(newTemplate);
    emailTemplatesData.save(templates);
    return newTemplate;
  },
  findById: (id) => {
    const templates = emailTemplatesData.getAll();
    return templates.find(t => t.id === id);
  },
  update: (id, updatedTemplate) => {
    const templates = emailTemplatesData.getAll();
    const index = templates.findIndex(t => t.id === id);
    if (index !== -1) {
      templates[index] = { ...templates[index], ...updatedTemplate };
      emailTemplatesData.save(templates);
      return templates[index];
    }
    return null;
  },
  delete: (id) => {
    const templates = emailTemplatesData.getAll();
    const filtered = templates.filter(t => t.id !== id);
    emailTemplatesData.save(filtered);
    return filtered.length !== templates.length;
  }
};

// Outreach campaigns data operations
const outreachCampaignsData = {
  getAll: () => readJsonFile(OUTREACH_CAMPAIGNS_FILE, []),
  save: (campaigns) => writeJsonFile(OUTREACH_CAMPAIGNS_FILE, campaigns),
  add: (campaign) => {
    const campaigns = outreachCampaignsData.getAll();
    const newId = Math.max(0, ...campaigns.map(c => parseInt(c.id) || 0)) + 1;
    const newCampaign = { ...campaign, id: newId.toString() };
    campaigns.push(newCampaign);
    outreachCampaignsData.save(campaigns);
    return newCampaign;
  },
  findById: (id) => {
    const campaigns = outreachCampaignsData.getAll();
    return campaigns.find(c => c.id === id);
  },
  update: (id, updatedCampaign) => {
    const campaigns = outreachCampaignsData.getAll();
    const index = campaigns.findIndex(c => c.id === id);
    if (index !== -1) {
      campaigns[index] = { ...campaigns[index], ...updatedCampaign };
      outreachCampaignsData.save(campaigns);
      return campaigns[index];
    }
    return null;
  },
  delete: (id) => {
    const campaigns = outreachCampaignsData.getAll();
    const filtered = campaigns.filter(c => c.id !== id);
    outreachCampaignsData.save(filtered);
    return filtered.length !== campaigns.length;
  }
};

// Initialize default data
initializeDefaultData();

module.exports = {
  creatorsData,
  campaignsData,
  outreachEmailsData,
  campaignApplicationsData,
  emailTemplatesData,
  outreachCampaignsData,
  initializeDefaultData
}; 