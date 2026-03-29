export type Profession = 'Student' | 'Professional' | 'Founder' | 'Researcher' | 'Other';
export type MarketSegment = 'india' | 'global_founder';
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
export type DashboardTab = 'home' | 'activity' | 'documents' | 'sharing' | 'pricing' | 'profile';
export type SessionStatus = 'submitted' | 'abandoned' | 'in_progress';
export type CreditEventType =
  | 'form_fill_agent'
  | 'doc_upload_extract'
  | 'extension_chat_doc'
  | 'extension_chat_text'
  | 'profile_sync';

export interface CoFounderProfile {
  fullName: string;
  email: string;
  phone: string;
  linkedInProfile?: string;
  education?: string;
  workExperience?: string;
  startupRole?: string;
}

export interface UserProfile {
  userId: string;
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
  
  // Page 1: Basic Bio & Contact
  firstName?: string;
  middleName?: string;
  lastName?: string;
  dob?: string;
  fatherName?: string;
  motherName?: string;
  phone?: string;
  permanentAddress?: string;
  
  // Page 2: Identity & Profession
  motherTongue?: string;
  gender?: string;
  highestQualification?: string;
  professions: Profession[];
  
  // Page 3: Social & Geographic
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
  
  documents: Record<string, {
    fileUrl: string;
    storagePath?: string;
    extractedData?: Record<string, unknown> | null;
    error?: string;
    uploadedAt: string;
    processedAt?: string;
    status: 'idle' | 'processing' | 'verified' | 'rejected';
    folder?: string;
  }>;
}

export interface MonetaryPrice {
  usd: number;
  inr: number;
}

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

export interface ActivityFilters {
  search?: string;
  status?: SessionStatus;
  examCategory?: string;
  modelName?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
}

export interface ActivitySessionsResponse {
  summary: ActivitySummary;
  sessions: FormSession[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
  availableCategories: string[];
  availableModels: string[];
}

export interface ActivitySessionDetailResponse {
  session: FormSession;
  creditEvents: CreditEvent[];
}

export interface DocumentCreditEventsResponse {
  events: CreditEvent[];
}

export const QUALIFICATIONS = [
  '10th Pass', '12th Pass', 'Diploma', 'Graduate', 'Post Graduate', 'PhD'
];

export const CATEGORIES = [
  'General', 'OBC', 'SC', 'ST', 'EWS'
];

export const RELIGIONS = [
  'Hindu', 'Muslim', 'Christian', 'Sikh', 'Buddhist', 'Jain', 'Other'
];

export const STATES = [
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chhattisgarh',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
  'Andaman and Nicobar Islands',
  'Chandigarh',
  'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi',
  'Jammu and Kashmir',
  'Ladakh',
  'Lakshadweep',
  'Puducherry',
  'Other'
];

export const LANGUAGES = [
  'Telugu', 'Hindi', 'English', 'Tamil', 'Kannada', 'Malayalam', 'Marathi', 'Bengali'
];

export const MARITAL_STATUSES = [
  'Single', 'Married', 'Divorced', 'Widowed', 'Other'
];

export const DISABILITY_OPTIONS = [
  'No', 'Yes'
];

export const COUNTRY_OPTIONS = [
  { code: 'IN', label: 'India' },
  { code: 'US', label: 'United States' },
  { code: 'GB', label: 'United Kingdom' },
  { code: 'CA', label: 'Canada' },
  { code: 'AU', label: 'Australia' },
  { code: 'SG', label: 'Singapore' },
  { code: 'AE', label: 'United Arab Emirates' },
  { code: 'DE', label: 'Germany' },
  { code: 'FR', label: 'France' },
  { code: 'NL', label: 'Netherlands' },
  { code: 'SE', label: 'Sweden' },
  { code: 'CH', label: 'Switzerland' },
  { code: 'IE', label: 'Ireland' },
  { code: 'NZ', label: 'New Zealand' },
  { code: 'BR', label: 'Brazil' },
  { code: 'MX', label: 'Mexico' },
  { code: 'ES', label: 'Spain' },
  { code: 'IT', label: 'Italy' },
  { code: 'PT', label: 'Portugal' },
  { code: 'JP', label: 'Japan' },
  { code: 'KR', label: 'South Korea' },
  { code: 'HK', label: 'Hong Kong' },
  { code: 'ID', label: 'Indonesia' },
  { code: 'MY', label: 'Malaysia' },
  { code: 'TH', label: 'Thailand' },
  { code: 'VN', label: 'Vietnam' },
  { code: 'PH', label: 'Philippines' },
  { code: 'ZA', label: 'South Africa' },
  { code: 'KE', label: 'Kenya' },
  { code: 'NG', label: 'Nigeria' },
  { code: 'EG', label: 'Egypt' },
  { code: 'TR', label: 'Turkey' },
  { code: 'PL', label: 'Poland' },
  { code: 'DK', label: 'Denmark' },
  { code: 'NO', label: 'Norway' },
  { code: 'FI', label: 'Finland' },
  { code: 'BE', label: 'Belgium' },
  { code: 'AT', label: 'Austria' },
  { code: 'IL', label: 'Israel' },
  { code: 'AR', label: 'Argentina' },
  { code: 'CL', label: 'Chile' },
  { code: 'CO', label: 'Colombia' },
  { code: 'ZZ', label: 'Other' },
];

export const STARTUP_STAGES = [
  'Ideation',
  'Prototype',
  'Validation',
  'MVP (Minimum Viable Product)',
  'Early Traction',
  'Revenue',
  'Scaling',
];

export const COMPANY_TYPES = [
  'Private Limited',
  'LLP',
  'Corporation',
  'Partnership',
  'Sole Proprietorship',
  'Nonprofit',
  'Other',
];

export function getCountryLabel(countryCode?: string): string {
  if (!countryCode) return 'Not provided';
  return COUNTRY_OPTIONS.find((country) => country.code === countryCode)?.label || countryCode;
}

export function normalizeStartupStage(startupStage?: string): string | undefined {
  if (startupStage === 'Idea') {
    return 'Ideation';
  }

  return startupStage;
}
