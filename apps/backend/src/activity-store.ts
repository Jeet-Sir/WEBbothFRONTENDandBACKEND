import { randomUUID } from 'node:crypto';
import { MongoClient, ObjectId } from 'mongodb';
import { config } from './config';
import {
  ActivitySummary,
  CreditEvent,
  CreditEventType,
  FormSession,
  SessionAgentLog,
  SessionDocumentUsage,
  SessionStatus,
  UserProfile,
} from './types';

export interface ActivityListFilters {
  search?: string;
  status?: SessionStatus;
  examCategory?: string;
  modelName?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
}

export interface CreateSessionAgentInput {
  agentName: string;
  modelName: string;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  creditsUsed?: number;
  createdAt?: string;
  metadata?: Record<string, unknown>;
}

export interface CreateSessionDocumentInput {
  documentName: string;
  eventType: Extract<CreditEventType, 'doc_upload_extract' | 'extension_chat_doc'>;
  modelName: string;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  creditsUsed?: number;
  createdAt?: string;
  metadata?: Record<string, unknown>;
}

export interface CreateFormSessionInput {
  userId: string;
  formTitle: string;
  websiteName: string;
  formUrl: string;
  examCategory: string;
  status: SessionStatus;
  modelName: string;
  startedAt?: string;
  submittedAt?: string;
  updatedAt?: string;
  agentLogs?: CreateSessionAgentInput[];
  documents?: CreateSessionDocumentInput[];
  metadata?: Record<string, unknown>;
}

export interface CreateCreditEventInput {
  userId: string;
  sessionId?: string | null;
  eventType: CreditEventType;
  agentName: string;
  modelName: string;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  creditsUsed?: number;
  createdAt?: string;
  metadata?: Record<string, unknown>;
}

type MongoSessionAgentLog = Omit<SessionAgentLog, 'createdAt'> & {
  createdAt: Date;
};

type MongoSessionDocumentUsage = Omit<SessionDocumentUsage, 'createdAt'> & {
  createdAt: Date;
};

type MongoFormSession = Omit<FormSession, 'id' | 'startedAt' | 'submittedAt' | 'updatedAt' | 'agentLogs' | 'documents'> & {
  _id?: ObjectId;
  startedAt: Date;
  submittedAt?: Date | null;
  updatedAt: Date;
  agentLogs: MongoSessionAgentLog[];
  documents: MongoSessionDocumentUsage[];
};

type MongoCreditEvent = Omit<CreditEvent, 'id' | 'createdAt'> & {
  _id?: ObjectId;
  createdAt: Date;
};

const MODEL_CREDIT_RATES: Record<string, number> = {
  'googleai/gemini-2.5-flash': 0.18,
  'gpt-4o-mini': 0.24,
  'gpt-4o': 0.42,
  'claude-3-5-sonnet': 0.48,
  'claude-3.5-sonnet': 0.48,
};

const DEFAULT_CREDITS_PER_1K_TOKENS = 0.2;

let mongoClientPromise: Promise<MongoClient> | null = null;
let indexesReadyPromise: Promise<void> | null = null;

function assertMongoConfigured(): void {
  if (!config.mongoUri) {
    throw new Error('MONGODB_URI is required for activity tracking');
  }
}

async function getMongoClient(): Promise<MongoClient> {
  assertMongoConfigured();

  if (!mongoClientPromise) {
    const client = new MongoClient(config.mongoUri);
    mongoClientPromise = client.connect();
  }

  return mongoClientPromise;
}

async function ensureIndexes(): Promise<void> {
  if (!indexesReadyPromise) {
    indexesReadyPromise = (async () => {
      const client = await getMongoClient();
      const db = client.db(config.mongoDbName);
      const creditEvents = db.collection<MongoCreditEvent>('creditEvents');
      const formSessions = db.collection<MongoFormSession>('formSessions');

      await Promise.all([
        creditEvents.createIndex({ userId: 1, createdAt: -1 }),
        creditEvents.createIndex({ sessionId: 1, createdAt: -1 }),
        creditEvents.createIndex({ billingPeriod: 1, userId: 1 }),
        creditEvents.createIndex({ 'metadata.originEventId': 1 }, { unique: true, sparse: true }),
        creditEvents.createIndex({ 'metadata.idempotencyKey': 1 }, { unique: true, sparse: true }),
        formSessions.createIndex({ userId: 1, updatedAt: -1 }),
        formSessions.createIndex({ status: 1, userId: 1 }),
        formSessions.createIndex({ 'metadata.originSessionId': 1 }, { unique: true, sparse: true }),
        formSessions.createIndex({ 'metadata.idempotencyKey': 1 }, { unique: true, sparse: true }),
      ]);
    })();
  }

  return indexesReadyPromise;
}

