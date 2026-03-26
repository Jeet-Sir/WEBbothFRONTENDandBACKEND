import { z } from 'zod';

const documentSchema = z.object({
  fileUrl: z.string().min(1).optional(),
  storagePath: z.string().optional(),
  extractedData: z.record(z.string(), z.unknown()).nullable().optional(),
  status: z.enum(['idle', 'processing', 'verified', 'rejected']),
  uploadedAt: z.string(),
  processedAt: z.string().optional(),
  error: z.string().optional(),
  folder: z.string().optional(),
});

const coFounderSchema = z.object({
  fullName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().min(1),
  linkedInProfile: z.string().optional(),
  education: z.string().optional(),
  workExperience: z.string().optional(),
  startupRole: z.string().optional(),
});

const metadataSchema = z.record(z.string(), z.unknown());

const activityAgentLogSchema = z.object({
  agentName: z.string().min(1),
  modelName: z.string().min(1),
  inputTokens: z.number().int().min(0).optional(),
  outputTokens: z.number().int().min(0).optional(),
  totalTokens: z.number().int().min(0).optional(),
  creditsUsed: z.number().min(0).optional(),
  createdAt: z.string().optional(),
  metadata: metadataSchema.optional(),
});

const activityDocumentSchema = z.object({
  documentName: z.string().min(1),
  eventType: z.enum(['doc_upload_extract', 'extension_chat_doc']),
  modelName: z.string().min(1),
  inputTokens: z.number().int().min(0).optional(),
  outputTokens: z.number().int().min(0).optional(),
  totalTokens: z.number().int().min(0).optional(),
  creditsUsed: z.number().min(0).optional(),
  createdAt: z.string().optional(),
  metadata: metadataSchema.optional(),
});

export const authGoogleSchema = z
  .object({
    credential: z.string().min(1).optional(),
    code: z.string().min(1).optional(),
  })
  .refine((v) => Boolean(v.credential || v.code), {
    message: 'Either credential or code is required',
  });

export const profilePatchSchema = z
  .object({
    email: z.string().email().optional(),
    fullName: z.string().min(1).optional(),
    avatarUrl: z.string().url().optional(),
    countryCode: z.string().min(2).max(2).optional(),
    marketSegment: z.enum(['india', 'global_founder']).optional(),
    onboardingComplete: z.boolean().optional(),
    onboardingStep: z.number().int().min(1).max(4).optional(),
    firstName: z.string().optional(),
    middleName: z.string().optional(),
    lastName: z.string().optional(),
    dob: z.string().optional(),
    fatherName: z.string().optional(),
    motherName: z.string().optional(),
    phone: z.string().optional(),
    permanentAddress: z.string().optional(),
    motherTongue: z.string().optional(),
    gender: z.string().optional(),
    highestQualification: z.string().optional(),
    professions: z.array(z.enum(['Student', 'Professional', 'Founder', 'Researcher', 'Other'])).optional(),
    socialCategory: z.string().optional(),
    disabilityStatus: z.string().optional(),
    maritalStatus: z.string().optional(),
    religion: z.string().optional(),
    nationality: z.string().optional(),
    domicileState: z.string().optional(),
    district: z.string().optional(),
    mandal: z.string().optional(),
    pincode: z.string().optional(),
    linkedInProfile: z.string().optional(),
    education: z.string().optional(),
    workExperience: z.string().optional(),
    startupRole: z.string().optional(),
    coFounders: z.array(coFounderSchema).optional(),
    startupName: z.string().optional(),
    startupWebsite: z.string().optional(),
    startupLinkedInProfile: z.string().optional(),
    industry: z.string().optional(),
    startupStage: z.string().optional(),
    incorporationDate: z.string().optional(),
    companyType: z.string().optional(),
    documents: z.record(z.string(), documentSchema).optional(),
  })
  .strict();

export const onboardSchema = z.object({
  step: z.number().int().min(1).max(4),
  onboardingComplete: z.boolean().optional(),
  pageData: profilePatchSchema.default({}),
});

export const processVaultSchema = z.object({
  dataUri: z.string().startsWith('data:').optional(),
  docType: z.string().min(1),
  fileUrl: z.string().url(),
  storagePath: z.string().optional(),
  mimeType: z.string().optional(),
});

export const uploadVaultSchema = z.object({
  docType: z.string().min(1),
  fileName: z.string().min(1),
  mimeType: z.string().min(1),
  dataUri: z.string().startsWith('data:'),
});

export const createFormSessionSchema = z.object({
  formTitle: z.string().min(1),
  websiteName: z.string().min(1),
  formUrl: z.string().url(),
  examCategory: z.string().min(1),
  status: z.enum(['submitted', 'abandoned', 'in_progress']),
  modelName: z.string().min(1),
  startedAt: z.string().optional(),
  submittedAt: z.string().optional(),
  updatedAt: z.string().optional(),
  agentLogs: z.array(activityAgentLogSchema).default([]),
  documents: z.array(activityDocumentSchema).default([]),
  metadata: metadataSchema.optional(),
});

export const createCreditEventSchema = z.object({
  sessionId: z.string().uuid().nullable().optional(),
  eventType: z.enum([
    'form_fill_agent',
    'doc_upload_extract',
    'extension_chat_doc',
    'extension_chat_text',
    'profile_sync',
  ]),
  agentName: z.string().min(1),
  modelName: z.string().min(1),
  inputTokens: z.number().int().min(0).optional(),
  outputTokens: z.number().int().min(0).optional(),
  totalTokens: z.number().int().min(0).optional(),
  creditsUsed: z.number().min(0).optional(),
  createdAt: z.string().optional(),
  metadata: metadataSchema.optional(),
});
