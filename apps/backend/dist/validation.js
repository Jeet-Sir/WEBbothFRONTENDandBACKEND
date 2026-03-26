"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createCreditEventSchema = exports.createFormSessionSchema = exports.uploadVaultSchema = exports.processVaultSchema = exports.onboardSchema = exports.profilePatchSchema = exports.authGoogleSchema = void 0;
const zod_1 = require("zod");
const documentSchema = zod_1.z.object({
    fileUrl: zod_1.z.string().min(1).optional(),
    storagePath: zod_1.z.string().optional(),
    extractedData: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).nullable().optional(),
    status: zod_1.z.enum(['idle', 'processing', 'verified', 'rejected']),
    uploadedAt: zod_1.z.string(),
    processedAt: zod_1.z.string().optional(),
    error: zod_1.z.string().optional(),
    folder: zod_1.z.string().optional(),
});
const coFounderSchema = zod_1.z.object({
    fullName: zod_1.z.string().min(1),
    email: zod_1.z.string().email(),
    phone: zod_1.z.string().min(1),
    linkedInProfile: zod_1.z.string().optional(),
    education: zod_1.z.string().optional(),
    workExperience: zod_1.z.string().optional(),
    startupRole: zod_1.z.string().optional(),
});
const metadataSchema = zod_1.z.record(zod_1.z.string(), zod_1.z.unknown());
const activityAgentLogSchema = zod_1.z.object({
    agentName: zod_1.z.string().min(1),
    modelName: zod_1.z.string().min(1),
    inputTokens: zod_1.z.number().int().min(0).optional(),
    outputTokens: zod_1.z.number().int().min(0).optional(),
    totalTokens: zod_1.z.number().int().min(0).optional(),
    creditsUsed: zod_1.z.number().min(0).optional(),
    createdAt: zod_1.z.string().optional(),
    metadata: metadataSchema.optional(),
});
const activityDocumentSchema = zod_1.z.object({
    documentName: zod_1.z.string().min(1),
    eventType: zod_1.z.enum(['doc_upload_extract', 'extension_chat_doc']),
    modelName: zod_1.z.string().min(1),
    inputTokens: zod_1.z.number().int().min(0).optional(),
    outputTokens: zod_1.z.number().int().min(0).optional(),
    totalTokens: zod_1.z.number().int().min(0).optional(),
    creditsUsed: zod_1.z.number().min(0).optional(),
    createdAt: zod_1.z.string().optional(),
    metadata: metadataSchema.optional(),
});
exports.authGoogleSchema = zod_1.z
    .object({
    credential: zod_1.z.string().min(1).optional(),
    code: zod_1.z.string().min(1).optional(),
})
    .refine((v) => Boolean(v.credential || v.code), {
    message: 'Either credential or code is required',
});
exports.profilePatchSchema = zod_1.z
    .object({
    email: zod_1.z.string().email().optional(),
    fullName: zod_1.z.string().min(1).optional(),
    avatarUrl: zod_1.z.string().url().optional(),
    countryCode: zod_1.z.string().min(2).max(2).optional(),
    marketSegment: zod_1.z.enum(['india', 'global_founder']).optional(),
    onboardingComplete: zod_1.z.boolean().optional(),
    onboardingStep: zod_1.z.number().int().min(1).max(4).optional(),
    firstName: zod_1.z.string().optional(),
    middleName: zod_1.z.string().optional(),
    lastName: zod_1.z.string().optional(),
    dob: zod_1.z.string().optional(),
    fatherName: zod_1.z.string().optional(),
    motherName: zod_1.z.string().optional(),
    phone: zod_1.z.string().optional(),
    permanentAddress: zod_1.z.string().optional(),
    motherTongue: zod_1.z.string().optional(),
    gender: zod_1.z.string().optional(),
    highestQualification: zod_1.z.string().optional(),
    professions: zod_1.z.array(zod_1.z.enum(['Student', 'Professional', 'Founder', 'Researcher', 'Other'])).optional(),
    socialCategory: zod_1.z.string().optional(),
    disabilityStatus: zod_1.z.string().optional(),
    maritalStatus: zod_1.z.string().optional(),
    religion: zod_1.z.string().optional(),
    nationality: zod_1.z.string().optional(),
    domicileState: zod_1.z.string().optional(),
    district: zod_1.z.string().optional(),
    mandal: zod_1.z.string().optional(),
    pincode: zod_1.z.string().optional(),
    linkedInProfile: zod_1.z.string().optional(),
    education: zod_1.z.string().optional(),
    workExperience: zod_1.z.string().optional(),
    startupRole: zod_1.z.string().optional(),
    coFounders: zod_1.z.array(coFounderSchema).optional(),
    startupName: zod_1.z.string().optional(),
    startupWebsite: zod_1.z.string().optional(),
    startupLinkedInProfile: zod_1.z.string().optional(),
    industry: zod_1.z.string().optional(),
    startupStage: zod_1.z.string().optional(),
    incorporationDate: zod_1.z.string().optional(),
    companyType: zod_1.z.string().optional(),
    documents: zod_1.z.record(zod_1.z.string(), documentSchema).optional(),
})
    .strict();
exports.onboardSchema = zod_1.z.object({
    step: zod_1.z.number().int().min(1).max(4),
    onboardingComplete: zod_1.z.boolean().optional(),
    pageData: exports.profilePatchSchema.default({}),
});
exports.processVaultSchema = zod_1.z.object({
    dataUri: zod_1.z.string().startsWith('data:').optional(),
    docType: zod_1.z.string().min(1),
    fileUrl: zod_1.z.string().url(),
    storagePath: zod_1.z.string().optional(),
    mimeType: zod_1.z.string().optional(),
});
exports.uploadVaultSchema = zod_1.z.object({
    docType: zod_1.z.string().min(1),
    fileName: zod_1.z.string().min(1),
    mimeType: zod_1.z.string().min(1),
    dataUri: zod_1.z.string().startsWith('data:'),
});
exports.createFormSessionSchema = zod_1.z.object({
    formTitle: zod_1.z.string().min(1),
    websiteName: zod_1.z.string().min(1),
    formUrl: zod_1.z.string().url(),
    examCategory: zod_1.z.string().min(1),
    status: zod_1.z.enum(['submitted', 'abandoned', 'in_progress']),
    modelName: zod_1.z.string().min(1),
    startedAt: zod_1.z.string().optional(),
    submittedAt: zod_1.z.string().optional(),
    updatedAt: zod_1.z.string().optional(),
    agentLogs: zod_1.z.array(activityAgentLogSchema).default([]),
    documents: zod_1.z.array(activityDocumentSchema).default([]),
    metadata: metadataSchema.optional(),
});
exports.createCreditEventSchema = zod_1.z.object({
    sessionId: zod_1.z.string().uuid().nullable().optional(),
    eventType: zod_1.z.enum([
        'form_fill_agent',
        'doc_upload_extract',
        'extension_chat_doc',
        'extension_chat_text',
        'profile_sync',
    ]),
    agentName: zod_1.z.string().min(1),
    modelName: zod_1.z.string().min(1),
    inputTokens: zod_1.z.number().int().min(0).optional(),
    outputTokens: zod_1.z.number().int().min(0).optional(),
    totalTokens: zod_1.z.number().int().min(0).optional(),
    creditsUsed: zod_1.z.number().min(0).optional(),
    createdAt: zod_1.z.string().optional(),
    metadata: metadataSchema.optional(),
});