async function getCollections() {
  await ensureIndexes();
  const client = await getMongoClient();
  const db = client.db(config.mongoDbName);

  return {
    creditEvents: db.collection<MongoCreditEvent>('creditEvents'),
    formSessions: db.collection<MongoFormSession>('formSessions'),
  };
}

function normalizeTokenPair(inputTokens = 0, outputTokens = 0, totalTokens?: number) {
  const safeInput = Math.max(0, Math.round(inputTokens));
  const safeOutput = Math.max(0, Math.round(outputTokens));
  const safeTotal = Math.max(0, Math.round(totalTokens ?? safeInput + safeOutput));

  if (safeTotal === 0 && (safeInput > 0 || safeOutput > 0)) {
    return {
      inputTokens: safeInput,
      outputTokens: safeOutput,
      totalTokens: safeInput + safeOutput,
    };
  }

  return {
    inputTokens: safeInput,
    outputTokens: safeOutput,
    totalTokens: safeTotal,
  };
}

function getBillingPeriod(dateIso: string): string {
  const date = new Date(dateIso);
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1)).toISOString().slice(0, 10);
}

function roundCredits(value: number): number {
  return Number(Number(value || 0).toFixed(4));
}

export function estimateTokenCount(value: unknown): number {
  if (value == null) return 0;

  const text =
    typeof value === 'string'
      ? value
      : JSON.stringify(value, (_key, nestedValue) => (typeof nestedValue === 'bigint' ? nestedValue.toString() : nestedValue));

  if (!text) return 0;
  return Math.max(1, Math.ceil(text.length / 4));
}

export function calculateCreditsUsed(totalTokens: number, modelName: string): number {
  const rate = MODEL_CREDIT_RATES[modelName] ?? DEFAULT_CREDITS_PER_1K_TOKENS;
  return roundCredits((Math.max(0, totalTokens) / 1000) * rate);
}

function normalizeAgentLog(input: CreateSessionAgentInput): MongoSessionAgentLog {
  const tokenCounts = normalizeTokenPair(input.inputTokens, input.outputTokens, input.totalTokens);

  return {
    id: randomUUID(),
    agentName: input.agentName,
    modelName: input.modelName,
    inputTokens: tokenCounts.inputTokens,
    outputTokens: tokenCounts.outputTokens,
    totalTokens: tokenCounts.totalTokens,
    creditsUsed:
      input.creditsUsed != null
        ? roundCredits(input.creditsUsed)
        : calculateCreditsUsed(tokenCounts.totalTokens, input.modelName),
    createdAt: new Date(input.createdAt || new Date().toISOString()),
    metadata: input.metadata,
  };
}

function normalizeDocumentUsage(input: CreateSessionDocumentInput): MongoSessionDocumentUsage {
  const tokenCounts = normalizeTokenPair(input.inputTokens, input.outputTokens, input.totalTokens);

  return {
    id: randomUUID(),
    documentName: input.documentName,
    eventType: input.eventType,
    modelName: input.modelName,
    inputTokens: tokenCounts.inputTokens,
    outputTokens: tokenCounts.outputTokens,
    totalTokens: tokenCounts.totalTokens,
    creditsUsed:
      input.creditsUsed != null
        ? roundCredits(input.creditsUsed)
        : calculateCreditsUsed(tokenCounts.totalTokens, input.modelName),
    createdAt: new Date(input.createdAt || new Date().toISOString()),
    metadata: input.metadata,
  };
}

function duplicateKeyMatch(error: unknown, fieldName: string): boolean {
  return (
    error instanceof Error &&
    'code' in error &&
    Number((error as { code?: number }).code) === 11000 &&
    error.message.includes(fieldName)
  );
}

function toPlainSession(sessionDoc: MongoFormSession | null): FormSession | null {
  if (!sessionDoc || !sessionDoc._id) return null;

  return {
    id: String(sessionDoc._id),
    userId: sessionDoc.userId,
    formTitle: sessionDoc.formTitle,
    websiteName: sessionDoc.websiteName,
    formUrl: sessionDoc.formUrl,
    examCategory: sessionDoc.examCategory,
    status: sessionDoc.status,
    modelName: sessionDoc.modelName,
    startedAt: sessionDoc.startedAt.toISOString(),
    submittedAt: sessionDoc.submittedAt ? sessionDoc.submittedAt.toISOString() : undefined,
    updatedAt: sessionDoc.updatedAt.toISOString(),
    creditsUsed: roundCredits(sessionDoc.creditsUsed),
    totalTokens: sessionDoc.totalTokens || 0,
    agentCount: sessionDoc.agentCount || 0,
    agentLogs: (sessionDoc.agentLogs || []).map((agentLog) => ({
      ...agentLog,
      creditsUsed: roundCredits(agentLog.creditsUsed),
      createdAt: agentLog.createdAt.toISOString(),
    })),
    documents: (sessionDoc.documents || []).map((documentUsage) => ({
      ...documentUsage,
      creditsUsed: roundCredits(documentUsage.creditsUsed),
      createdAt: documentUsage.createdAt.toISOString(),
    })),
    metadata: sessionDoc.metadata,
  };
}

