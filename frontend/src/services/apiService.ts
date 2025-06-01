import axios, { AxiosInstance, AxiosResponse } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://influencerflow.onrender.com/api';

// Create axios instance with default config
const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // Increased timeout for email sending
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token and debug logging
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Debug logging for email sending
    if (config.url?.includes('/send')) {
      console.log('🔍 Sending email API request:', {
        url: config.url,
        baseURL: config.baseURL,
        method: config.method,
        headers: config.headers
      });
    }
    
    return config;
  },
  (error) => {
    console.error('❌ Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor to handle auth errors and debug logging
api.interceptors.response.use(
  (response) => {
    // Debug logging for email sending responses
    if (response.config.url?.includes('/send')) {
      console.log('✅ Email API response:', {
        status: response.status,
        data: response.data
      });
    }
    return response;
  },
  (error) => {
    console.error('❌ API Error:', {
      url: error.config?.url,
      status: error.response?.status,
      message: error.response?.data?.message || error.message,
      data: error.response?.data
    });
    
    if (error.response?.status === 401) {
      localStorage.removeItem('authToken');
      localStorage.removeItem('userProfile');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Types
export interface User {
  id: string;
  email: string;
  name: string;
  role: 'brand' | 'creator' | 'agency' | 'admin';
  company?: string;
  avatar?: string;
  createdAt: string;
}

export interface Creator {
  id: string;
  channelName: string;
  youtubeChannelUrl: string;
  bio: string;
  subscriberCount: string;
  categories: string[];
  typicalViews: string;
  engagementRate: string;
  dataSource: string;
  socialPlatforms?: string[];
  location?: string;
  pricing?: {
    videoReview: number;
    socialPost: number;
    sponsored: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface Campaign {
  id: string;
  name: string;
  description: string;
  budget: number;
  startDate: string;
  endDate: string;
  status: 'draft' | 'active' | 'paused' | 'completed';
  goals: string[];
  deliverables: Array<{
    type: string;
    quantity: number;
    price: number;
  }>;
  applications?: Array<{
    creatorId: string;
    status: 'pending' | 'approved' | 'rejected';
    message: string;
    appliedAt: string;
  }>;
  createdAt: string;
}

export interface OutreachEmail {
  id: string;
  campaignId: string;
  creatorId: string;
  subject: string;
  body: string;
  status: 'draft' | 'sent' | 'opened' | 'replied' | 'failed';
  sentAt?: string;
  openedAt?: string;
  repliedAt?: string;
  messageId?: string;
  provider?: string;
  recipientEmail?: string;
  deliveryStatus?: string;
  errorMessage?: string;
  notes?: string;
  createdAt: string;
  createdBy: string;
  updatedAt?: string;
  creator?: {
    id: string;
    name: string;
    email: string;
    platform: string;
    followers: number;
    categories: string[];
    avatar?: string;
  };
  campaign?: {
    id: string;
    name: string;
    budget?: number;
  };
}

export interface OutreachStats {
  totalEmails: number;
  sentEmails: number;
  openedEmails: number;
  repliedEmails: number;
  openRate: number;
  responseRate: number;
}

// API Response wrapper
interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

// Auth API
export const authAPI = {
  register: async (userData: {
    email: string;
    password: string;
    name: string;
    role: string;
    company?: string;
  }): Promise<{ user: User; token: string }> => {
    const response: AxiosResponse<ApiResponse<{ user: User; token: string }>> = 
      await api.post('/auth/register', userData);
    return response.data.data;
  },

  login: async (credentials: {
    email: string;
    password: string;
  }): Promise<{ user: User; token: string }> => {
    const response: AxiosResponse<ApiResponse<{ user: User; token: string }>> = 
      await api.post('/auth/login', credentials);
    return response.data.data;
  },

  getProfile: async (): Promise<User> => {
    const response: AxiosResponse<ApiResponse<{ user: User }>> = 
      await api.get('/auth/me');
    return response.data.data.user;
  },

  updateProfile: async (userData: Partial<User>): Promise<User> => {
    const response: AxiosResponse<ApiResponse<{ user: User }>> = 
      await api.put('/auth/profile', userData);
    return response.data.data.user;
  },

  logout: async (): Promise<void> => {
    await api.post('/auth/logout');
    localStorage.removeItem('authToken');
    localStorage.removeItem('userProfile');
  }
};

// Creators API
export const creatorsAPI = {
  getCreators: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    category?: string;
    minSubscribers?: string;
    maxSubscribers?: string;
  }): Promise<{ creators: Creator[]; total: number; pages: number }> => {
    const response: AxiosResponse<ApiResponse<{ creators: Creator[]; total: number; pages: number }>> = 
      await api.get('/creators', { params });
    return response.data.data;
  },

  getCreator: async (id: string): Promise<Creator> => {
    const response: AxiosResponse<ApiResponse<{ creator: Creator }>> = 
      await api.get(`/creators/${id}`);
    return response.data.data.creator;
  },

  saveCreator: async (creatorData: Omit<Creator, 'id' | 'createdAt' | 'updatedAt'>): Promise<Creator> => {
    const response: AxiosResponse<ApiResponse<{ creator: Creator }>> = 
      await api.post('/creators', creatorData);
    return response.data.data.creator;
  },

  updateCreator: async (id: string, creatorData: Partial<Creator>): Promise<Creator> => {
    const response: AxiosResponse<ApiResponse<{ creator: Creator }>> = 
      await api.put(`/creators/${id}`, creatorData);
    return response.data.data.creator;
  },

  deleteCreator: async (id: string): Promise<void> => {
    await api.delete(`/creators/${id}`);
  }
};

// Campaigns API
export const campaignsAPI = {
  getCampaigns: async (params?: {
    page?: number;
    limit?: number;
    status?: string;
  }): Promise<{ campaigns: Campaign[]; total: number; pages: number }> => {
    const response: AxiosResponse<ApiResponse<{ campaigns: Campaign[]; total: number; pages: number }>> = 
      await api.get('/campaigns', { params });
    return response.data.data;
  },

  getCampaign: async (id: string): Promise<Campaign> => {
    const response: AxiosResponse<ApiResponse<{ campaign: Campaign }>> = 
      await api.get(`/campaigns/${id}`);
    return response.data.data.campaign;
  },

  createCampaign: async (campaignData: Omit<Campaign, 'id' | 'createdAt' | 'status'>): Promise<Campaign> => {
    const response: AxiosResponse<ApiResponse<{ campaign: Campaign }>> = 
      await api.post('/campaigns', campaignData);
    return response.data.data.campaign;
  },

  updateCampaign: async (id: string, campaignData: Partial<Campaign>): Promise<Campaign> => {
    const response: AxiosResponse<ApiResponse<{ campaign: Campaign }>> = 
      await api.put(`/campaigns/${id}`, campaignData);
    return response.data.data.campaign;
  },

  updateCampaignStatus: async (id: string, status: string): Promise<Campaign> => {
    const response: AxiosResponse<ApiResponse<{ campaign: Campaign }>> = 
      await api.put(`/campaigns/${id}/status`, { status });
    return response.data.data.campaign;
  },

  deleteCampaign: async (id: string): Promise<void> => {
    await api.delete(`/campaigns/${id}`);
  },

  applyCampaign: async (campaignId: string, application: {
    message: string;
  }): Promise<void> => {
    await api.post(`/campaigns/${campaignId}/apply`, application);
  }
};

// Outreach API
export const outreachAPI = {
  getEmails: async (params?: {
    campaignId?: string;
    status?: string;
  }): Promise<{ emails: OutreachEmail[] }> => {
    const response: AxiosResponse<ApiResponse<{ emails: OutreachEmail[] }>> = 
      await api.get('/outreach/emails', { params });
    return response.data.data;
  },

  getEmailDetails: async (emailId: string): Promise<OutreachEmail> => {
    const response: AxiosResponse<ApiResponse<OutreachEmail>> = 
      await api.get(`/outreach/emails/${emailId}`);
    return response.data.data;
  },

  createEmail: async (emailData: {
    campaignId: string;
    creatorId: string;
    subject: string;
    body: string;
  }): Promise<OutreachEmail> => {
    const response: AxiosResponse<ApiResponse<OutreachEmail>> = 
      await api.post('/outreach/emails', emailData);
    return response.data.data;
  },

  sendEmail: async (emailId: string): Promise<OutreachEmail> => {
    try {
      console.log('🚀 Attempting to send email with ID:', emailId);
      const response: AxiosResponse<ApiResponse<OutreachEmail>> = 
        await api.put(`/outreach/emails/${emailId}/send`);
      console.log('✅ Email sent successfully:', response.data);
      return response.data.data;
    } catch (error: any) {
      console.error('❌ Failed to send email:', {
        emailId,
        error: error.response?.data || error.message,
        status: error.response?.status
      });
      
      // Provide more specific error messages
      if (error.response?.status === 404) {
        throw new Error('Email not found. Please refresh and try again.');
      } else if (error.response?.status === 400) {
        const message = error.response.data?.message || 'Invalid email data';
        throw new Error(message);
      } else if (error.response?.status >= 500) {
        throw new Error('Server error. Please try again later or contact support.');
      } else if (error.code === 'ECONNABORTED') {
        throw new Error('Request timed out. Please check your connection and try again.');
      } else {
        throw error;
      }
    }
  },

  updateEmailStatus: async (emailId: string, statusData: {
    status?: string;
    openedAt?: string;
    repliedAt?: string;
    notes?: string;
  }): Promise<OutreachEmail> => {
    const response: AxiosResponse<ApiResponse<OutreachEmail>> = 
      await api.put(`/outreach/emails/${emailId}/status`, statusData);
    return response.data.data;
  },

  simulateCreatorReply: async (emailId: string, replyContent?: string): Promise<OutreachEmail> => {
    const response: AxiosResponse<ApiResponse<OutreachEmail>> = 
      await api.post(`/outreach/emails/${emailId}/simulate-reply`, { replyContent });
    return response.data.data;
  },

  processManualReply: async (emailId: string, replyData: {
    replyContent: string;
    fromEmail?: string;
  }): Promise<OutreachEmail> => {
    const response: AxiosResponse<ApiResponse<OutreachEmail>> = 
      await api.post(`/outreach/emails/${emailId}/manual-reply`, replyData);
    return response.data.data;
  },

  getPendingApprovals: async (): Promise<Array<{
    id: string;
    emailId: string;
    replyContent: string;
    analysis: {
      sentiment: string;
      intent: string;
      requiresHumanAttention: boolean;
      suggestedResponse?: string;
      extractedInfo: any;
    };
    status: string;
    priority: string;
    createdAt: string;
  }>> => {
    const response: AxiosResponse<ApiResponse<{ approvals: any[] }>> = 
      await api.get('/outreach/pending-approvals');
    return response.data.data.approvals;
  },

  approveResponse: async (escalationId: string, responseText: string): Promise<OutreachEmail> => {
    const response: AxiosResponse<ApiResponse<OutreachEmail>> = 
      await api.post(`/outreach/approve-response/${escalationId}`, { responseText });
    return response.data.data;
  },

  getPipeline: async (): Promise<{
    pipeline: {
      draft: OutreachEmail[];
      sent: OutreachEmail[];
      opened: OutreachEmail[];
      replied: OutreachEmail[];
      failed: OutreachEmail[];
    };
    metrics: {
      totalEmails: number;
      draftCount: number;
      sentCount: number;
      openedCount: number;
      repliedCount: number;
      failedCount: number;
      openRate: string;
      replyRate: string;
      deliveryRate: string;
    };
  }> => {
    const response: AxiosResponse<ApiResponse<any>> = 
      await api.get('/outreach/pipeline');
    return response.data.data;
  },

  getAnalytics: async (params?: {
    startDate?: string;
    endDate?: string;
    campaignId?: string;
  }): Promise<{
    overview: {
      totalEmails: number;
      sentEmails: number;
      openedEmails: number;
      repliedEmails: number;
      failedEmails: number;
      openRate: string;
      replyRate: string;
      deliveryRate: string;
    };
    campaignPerformance: Array<{
      campaignName: string;
      total: number;
      sent: number;
      opened: number;
      replied: number;
      failed: number;
      openRate: string;
      replyRate: string;
      deliveryRate: string;
    }>;
    timeline: Array<{
      date: string;
      sent: number;
      opened: number;
      replied: number;
    }>;
  }> => {
    const response: AxiosResponse<ApiResponse<any>> = 
      await api.get('/outreach/analytics', { params });
    return response.data.data;
  },

  getStats: async (campaignId?: string): Promise<OutreachStats> => {
    const params = campaignId ? { campaignId } : {};
    const response: AxiosResponse<ApiResponse<OutreachStats>> = 
      await api.get('/outreach/stats', { params });
    return response.data.data;
  },

  getTemplates: async (): Promise<Array<{ id: string; name: string; subject: string; body: string }>> => {
    const response: AxiosResponse<ApiResponse<Array<{ id: string; name: string; subject: string; body: string }>>> = 
      await api.get('/outreach/templates');
    return response.data.data;
  }
};

// Health check
export const healthAPI = {
  check: async (): Promise<{ status: string; message: string; timestamp: string }> => {
    const baseUrl = API_BASE_URL.replace('/api', '');
    const response: AxiosResponse<{ status: string; message: string; timestamp: string }> = 
      await axios.get(`${baseUrl}/health`);
    return response.data;
  }
};

export default api; 