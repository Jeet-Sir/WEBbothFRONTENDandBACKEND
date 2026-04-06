export type Profession = 'Student' | 'Professional' | 'Founder' | 'Researcher' | 'Other';
export type CreditPlan = 'free' | 'monthly_100';
export type CreditPurchaseType = 'monthly_100' | 'top_up_10';
export type RazorpaySubscriptionStatus =
  | 'created'
  | 'authenticated'
  | 'active'
  | 'pending'
  | 'halted'
  | 'paused'
  | 'cancelled'
  | 'completed';

export type DocumentStatus = 'idle' | 'processing' | 'verified' | 'rejected';
export type MarketSegment = 'india' | 'global_founder';

export interface CoFounderProfile {
  fullName: string;
  email: string;
  phone: string;
  linkedInProfile?: string;
  education?: string;
  workExperience?: string;
  startupRole?: string;
}

export interface UserDocument {
  id?: string;
  documentType?: string;
  displayName?: string;
  originalFileName?: string;
  fileUrl?: string;
  storagePath?: string;
  extractedData?: Record<string, unknown> | null;
  confidence?: number;
  profileSection?: string;
  status: DocumentStatus;
  uploadedAt: string;
  processedAt?: string;
  error?: string;
  folder?: string;
}

export interface UserProfile {
  userId: string;
  googleId: string;
  email: string;
  fullName: string;
  avatarUrl?: string;
  countryCode?: string;
  marketSegment?: MarketSegment;
  creditPlan?: CreditPlan;
  creditPlanExpiresAt?: string;
  purchasedCredits?: number;
  purchasedCreditsExpiresAt?: string;
  freeCreditsAwarded?: number;
  pendingCreditPurchaseType?: CreditPurchaseType;
  pendingCreditPurchaseCreatedAt?: string;
  processedRazorpayPaymentIds?: string[];
  processedRazorpayEventIds?: string[];
  razorpaySubscriptionId?: string;
  razorpaySubscriptionShortUrl?: string;
  razorpaySubscriptionPlanId?: string;
  subscriptionStatus?: RazorpaySubscriptionStatus;
  subscriptionCurrentStart?: string;
  subscriptionCurrentEnd?: string;
  onboardingComplete: boolean;
  onboardingStep: number;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  dob?: string;
  fatherName?: string;
  motherName?: string;
  phone?: string;
  permanentAddress?: string;
  motherTongue?: string;
  gender?: string;
  highestQualification?: string;
  professions: Profession[];
  socialCategory?: string;
  disabilityStatus?: string;
  maritalStatus?: string;
  religion?: string;
  nationality?: string;
  domicileState?: string;
  district?: string;
  mandal?: string;
  pincode?: string;
  linkedInProfile?: string;
  education?: string;
  workExperience?: string;
  startupRole?: string;
  coFounders?: CoFounderProfile[];
  startupName?: string;
  startupWebsite?: string;
  startupLinkedInProfile?: string;
  industry?: string;
  startupStage?: string;
  incorporationDate?: string;
  companyType?: string;
  documents: Record<string, UserDocument>;
  createdAt: string;
  updatedAt: string;
}

export interface MonetaryPrice {
  usd: number;
  inr: number;
}

export type SessionStatus = 'submitted' | 'abandoned' | 'in_progress';
export type CreditEventType =
  | 'form_fill_agent'
  | 'doc_upload_extract'
  | 'extension_chat_doc'
  | 'extension_chat_text'
  | 'profile_sync';

export interface SessionAgentLog {
  id: string;
  agentName: string;
  modelName: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  creditsUsed: number;
  price?: MonetaryPrice;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

export interface SessionDocumentUsage {
  id: string;
  documentName: string;
  eventType: Extract<CreditEventType, 'doc_upload_extract' | 'extension_chat_doc'>;
  modelName: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  creditsUsed: number;
  price?: MonetaryPrice;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

export interface FormSession {
  id: string;
  userId: string;
  formTitle: string;
  websiteName: string;
  formUrl: string;
  examCategory: string;
  status: SessionStatus;
  modelName: string;
  startedAt: string;
  submittedAt?: string;
  updatedAt: string;
  creditsUsed: number;
  price?: MonetaryPrice;
  totalTokens: number;
  agentCount: number;
  agentLogs: SessionAgentLog[];
  documents: SessionDocumentUsage[];
  metadata?: Record<string, unknown>;
}

export interface CreditEvent {
  id: string;
  userId: string;
  sessionId: string | null;
  eventType: CreditEventType;
  agentName: string;
  modelName: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  creditsUsed: number;
  price?: MonetaryPrice;
  billingPeriod: string;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

export interface ActivitySummary {
  totalFormsFilled: number;
  totalCreditsUsed: number;
  totalPrice?: MonetaryPrice;
  docsUploaded: number;
  creditsThisMonth: number;
  priceThisMonth?: MonetaryPrice;
  creditsCurrentCycle?: number;
  priceCurrentCycle?: MonetaryPrice;
  currentCycleStart?: string;
  currentCycleEnd?: string;
}

export interface AuthJwtPayload {
  userId: string;
  email: string;
  scope?: 'web' | 'extension';
}