function toPlainCreditEvent(event: MongoCreditEvent): CreditEvent {
  return {
    id: String(event._id),
    userId: event.userId,
    sessionId: event.sessionId ?? null,
    eventType: event.eventType,
    agentName: event.agentName,
    modelName: event.modelName,
    inputTokens: event.inputTokens || 0,
    outputTokens: event.outputTokens || 0,
    totalTokens: event.totalTokens || 0,
    creditsUsed: roundCredits(event.creditsUsed),
    billingPeriod: event.billingPeriod,
    createdAt: event.createdAt.toISOString(),
    metadata: event.metadata,
  };
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildSessionMatch(userId: string, filters: ActivityListFilters = {}) {
  const match: Record<string, unknown> = { userId };

  if (filters.status) match.status = filters.status;
  if (filters.examCategory) match.examCategory = filters.examCategory;
  if (filters.modelName) match.modelName = filters.modelName;

  if (filters.dateFrom || filters.dateTo) {
    const updatedAt: Record<string, Date> = {};
    if (filters.dateFrom) updatedAt.$gte = new Date(`${filters.dateFrom}T00:00:00.000Z`);
    if (filters.dateTo) updatedAt.$lte = new Date(`${filters.dateTo}T23:59:59.999Z`);
    match.updatedAt = updatedAt;
  }

  if (filters.search?.trim()) {
    const pattern = escapeRegex(filters.search.trim());
    match.$or = [
      { formTitle: { $regex: pattern, $options: 'i' } },
      { formUrl: { $regex: pattern, $options: 'i' } },
      { websiteName: { $regex: pattern, $options: 'i' } },
    ];
  }

  return match;
}

export async function createCreditEvent(input: CreateCreditEventInput): Promise<CreditEvent> {
  const { creditEvents } = await getCollections();
  const createdAt = input.createdAt || new Date().toISOString();
  const tokenCounts = normalizeTokenPair(input.inputTokens, input.outputTokens, input.totalTokens);
  const doc: MongoCreditEvent = {
    userId: input.userId,
    sessionId: input.sessionId ?? null,
    eventType: input.eventType,
    agentName: input.agentName,
    modelName: input.modelName,
    inputTokens: tokenCounts.inputTokens,
    outputTokens: tokenCounts.outputTokens,
    totalTokens: tokenCounts.totalTokens,
    creditsUsed:
      input.creditsUsed != null
        ? roundCredits(input.creditsUsed)
        : calculateCreditsUsed(tokenCounts.totalTokens, input.modelName),
    billingPeriod: getBillingPeriod(createdAt),
    createdAt: new Date(createdAt),
    metadata: input.metadata,
  };

  try {
    const result = await creditEvents.insertOne(doc);
    return toPlainCreditEvent({ ...doc, _id: result.insertedId });
  } catch (error) {
    if (duplicateKeyMatch(error, 'originEventId') || duplicateKeyMatch(error, 'idempotencyKey')) {
      const existing = await creditEvents.findOne({
        $or: [
          ...(doc.metadata?.originEventId ? [{ 'metadata.originEventId': doc.metadata.originEventId }] : []),
          ...(doc.metadata?.idempotencyKey ? [{ 'metadata.idempotencyKey': doc.metadata.idempotencyKey }] : []),
        ],
      });
      if (existing) {
        return toPlainCreditEvent(existing);
      }
    }
    throw error;
  }
}

export async function createFormSession(input: CreateFormSessionInput): Promise<FormSession> {
  const { formSessions } = await getCollections();
  const startedAt = input.startedAt || new Date().toISOString();
  const updatedAt = input.updatedAt || input.submittedAt || startedAt;
  const agentLogs = (input.agentLogs || []).map(normalizeAgentLog);
  const documents = (input.documents || []).map(normalizeDocumentUsage);
  const totalTokens = [...agentLogs, ...documents].reduce((sum, item) => sum + item.totalTokens, 0);
  const creditsUsed = roundCredits([...agentLogs, ...documents].reduce((sum, item) => sum + item.creditsUsed, 0));

  const doc: MongoFormSession = {
    userId: input.userId,
    formTitle: input.formTitle,
    websiteName: input.websiteName,
    formUrl: input.formUrl,
    examCategory: input.examCategory,
    status: input.status,
    modelName: input.modelName,
    startedAt: new Date(startedAt),
    submittedAt: input.submittedAt ? new Date(input.submittedAt) : null,
    updatedAt: new Date(updatedAt),
    creditsUsed,
    totalTokens,
    agentCount: agentLogs.length,
    agentLogs,
    documents,
    metadata: input.metadata,
  };

  try {
    const result = await formSessions.insertOne(doc);
    return toPlainSession({ ...doc, _id: result.insertedId }) as FormSession;
  } catch (error) {
    if (duplicateKeyMatch(error, 'originSessionId') || duplicateKeyMatch(error, 'idempotencyKey')) {
      const existing = await formSessions.findOne({
        $or: [
          ...(doc.metadata?.originSessionId ? [{ 'metadata.originSessionId': doc.metadata.originSessionId }] : []),
          ...(doc.metadata?.idempotencyKey ? [{ 'metadata.idempotencyKey': doc.metadata.idempotencyKey }] : []),
        ],
      });
      const existingSession = toPlainSession(existing);
      if (existingSession) {
        return existingSession;
      }
    }
    throw error;
  }
}

export async function getActivitySummary(userId: string, userProfile?: UserProfile | null): Promise<ActivitySummary> {
  const { creditEvents, formSessions } = await getCollections();
  const currentBillingPeriod = getBillingPeriod(new Date().toISOString());
  const docsUploaded = userProfile ? Object.keys(userProfile.documents || {}).length : 0;

  const [submittedAgg, creditAgg, monthlyAgg] = await Promise.all([
    formSessions.aggregate([{ $match: { userId, status: 'submitted' } }, { $count: 'count' }]).toArray(),
    creditEvents.aggregate([{ $match: { userId } }, { $group: { _id: null, total: { $sum: '$creditsUsed' } } }]).toArray(),
    creditEvents.aggregate([
      { $match: { userId, billingPeriod: currentBillingPeriod } },
      { $group: { _id: null, total: { $sum: '$creditsUsed' } } },
    ]).toArray(),
  ]);

  return {
    totalFormsFilled: submittedAgg[0]?.count || 0,
    totalCreditsUsed: roundCredits(creditAgg[0]?.total || 0),
    docsUploaded,
    creditsThisMonth: roundCredits(monthlyAgg[0]?.total || 0),
  };
}

export async function listActivitySessions(
  userId: string,
  filters: ActivityListFilters = {},
  userProfile?: UserProfile | null
): Promise<{
  summary: ActivitySummary;
  sessions: FormSession[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
  availableCategories: string[];
  availableModels: string[];
}> {
  const { formSessions } = await getCollections();
  const match = buildSessionMatch(userId, filters);
  const page = Math.max(1, filters.page || 1);
  const pageSize = Math.min(50, Math.max(1, filters.pageSize || 20));
  const skip = (page - 1) * pageSize;

  const [items, total, allValues, summary] = await Promise.all([
    formSessions.find(match).sort({ updatedAt: -1 }).skip(skip).limit(pageSize).toArray(),
    formSessions.countDocuments(match),
    formSessions.find({ userId }).project({ examCategory: 1, modelName: 1 }).toArray(),
    getActivitySummary(userId, userProfile),
  ]);

  return {
    summary,
    sessions: items.map((item) => toPlainSession(item)).filter(Boolean) as FormSession[],
    total,
    page,
    pageSize,
    hasMore: skip + pageSize < total,
    availableCategories: Array.from(
      new Set(allValues.map((item) => item.examCategory).filter((value): value is string => Boolean(value)))
    ).sort(),
    availableModels: Array.from(
      new Set(allValues.map((item) => item.modelName).filter((value): value is string => Boolean(value)))
    ).sort(),
  };
}

export async function getFormSession(userId: string, sessionId: string): Promise<FormSession | null> {
  if (!ObjectId.isValid(sessionId)) {
    return null;
  }

  const { formSessions } = await getCollections();
  const session = await formSessions.findOne({ _id: new ObjectId(sessionId), userId });
  return toPlainSession(session);
}

export async function listCreditEvents(userId: string, sessionId?: string): Promise<CreditEvent[]> {
  const { creditEvents } = await getCollections();
  const query: Record<string, unknown> = { userId };

  if (sessionId) {
    query.sessionId = sessionId;
  }

  const events = await creditEvents.find(query).sort({ createdAt: -1 }).toArray();
  return events.map(toPlainCreditEvent);
}
