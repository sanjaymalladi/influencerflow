// Negotiation Types for InfluencerFlow

export interface Contact {
  id: string;
  name: string;
  email: string;
  phone?: string;
  socialMedia?: Record<string, string>;
}

export interface Campaign {
  id: string;
  name: string;
  description: string;
  initialPromptTemplate: string;
  deliverables?: string[];
}

export interface NegotiationTerms {
  compensation: number;
  deliverables: string;
  timeline: string;
  revisions?: string;
  exclusivity?: string;
  usage_rights?: string;
  [key: string]: any;
}

export interface EmailMessage {
  id: string;
  sender: MessageSender;
  subject?: string;
  content: string;
  timestamp: Date;
  isHumanActionPrompt?: boolean;
  humanActionResponse?: string;
}

export type MessageSender = 'ai' | 'human' | 'sanjay' | 'system' | 'user';

export enum NegotiationStage {
  SELECT_CONTACT_CAMPAIGN = 'SELECT_CONTACT_CAMPAIGN',
  INITIAL_EMAIL_DRAFTING = 'INITIAL_EMAIL_DRAFTING',
  INITIAL_EMAIL_PENDING_SEND = 'INITIAL_EMAIL_PENDING_SEND',
  WAITING_FOR_SANJAY_REPLY = 'WAITING_FOR_SANJAY_REPLY',
  AI_ANALYZING_REPLY = 'AI_ANALYZING_REPLY',
  HUMAN_INPUT_NEEDED = 'HUMAN_INPUT_NEEDED',
  AI_DRAFTING_REPLY = 'AI_DRAFTING_REPLY',
  AI_REPLY_PENDING_SEND = 'AI_REPLY_PENDING_SEND',
  CONTRACT_DRAFTING = 'CONTRACT_DRAFTING',
  CONTRACT_PENDING_VERIFICATION = 'CONTRACT_PENDING_VERIFICATION',
  CONTRACT_PENDING_SEND = 'CONTRACT_PENDING_SEND',
  WAITING_FOR_SIGNED_CONTRACT = 'WAITING_FOR_SIGNED_CONTRACT',
  CONTRACT_SIGNED_PENDING_VERIFICATION = 'CONTRACT_SIGNED_PENDING_VERIFICATION',
  NEGOTIATION_COMPLETE = 'NEGOTIATION_COMPLETE',
  ERROR = 'ERROR'
}

export interface AiAnalysisResponse {
  analysis: string;
  changeRequested?: string;
  updatedTerms?: Partial<NegotiationTerms>;
  needsHumanInput: boolean;
  questionForUser?: string;
  aiDraftReply?: string;
  agreementReached: boolean;
}

export interface GroundingChunk {
  text: string;
  url?: string;
}

// API Response types
export interface NegotiationApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
} 