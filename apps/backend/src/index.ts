import { createServer, IncomingMessage, ServerResponse } from 'node:http';
import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { config } from './config';
import { issueJwt, verifyJwt } from './auth';
import { exchangeCodeForGoogleIdentity, verifyGoogleCredential } from './google';
import { initDb } from './db';
import {
  createCreditEvent,
  createFormSession,
  getActivitySummary,
  getFormSession,
  listActivitySessions,
  listCreditEvents,
  listDocumentCreditEvents,
} from './activity-store';
import {
  deleteUser,
  getUser,
  getUserByEmail,
  getUserByGoogleId,
  getUserByRazorpaySubscriptionId,
  patchUser,
  upsertUser,
} from './store';
import { deleteUserStorageData, uploadToFirebaseStorage } from './storage';
import { AuthJwtPayload, RazorpaySubscriptionStatus, UserDocument, UserProfile } from './types';
import {
  authGoogleSchema,
  checkoutIntentSchema,
  createCreditEventSchema,
  createFormSessionSchema,
  onboardSchema,
  processVaultSchema,
  profilePatchSchema,
  uploadVaultSchema,
} from './validation';
import { uploadFileToGemini } from './ai/file-manager';

const DEFAULT_AI_MODEL = 'googleai/gemini-2.5-flash';
const FREE_CREDITS_FOR_NEW_USERS = 15;
const MONTHLY_PLAN_CREDITS = 100;
const MONTHLY_SUBSCRIPTION_TOTAL_COUNT = 240;
const TOP_UP_CREDITS = 10;
const TOP_UP_PRICE_INR_SUBUNITS = 2_000;
const PROCESSED_RAZORPAY_ID_LIMIT = 50;
const RAZORPAY_API_BASE_URL = 'https://api.razorpay.com/v1';
const ACTIVE_SUBSCRIPTION_STATUSES = new Set<RazorpaySubscriptionStatus>(['created', 'authenticated', 'active', 'pending']);

type DocumentExtractionResult = {
  extractedData: Record<string, unknown>;
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
    inputImages?: number;
    thoughtsTokens?: number;
    cachedContentTokens?: number;
  };
  aiFileUri?: string;
};

type RazorpayPaymentEntity = {
  id?: string;
  email?: string;
  amount?: number;
  currency?: string;
  status?: string;
  captured?: boolean;
  notes?: Record<string, unknown> | unknown[];
};

type RazorpaySubscriptionEntity = {
  id?: string;
  status?: RazorpaySubscriptionStatus;
  short_url?: string | null;
  plan_id?: string;
  customer_id?: string;
  current_start?: number | null;
  current_end?: number | null;
  notes?: Record<string, unknown> | unknown[];
};

type RazorpayWebhookPayload = {
  event?: string;
  payload?: {
    payment?: {
      entity?: RazorpayPaymentEntity;
    };
    subscription?: {
      entity?: RazorpaySubscriptionEntity;
    };
  };
};

type RazorpayCreateSubscriptionResponse = {
  id: string;
  status: RazorpaySubscriptionStatus;
  short_url?: string | null;
  plan_id?: string;
  customer_id?: string;
  current_start?: number | null;
  current_end?: number | null;
  notes?: Record<string, unknown> | unknown[];
};

type RazorpayCreatePaymentLinkResponse = {
  id: string;
  status: 'created' | 'partially_paid' | 'expired' | 'cancelled' | 'paid';
  short_url?: string;
  reference_id?: string;
};

async function runDocumentExtraction(
  fileUrl: string,
  docType: string,
  mimeType: string = 'application/pdf',
  requestId?: string,
  isDeveloper: boolean = false
): Promise<DocumentExtractionResult> {
  try {
    const fileUri = await uploadFileToGemini(fileUrl, mimeType);

    if (!isDeveloper) {
      logInfo('AI extraction disabled for regular user, skipping extraction', { requestId, docType });
      return {
        extractedData: {
          aiFileUrl: fileUri,
          ai_extraction_disabled: true,
        },
        aiFileUri: fileUri,
      };
    }

    const ai = await import('./ai/flows/extract-data-from-document.js');
    const result = await ai.extractDataFromDocument({ fileUri, docType, mimeType });
    return {
      extractedData: {
        ...(result.extractedData || {}),
        aiFileUrl: fileUri,
      },
      usage: result.usage,
      aiFileUri: fileUri,
    };
  } catch (error) {
    logWarn('AI extraction unavailable, storing fallback payload', { requestId, error });
    return {
      extractedData: {
        warning: 'ai_unavailable',
        docType,
      },
    };
  }
}

function resolveCorsOrigin(req: IncomingMessage): string | null {
  const origin = req.headers.origin;
  if (!origin) return config.corsOrigins[0] || null;
  if (config.corsOrigins.includes(origin)) return origin;
  if (origin.startsWith('chrome-extension://')) return origin;
  return null;
}

function setCorsHeaders(req: IncomingMessage, res: ServerResponse): void {
  const allowedOrigin = resolveCorsOrigin(req);
  if (allowedOrigin) {
    res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
}

function setSecurityHeaders(res: ServerResponse): void {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-site');
  res.setHeader('X-DNS-Prefetch-Control', 'off');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'none'; frame-ancestors 'none'; base-uri 'none';"
  );
}

function sendJson(req: IncomingMessage, res: ServerResponse, status: number, body: unknown): void {
  setCorsHeaders(req, res);
  setSecurityHeaders(res);
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}

function logInfo(message: string, meta?: Record<string, unknown>): void {
  const timestamp = new Date().toISOString();
  if (meta) {
    console.log(`[INFO] [${timestamp}] ${message}`, JSON.stringify(meta, null, 2));
    return;
  }
  console.log(`[INFO] [${timestamp}] ${message}`);
}

function logWarn(message: string, meta?: Record<string, unknown>): void {
  const timestamp = new Date().toISOString();
  if (meta) {
    console.warn(`[WARN] [${timestamp}] ${message}`, JSON.stringify(meta, null, 2));
    return;
  }
  console.warn(`[WARN] [${timestamp}] ${message}`);
}

function logError(message: string, error?: unknown, meta?: Record<string, unknown>): void {
  const timestamp = new Date().toISOString();
  if (meta) {
    console.error(`[ERROR] [${timestamp}] ${message}`, JSON.stringify(meta, null, 2), error);
    return;
  }
  console.error(`[ERROR] [${timestamp}] ${message}`, error);
}

async function readJsonBody(req: IncomingMessage, requestId?: string): Promise<any> {
  const body = await readRawBody(req);
  logInfo('Body read', {
    requestId,
    sizeBytes: body.text.length,
    snippet: body.text.slice(0, 100) + (body.text.length > 100 ? '...' : ''),
  });
  return body.text ? JSON.parse(body.text) : {};
}

async function readRawBody(req: IncomingMessage): Promise<{ buffer: Buffer; text: string }> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  const buffer = Buffer.concat(chunks);
  return { buffer, text: buffer.toString('utf8') };
}

function decodeDataUri(dataUri: string): Buffer {
  const match = dataUri.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) {
    throw new Error('Invalid dataUri format');
  }
  return Buffer.from(match[2], 'base64');
}

function parsePositiveInteger(value: string | null, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }
  return Math.floor(parsed);
}

function readAuth(req: IncomingMessage, allowedScopes?: string[]): AuthJwtPayload | null {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.slice('Bearer '.length);
  const decoded = verifyJwt(token);
  if (!decoded) return null;

  // If allowedScopes is provided, the token must either:
  // 1. Have a matching scope, or
  // 2. Be an older token with no scope (for backwards compatibility), and we'll allow it for now.
  // Actually, to be strict, if the scope is defined, it must match.
  if (allowedScopes && decoded.scope) {
    if (!allowedScopes.includes(decoded.scope)) {
      logWarn('Invalid token scope', { tokenScope: decoded.scope, allowedScopes });
      return null;
    }
  }

  return decoded;
}

function parseCookies(req: IncomingMessage): Record<string, string> {
  const list = req.headers.cookie;
  if (!list) return {};
  const cookies: Record<string, string> = {};
  list.split(';').forEach(cookie => {
    const parts = cookie.split('=');
    const key = parts.shift()?.trim();
    if (!key) return;
    cookies[key] = decodeURI(parts.join('='));
  });
  return cookies;
}

function getClientIp(req: IncomingMessage): string {
  const xff = req.headers['x-forwarded-for'];
  if (typeof xff === 'string' && xff.length > 0) {
    return xff.split(',')[0].trim();
  }
  return req.socket.remoteAddress || 'unknown';
}

const requestBuckets = new Map<string, { count: number; resetAt: number }>();

function getRateLimitKey(req: IncomingMessage): string {
  const method = req.method || 'GET';
  const pathname = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`).pathname;
  return `${getClientIp(req)}:${method}:${pathname}`;
}

function shouldRateLimit(req: IncomingMessage): boolean {
  const method = req.method || 'GET';
  if (method === 'OPTIONS') {
    return false;
  }

  const pathname = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`).pathname;
  if (pathname === '/health' || pathname === '/payments/razorpay/webhook') {
    return false;
  }

  return true;
}

function verifyRazorpayWebhookSignature(rawBody: string, signatureHeader: string | undefined): boolean {
  if (!config.razorpayWebhookSecret || !signatureHeader) {
    return false;
  }

  const expectedSignature = createHmac('sha256', config.razorpayWebhookSecret)
    .update(rawBody)
    .digest('hex');

  const expectedBuffer = Buffer.from(expectedSignature, 'utf8');
  const receivedBuffer = Buffer.from(signatureHeader, 'utf8');

  if (expectedBuffer.length !== receivedBuffer.length) {
    return false;
  }

  return timingSafeEqual(expectedBuffer, receivedBuffer);
}

function normalizeEmail(email?: string): string | null {
  if (!email) return null;
  const normalized = email.trim().toLowerCase();
  return normalized || null;
}

function normalizePhone(phone?: string): string | undefined {
  if (!phone) return undefined;
  const trimmed = phone.trim();
  return trimmed || undefined;
}

function appendProcessedRazorpayId(existingIds: string[] | undefined, value?: string | null): string[] | undefined {
  if (!value) return existingIds;
  const nextIds = [...(existingIds || []).filter((id) => id !== value), value];
  return nextIds.slice(-PROCESSED_RAZORPAY_ID_LIMIT);
}

function getRazorpayNotes(notes?: Record<string, unknown> | unknown[]): Record<string, string> {
  if (!notes || Array.isArray(notes) || typeof notes !== 'object') {
    return {};
  }

  return Object.fromEntries(
    Object.entries(notes).map(([key, value]) => [key, typeof value === 'string' ? value : String(value)])
  );
}

function toIsoFromUnixTimestamp(value?: number | null): string | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    return undefined;
  }

  return new Date(value * 1000).toISOString();
}

function getWebhookEventId(req: IncomingMessage): string | undefined {
  const value = req.headers['x-razorpay-event-id'];
  return Array.isArray(value) ? value[0] : value;
}

function hasProcessedRazorpayEvent(user: UserProfile, eventId?: string, paymentId?: string): boolean {
  if (eventId && (user.processedRazorpayEventIds || []).includes(eventId)) {
    return true;
  }

  if (paymentId && (user.processedRazorpayPaymentIds || []).includes(paymentId)) {
    return true;
  }

  return false;
}

function createRazorpayAuthHeader(): string {
  const credentials = `${config.razorpayKeyId}:${config.razorpayKeySecret}`;
  return `Basic ${Buffer.from(credentials, 'utf8').toString('base64')}`;
}

async function createRazorpayMonthlySubscription(
  user: UserProfile,
  requestId: string
): Promise<RazorpayCreateSubscriptionResponse> {
  if (!config.razorpayKeyId || !config.razorpayKeySecret || !config.razorpayMonthlyPlanId) {
    throw new Error('Razorpay subscription configuration is incomplete');
  }

  const payload: Record<string, unknown> = {
    plan_id: config.razorpayMonthlyPlanId,
    total_count: MONTHLY_SUBSCRIPTION_TOTAL_COUNT,
    quantity: 1,
    customer_notify: 1,
    notes: {
      user_id: user.userId,
      purchase_type: 'monthly_100',
      user_email: user.email,
    },
  };

  const email = normalizeEmail(user.email);
  const phone = normalizePhone(user.phone);
  if (email || phone) {
    payload.notify_info = {
      ...(email ? { email } : {}),
      ...(phone ? { contact: phone } : {}),
    };
  }

  const response = await fetch(`${RAZORPAY_API_BASE_URL}/subscriptions`, {
    method: 'POST',
    headers: {
      Authorization: createRazorpayAuthHeader(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const detail = await response.text();
    logError('Razorpay subscription creation failed', detail, { requestId, status: response.status });
    throw new Error(`Failed to create Razorpay subscription (${response.status})`);
  }

  return (await response.json()) as RazorpayCreateSubscriptionResponse;
}

async function createRazorpayTopUpPaymentLink(
  user: UserProfile,
  requestId: string
): Promise<RazorpayCreatePaymentLinkResponse> {
  if (!config.razorpayKeyId || !config.razorpayKeySecret) {
    throw new Error('Razorpay payment link configuration is incomplete');
  }

  const referenceId = `topup_${randomUUID().replace(/-/g, '').slice(0, 24)}`;
  const payload: Record<string, unknown> = {
    amount: TOP_UP_PRICE_INR_SUBUNITS,
    currency: 'INR',
    accept_partial: false,
    reference_id: referenceId,
    description: 'Sabapplier 10-credit cycle top-up',
    reminder_enable: false,
    notes: {
      user_id: user.userId,
      purchase_type: 'top_up_10',
      credits: String(TOP_UP_CREDITS),
      user_email: user.email,
    },
  };

  const email = normalizeEmail(user.email);
  const phone = normalizePhone(user.phone);
  if (email || phone || user.fullName) {
    payload.customer = {
      ...(user.fullName ? { name: user.fullName } : {}),
      ...(email ? { email } : {}),
      ...(phone ? { contact: phone } : {}),
    };
  }

  const response = await fetch(`${RAZORPAY_API_BASE_URL}/payment_links`, {
    method: 'POST',
    headers: {
      Authorization: createRazorpayAuthHeader(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const detail = await response.text();
    logError('Razorpay payment link creation failed', detail, { requestId, status: response.status });
    throw new Error(`Failed to create Razorpay payment link (${response.status})`);
  }

  return (await response.json()) as RazorpayCreatePaymentLinkResponse;
}

async function fetchRazorpaySubscription(
  subscriptionId: string,
  requestId: string
): Promise<RazorpayCreateSubscriptionResponse> {
  if (!config.razorpayKeyId || !config.razorpayKeySecret) {
    throw new Error('Razorpay subscription fetch configuration is incomplete');
  }

  const response = await fetch(`${RAZORPAY_API_BASE_URL}/subscriptions/${subscriptionId}`, {
    method: 'GET',
    headers: {
      Authorization: createRazorpayAuthHeader(),
    },
  });

  if (!response.ok) {
    const detail = await response.text();
    logError('Razorpay subscription fetch failed', detail, { requestId, status: response.status, subscriptionId });
    throw new Error(`Failed to fetch Razorpay subscription (${response.status})`);
  }

  return (await response.json()) as RazorpayCreateSubscriptionResponse;
}

function hasActiveMonthlySubscription(user: UserProfile): boolean {
  if (!user.subscriptionStatus || !ACTIVE_SUBSCRIPTION_STATUSES.has(user.subscriptionStatus)) {
    return false;
  }

  const cycleEnd = user.subscriptionCurrentEnd || user.creditPlanExpiresAt;
  if (cycleEnd) {
    return new Date(cycleEnd).getTime() > Date.now();
  }

  return user.creditPlan === 'monthly_100';
}

function getCreditPlanForSubscriptionStatus(status?: RazorpaySubscriptionStatus): 'free' | 'monthly_100' {
  return status && ACTIVE_SUBSCRIPTION_STATUSES.has(status) ? 'monthly_100' : 'free';
}

function getValidPurchasedCredits(user: UserProfile): number {
  const purchasedCredits = Math.max(0, Number(user.purchasedCredits) || 0);
  if (!purchasedCredits || !user.purchasedCreditsExpiresAt) {
    return 0;
  }

  const expiresAt = new Date(user.purchasedCreditsExpiresAt).getTime();
  if (Number.isNaN(expiresAt) || expiresAt <= Date.now()) {
    return 0;
  }

  return purchasedCredits;
}

function shouldResetPurchasedCredits(user: UserProfile, nextCycleStart?: string): boolean {
  if (!user.purchasedCredits || !user.purchasedCreditsExpiresAt || !nextCycleStart) {
    return false;
  }

  const expiresAt = new Date(user.purchasedCreditsExpiresAt).getTime();
  const cycleStart = new Date(nextCycleStart).getTime();
  return !Number.isNaN(expiresAt) && !Number.isNaN(cycleStart) && expiresAt <= cycleStart;
}

async function calculateRemainingCreditsForUser(user: UserProfile): Promise<number> {
  const summary = await getActivitySummary(user.userId, user);
  const hasMonthlyPlan = hasActiveMonthlySubscription(user);
  const baseCredits = hasMonthlyPlan
    ? MONTHLY_PLAN_CREDITS
    : Math.max(0, Number(user.freeCreditsAwarded) || FREE_CREDITS_FOR_NEW_USERS);
  const purchasedCredits = getValidPurchasedCredits(user);
  const usedCredits = Math.max(
    0,
    hasMonthlyPlan ? summary.creditsCurrentCycle ?? summary.creditsThisMonth ?? 0 : summary.totalCreditsUsed || 0
  );

  return Math.max(0, Number((baseCredits + purchasedCredits - usedCredits).toFixed(2)));
}

async function findUserForSubscriptionWebhook(
  subscription: RazorpaySubscriptionEntity,
  payment?: RazorpayPaymentEntity
): Promise<UserProfile | null> {
  const notes = getRazorpayNotes(subscription.notes);

  if (notes.user_id) {
    const user = await getUser(notes.user_id);
    if (user) return user;
  }

  if (subscription.id) {
    const user = await getUserByRazorpaySubscriptionId(subscription.id);
    if (user) return user;
  }

  const paymentNotes = getRazorpayNotes(payment?.notes);
  if (paymentNotes.user_id) {
    const user = await getUser(paymentNotes.user_id);
    if (user) return user;
  }

  const email = normalizeEmail(payment?.email) || normalizeEmail(notes.user_email);
  if (email) {
    return getUserByEmail(email);
  }

  return null;
}

type TopUpWebhookResult =
  | { outcome: 'ignored'; reason: string }
  | { outcome: 'duplicate'; userId: string }
  | { outcome: 'applied'; userId: string };

async function applyTopUpPurchaseFromWebhook(
  payment: RazorpayPaymentEntity,
  eventId: string | undefined,
  requestId: string
): Promise<TopUpWebhookResult> {
  const paymentId = payment.id;
  const notes = getRazorpayNotes(payment.notes);
  const email = normalizeEmail(payment.email) || normalizeEmail(notes.user_email);

  if (!paymentId) {
    return { outcome: 'ignored', reason: 'missing_payment_id' };
  }

  const user = notes.user_id ? await getUser(notes.user_id) : email ? await getUserByEmail(email) : null;
  if (!user) {
    logWarn('Razorpay top-up webhook user not found', { requestId, email, paymentId });
    return { outcome: 'ignored', reason: 'user_not_found' };
  }

  if (hasProcessedRazorpayEvent(user, eventId, paymentId)) {
    return { outcome: 'duplicate', userId: user.userId };
  }

  if (user.pendingCreditPurchaseType !== 'top_up_10') {
    logWarn('Razorpay payment captured without top-up intent', {
      requestId,
      userId: user.userId,
      paymentId,
      purchaseType: user.pendingCreditPurchaseType,
    });
    return { outcome: 'ignored', reason: 'missing_top_up_intent' };
  }

  const topUpExpiresAt = user.subscriptionCurrentEnd || user.creditPlanExpiresAt;
  if (!hasActiveMonthlySubscription(user) || !topUpExpiresAt) {
    return { outcome: 'ignored', reason: 'inactive_monthly_cycle' };
  }

  await patchUser(user.userId, {
    purchasedCredits: getValidPurchasedCredits(user) + TOP_UP_CREDITS,
    purchasedCreditsExpiresAt: topUpExpiresAt,
    pendingCreditPurchaseType: undefined,
    pendingCreditPurchaseCreatedAt: undefined,
    processedRazorpayPaymentIds: appendProcessedRazorpayId(user.processedRazorpayPaymentIds, paymentId),
    processedRazorpayEventIds: appendProcessedRazorpayId(user.processedRazorpayEventIds, eventId),
  });

  return { outcome: 'applied', userId: user.userId };
}

type SubscriptionWebhookResult =
  | { outcome: 'ignored'; reason: string }
  | { outcome: 'duplicate'; userId: string }
  | { outcome: 'applied'; userId: string; status: RazorpaySubscriptionStatus | undefined };

async function applySubscriptionWebhook(
  eventName: string,
  subscription: RazorpaySubscriptionEntity,
  payment: RazorpayPaymentEntity | undefined,
  eventId: string | undefined,
  requestId: string
): Promise<SubscriptionWebhookResult> {
  if (!subscription.id) {
    return { outcome: 'ignored', reason: 'missing_subscription_id' };
  }

  const user = await findUserForSubscriptionWebhook(subscription, payment);
  if (!user) {
    logWarn('Razorpay subscription webhook user not found', {
      requestId,
      subscriptionId: subscription.id,
      eventName,
    });
    return { outcome: 'ignored', reason: 'user_not_found' };
  }

  if (hasProcessedRazorpayEvent(user, eventId, payment?.id)) {
    return { outcome: 'duplicate', userId: user.userId };
  }

  const nextStatus = subscription.status;
  const nextCurrentStart = toIsoFromUnixTimestamp(subscription.current_start) ?? user.subscriptionCurrentStart;
  const nextCurrentEnd = toIsoFromUnixTimestamp(subscription.current_end) ?? user.subscriptionCurrentEnd;
  const shouldClearPendingMonthlyIntent = user.pendingCreditPurchaseType === 'monthly_100';
  const shouldClearExpiredPurchasedCredits = shouldResetPurchasedCredits(user, nextCurrentStart);

  await patchUser(user.userId, {
    creditPlan: getCreditPlanForSubscriptionStatus(nextStatus),
    creditPlanExpiresAt: nextCurrentEnd,
    razorpaySubscriptionId: subscription.id,
    razorpaySubscriptionShortUrl: subscription.short_url ?? user.razorpaySubscriptionShortUrl,
    razorpaySubscriptionPlanId: subscription.plan_id || user.razorpaySubscriptionPlanId,
    subscriptionStatus: nextStatus,
    subscriptionCurrentStart: nextCurrentStart,
    subscriptionCurrentEnd: nextCurrentEnd,
    purchasedCredits: shouldClearExpiredPurchasedCredits ? 0 : user.purchasedCredits,
    purchasedCreditsExpiresAt: shouldClearExpiredPurchasedCredits ? undefined : user.purchasedCreditsExpiresAt,
    pendingCreditPurchaseType: shouldClearPendingMonthlyIntent ? undefined : user.pendingCreditPurchaseType,
    pendingCreditPurchaseCreatedAt: shouldClearPendingMonthlyIntent ? undefined : user.pendingCreditPurchaseCreatedAt,
    processedRazorpayPaymentIds: appendProcessedRazorpayId(user.processedRazorpayPaymentIds, payment?.id),
    processedRazorpayEventIds: appendProcessedRazorpayId(user.processedRazorpayEventIds, eventId),
  });

  return { outcome: 'applied', userId: user.userId, status: nextStatus };
}

function isRateLimited(req: IncomingMessage): boolean {
  if (!shouldRateLimit(req)) {
    return false;
  }

  const key = getRateLimitKey(req);
  const now = Date.now();
  const existing = requestBuckets.get(key);
  if (!existing || now > existing.resetAt) {
    requestBuckets.set(key, { count: 1, resetAt: now + config.rateLimitWindowMs });
    return false;
  }
  existing.count += 1;
  if (existing.count > config.rateLimitMax) return true;
  return false;
}

const server = createServer(async (req, res) => {
  const requestId = randomUUID().slice(0, 8);
  const startedAt = Date.now();
  try {
    const method = req.method || 'GET';
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    const pathname = url.pathname;
    const ip = getClientIp(req);

    logInfo('Request start', {
      requestId,
      method,
      pathname,
      ip,
      headers: req.headers
    });
    res.on('finish', () => {
      logInfo('Request end', {
        requestId,
        method,
        pathname,
        statusCode: res.statusCode,
        durationMs: Date.now() - startedAt,
      });
    });

    if (isRateLimited(req)) {
      sendJson(req, res, 429, { error: 'Too many requests' });
      return;
    }

    if (method === 'OPTIONS') {
      logInfo('Handling OPTIONS request', { requestId, pathname });
      setCorsHeaders(req, res);
      res.statusCode = 204;
      res.end();
      return;
    }

    if (method === 'GET' && pathname === '/health') {
      sendJson(req, res, 200, { ok: true });
      return;
    }

    if (method === 'POST' && pathname === '/payments/razorpay/webhook') {
      if (!config.razorpayWebhookSecret) {
        logError('Razorpay webhook secret is not configured', undefined, { requestId });
        sendJson(req, res, 503, { error: 'Webhook secret not configured' });
        return;
      }

      const signature = req.headers['x-razorpay-signature'];
      const signatureHeader = Array.isArray(signature) ? signature[0] : signature;
      const rawBody = await readRawBody(req);

      if (!verifyRazorpayWebhookSignature(rawBody.text, signatureHeader)) {
        logWarn('Invalid Razorpay webhook signature', { requestId });
        sendJson(req, res, 400, { error: 'Invalid signature' });
        return;
      }

      let payload: RazorpayWebhookPayload;
      try {
        payload = rawBody.text ? (JSON.parse(rawBody.text) as RazorpayWebhookPayload) : {};
      } catch (error) {
        logWarn('Invalid Razorpay webhook payload JSON', { requestId });
        sendJson(req, res, 400, { error: 'Invalid payload' });
        return;
      }

      const eventId = getWebhookEventId(req);
      const eventName = payload.event || 'unknown';
      const payment = payload.payload?.payment?.entity || {};
      const subscription = payload.payload?.subscription?.entity || {};

      if (eventName === 'payment.captured') {
        const result = await applyTopUpPurchaseFromWebhook(payment, eventId, requestId);

        if (result.outcome === 'applied') {
          logInfo('Razorpay top-up payment applied', {
            requestId,
            userId: result.userId,
            paymentId: payment.id,
            eventId,
          });
          sendJson(req, res, 200, { received: true, applied: true, purchaseType: 'top_up_10' });
          return;
        }

        if (result.outcome === 'duplicate') {
          sendJson(req, res, 200, { received: true, duplicate: true });
          return;
        }

        sendJson(req, res, 200, { received: true, ignored: true, reason: result.reason });
        return;
      }

      if (
        [
          'subscription.authenticated',
          'subscription.activated',
          'subscription.charged',
          'subscription.pending',
          'subscription.halted',
          'subscription.paused',
          'subscription.resumed',
          'subscription.cancelled',
          'subscription.completed',
        ].includes(eventName)
      ) {
        const result = await applySubscriptionWebhook(eventName, subscription, payment, eventId, requestId);

        if (result.outcome === 'applied') {
          logInfo('Razorpay subscription webhook applied', {
            requestId,
            userId: result.userId,
            eventName,
            eventId,
            subscriptionId: subscription.id,
            status: result.status,
          });
          sendJson(req, res, 200, { received: true, applied: true, event: eventName, status: result.status });
          return;
        }

        if (result.outcome === 'duplicate') {
          sendJson(req, res, 200, { received: true, duplicate: true });
          return;
        }

        sendJson(req, res, 200, { received: true, ignored: true, reason: result.reason, event: eventName });
        return;
      }

      sendJson(req, res, 200, { received: true, ignored: true, event: eventName });
      return;
    }

    if (method === 'GET' && pathname === '/auth/extension-auth') {
      const redirectUri = url.searchParams.get('redirect_uri');
      if (!redirectUri || !redirectUri.startsWith('chrome-extension://')) {
        sendJson(req, res, 400, { error: 'Invalid or missing redirect_uri' });
        return;
      }
      const cookies = parseCookies(req);
      const sessionToken = cookies['sabapplier_session'];
      if (!sessionToken) {
        logWarn('Missing session cookie for extension auth', { requestId, ip });
        res.writeHead(302, { Location: `${redirectUri}?error=not_logged_in` });
        res.end();
        return;
      }

      const decoded = verifyJwt(sessionToken);
      if (!decoded || (decoded.scope && decoded.scope !== 'web')) {
        logWarn('Invalid session token for extension auth', { requestId });
        res.writeHead(302, { Location: `${redirectUri}?error=invalid_session` });
        res.end();
        return;
      }

      const extensionToken = issueJwt(
        { userId: decoded.userId, email: decoded.email, scope: 'extension' },
        30 * 60 // 30 minutes
      );

      res.writeHead(302, { Location: `${redirectUri}?token=${extensionToken}` });
      res.end();
      return;
    }

    if (method === 'POST' && pathname === '/auth/extension-token/refresh') {
      const cookies = parseCookies(req);
      const sessionToken = cookies['sabapplier_session'];
      if (!sessionToken) {
        sendJson(req, res, 401, { error: 'No session cookie' });
        return;
      }

      const decoded = verifyJwt(sessionToken);
      if (!decoded || (decoded.scope && decoded.scope !== 'web')) {
        sendJson(req, res, 401, { error: 'Invalid session cookie' });
        return;
      }

      const extensionToken = issueJwt(
        { userId: decoded.userId, email: decoded.email, scope: 'extension' },
        30 * 60 // 30 minutes
      );

      sendJson(req, res, 200, { token: extensionToken });
      return;
    }

    if (method === 'GET' && pathname === '/auth/session') {
      const cookies = parseCookies(req);
      const sessionToken = cookies['sabapplier_session'];
      if (!sessionToken) {
        sendJson(req, res, 401, { error: 'No session cookie' });
        return;
      }

      const decoded = verifyJwt(sessionToken);
      if (!decoded || (decoded.scope && decoded.scope !== 'web')) {
        sendJson(req, res, 401, { error: 'Invalid session cookie' });
        return;
      }

      const user = await getUser(decoded.userId);
      if (!user) {
        sendJson(req, res, 404, { error: 'User profile not found' });
        return;
      }

      sendJson(req, res, 200, { token: sessionToken, user });
      return;
    }

    if (method === 'POST' && pathname === '/auth/logout') {
      res.setHeader(
        'Set-Cookie',
        [
          'sabapplier_session=',
          'Path=/',
          'HttpOnly',
          'SameSite=None',
          'Secure',
          'Max-Age=0'
        ].join('; ')
      );
      sendJson(req, res, 200, { success: true });
      return;
    }

    if (method === 'POST' && (pathname === '/auth/google' || pathname === '/auth/google/code')) {
      const body = await readJsonBody(req, requestId);
      const parsed = authGoogleSchema.safeParse(body);
      if (!parsed.success) {
        logWarn('Validation failed for /auth/google', {
          requestId,
          errors: parsed.error.flatten(),
          bodyKeys: body && typeof body === 'object' ? Object.keys(body) : [],
        });
        sendJson(req, res, 400, { error: parsed.error.flatten() });
        return;
      }
      const { credential, code } = parsed.data;

      const googleUser = code
        ? await exchangeCodeForGoogleIdentity(code)
        : await verifyGoogleCredential(credential as string);
      const now = new Date().toISOString();
      const existing = await getUserByGoogleId(googleUser.sub);
      const user: UserProfile = existing || {
        userId: randomUUID(),
        googleId: googleUser.sub,
        email: googleUser.email,
        fullName: googleUser.name,
        avatarUrl: googleUser.picture,
        creditPlan: 'free',
        purchasedCredits: 0,
        freeCreditsAwarded: 15,
        onboardingComplete: false,
        onboardingStep: 1,
        professions: [],
        coFounders: [],
        documents: {},
        createdAt: now,
        updatedAt: now,
      };

      if (!existing) {
        await upsertUser(user);
      } else {
        await patchUser(existing.userId, {
          email: googleUser.email,
          fullName: googleUser.name,
          avatarUrl: googleUser.picture,
        });
      }

      const token = issueJwt({ userId: user.userId, email: user.email, scope: 'web' });

      const cookieOpts = [
        `sabapplier_session=${token}`,
        'Path=/',
        'HttpOnly',
        'SameSite=None',
        'Secure',
        'Max-Age=' + (7 * 24 * 60 * 60)
      ];
      res.setHeader('Set-Cookie', cookieOpts.join('; '));

      const latest = await getUser(user.userId);
      sendJson(req, res, 200, { token, user: latest || user });
      return;
    }

    if (method === 'POST' && pathname === '/payments/checkout-intent') {
      const auth = readAuth(req, ['web']);
      if (!auth) {
        sendJson(req, res, 401, { error: 'Missing or invalid token' });
        return;
      }

      const body = await readJsonBody(req, requestId);
      const parsed = checkoutIntentSchema.safeParse(body || {});
      if (!parsed.success) {
        logWarn('Validation failed for /payments/checkout-intent', {
          requestId,
          errors: parsed.error.flatten(),
        });
        sendJson(req, res, 400, { error: parsed.error.flatten() });
        return;
      }

      const purchaseType = parsed.data.purchaseType;
      if (purchaseType !== 'top_up_10') {
        sendJson(req, res, 400, { error: 'Monthly billing now uses Razorpay subscriptions' });
        return;
      }
      const user = await patchUser(auth.userId, {
        pendingCreditPurchaseType: purchaseType,
        pendingCreditPurchaseCreatedAt: new Date().toISOString(),
      });

      if (!user) {
        sendJson(req, res, 404, { error: 'User profile not found' });
        return;
      }

      sendJson(req, res, 200, { ok: true, user, purchaseType });
      return;
    }

    if (method === 'POST' && pathname === '/payments/top-ups/10') {
      const auth = readAuth(req, ['web']);
      if (!auth) {
        sendJson(req, res, 401, { error: 'Missing or invalid token' });
        return;
      }

      if (!config.razorpayKeyId || !config.razorpayKeySecret) {
        sendJson(req, res, 503, { error: 'Razorpay top-up config is incomplete' });
        return;
      }

      const user = await getUser(auth.userId);
      if (!user) {
        sendJson(req, res, 404, { error: 'User profile not found' });
        return;
      }

      if (!hasActiveMonthlySubscription(user)) {
        sendJson(req, res, 409, { error: 'Top-ups are available only after an active monthly subscription is running.' });
        return;
      }

      const remainingCredits = await calculateRemainingCreditsForUser(user);
      if (remainingCredits > 0) {
        sendJson(req, res, 409, {
          error: 'Top-up is available only after your current monthly credits are fully used.',
          remainingCredits,
        });
        return;
      }

      const paymentLink = await createRazorpayTopUpPaymentLink(user, requestId);
      const updatedUser = await patchUser(user.userId, {
        pendingCreditPurchaseType: 'top_up_10',
        pendingCreditPurchaseCreatedAt: new Date().toISOString(),
      });

      sendJson(req, res, 200, {
        ok: true,
        user: updatedUser || user,
        paymentLinkId: paymentLink.id,
        shortUrl: paymentLink.short_url,
        status: paymentLink.status,
        referenceId: paymentLink.reference_id,
      });
      return;
    }

    if (method === 'POST' && pathname === '/payments/subscriptions/sync') {
      const auth = readAuth(req, ['web']);
      if (!auth) {
        sendJson(req, res, 401, { error: 'Missing or invalid token' });
        return;
      }

      if (!config.razorpayKeyId || !config.razorpayKeySecret) {
        sendJson(req, res, 503, { error: 'Razorpay subscription config is incomplete' });
        return;
      }

      const user = await getUser(auth.userId);
      if (!user) {
        sendJson(req, res, 404, { error: 'User profile not found' });
        return;
      }

      if (!user.razorpaySubscriptionId) {
        sendJson(req, res, 200, { ok: true, user, synced: false });
        return;
      }

      const subscription = await fetchRazorpaySubscription(user.razorpaySubscriptionId, requestId);
      const nextStatus = subscription.status ?? user.subscriptionStatus;
      const nextCurrentStart = toIsoFromUnixTimestamp(subscription.current_start) ?? user.subscriptionCurrentStart;
      const nextCurrentEnd = toIsoFromUnixTimestamp(subscription.current_end) ?? user.subscriptionCurrentEnd;
      const shouldClearPendingMonthlyIntent =
        user.pendingCreditPurchaseType === 'monthly_100' && nextStatus !== 'created';
      const shouldClearExpiredPurchasedCredits = shouldResetPurchasedCredits(user, nextCurrentStart);

      const updatedUser = await patchUser(user.userId, {
        creditPlan: getCreditPlanForSubscriptionStatus(nextStatus),
        creditPlanExpiresAt: nextCurrentEnd,
        razorpaySubscriptionId: subscription.id || user.razorpaySubscriptionId,
        razorpaySubscriptionShortUrl: subscription.short_url ?? user.razorpaySubscriptionShortUrl,
        razorpaySubscriptionPlanId: subscription.plan_id || user.razorpaySubscriptionPlanId,
        subscriptionStatus: nextStatus,
        subscriptionCurrentStart: nextCurrentStart,
        subscriptionCurrentEnd: nextCurrentEnd,
        purchasedCredits: shouldClearExpiredPurchasedCredits ? 0 : user.purchasedCredits,
        purchasedCreditsExpiresAt: shouldClearExpiredPurchasedCredits ? undefined : user.purchasedCreditsExpiresAt,
        pendingCreditPurchaseType: shouldClearPendingMonthlyIntent ? undefined : user.pendingCreditPurchaseType,
        pendingCreditPurchaseCreatedAt: shouldClearPendingMonthlyIntent ? undefined : user.pendingCreditPurchaseCreatedAt,
      });

      sendJson(req, res, 200, {
        ok: true,
        user: updatedUser || user,
        synced: true,
        status: nextStatus,
      });
      return;
    }

    if (method === 'POST' && pathname === '/payments/subscriptions/monthly') {
      const auth = readAuth(req, ['web']);
      if (!auth) {
        sendJson(req, res, 401, { error: 'Missing or invalid token' });
        return;
      }

      if (!config.razorpayKeyId || !config.razorpayKeySecret || !config.razorpayMonthlyPlanId) {
        sendJson(req, res, 503, { error: 'Razorpay subscription config is incomplete' });
        return;
      }

      const user = await getUser(auth.userId);
      if (!user) {
        sendJson(req, res, 404, { error: 'User profile not found' });
        return;
      }

      const isCurrentSubscriptionActive =
        Boolean(user.subscriptionStatus && ACTIVE_SUBSCRIPTION_STATUSES.has(user.subscriptionStatus)) &&
        Boolean(user.subscriptionCurrentEnd && new Date(user.subscriptionCurrentEnd).getTime() > Date.now());

      if (isCurrentSubscriptionActive) {
        sendJson(req, res, 409, { error: 'Monthly subscription is already active' });
        return;
      }

      const subscription = await createRazorpayMonthlySubscription(user, requestId);
      const updatedUser = await patchUser(user.userId, {
        pendingCreditPurchaseType: 'monthly_100',
        pendingCreditPurchaseCreatedAt: new Date().toISOString(),
        razorpaySubscriptionId: subscription.id,
        razorpaySubscriptionShortUrl: subscription.short_url ?? undefined,
        razorpaySubscriptionPlanId: subscription.plan_id || config.razorpayMonthlyPlanId,
        subscriptionStatus: subscription.status,
        subscriptionCurrentStart: toIsoFromUnixTimestamp(subscription.current_start),
        subscriptionCurrentEnd: toIsoFromUnixTimestamp(subscription.current_end),
      });

      sendJson(req, res, 200, {
        ok: true,
        user: updatedUser || user,
        subscriptionId: subscription.id,
        shortUrl: subscription.short_url,
        status: subscription.status,
      });
      return;
    }

    if (pathname === '/profile') {
      const auth = readAuth(req, ['web', 'extension']);
      if (!auth) {
        logWarn('Unauthorized /profile access', { requestId, pathname });
        sendJson(req, res, 401, { error: 'Missing or invalid token' });
        return;
      }

      if (method === 'GET') {
        const user = await getUser(auth.userId);
        if (!user) {
          sendJson(req, res, 404, { error: 'User profile not found' });
          return;
        }
        sendJson(req, res, 200, { user });
        return;
      }

      if (method === 'POST') {
        const body = await readJsonBody(req, requestId);
        const parsed = profilePatchSchema.safeParse(body || {});
        if (!parsed.success) {
          logWarn('Validation failed for /profile', {
            requestId,
            errors: parsed.error.flatten(),
            bodyKeys: body && typeof body === 'object' ? Object.keys(body) : [],
          });
          sendJson(req, res, 400, { error: parsed.error.flatten() });
          return;
        }

        const patched = await patchUser(auth.userId, parsed.data || {});
        if (!patched) {
          sendJson(req, res, 404, { error: 'User profile not found' });
          return;
        }
        sendJson(req, res, 200, { user: patched });
        return;
      }

      if (method === 'DELETE') {
        const current = await getUser(auth.userId);
        if (!current) {
          sendJson(req, res, 404, { error: 'User profile not found' });
          return;
        }

        try {
          await deleteUserStorageData(auth.userId);
        } catch (error) {
          logWarn('Failed to cleanup user storage data', { requestId, userId: auth.userId });
        }

        const deleted = await deleteUser(auth.userId);
        if (!deleted) {
          sendJson(req, res, 500, { error: 'Failed to delete account' });
          return;
        }

        sendJson(req, res, 200, { success: true });
        return;
      }
    }

    if (method === 'POST' && pathname === '/profile/onboard') {
      const auth = readAuth(req, ['web']);
      if (!auth) {
        logWarn('Unauthorized /profile/onboard access', { requestId, pathname });
        sendJson(req, res, 401, { error: 'Missing or invalid token' });
        return;
      }

      const body = await readJsonBody(req, requestId);
      const parsed = onboardSchema.safeParse(body || {});
      if (!parsed.success) {
        logWarn('Validation failed for /profile/onboard', {
          requestId,
          errors: parsed.error.flatten(),
          bodyKeys: body && typeof body === 'object' ? Object.keys(body) : [],
        });
        sendJson(req, res, 400, { error: parsed.error.flatten() });
        return;
      }
      const step = parsed.data.step;
      const pageData = parsed.data.pageData as Partial<UserProfile>;
      const current = await getUser(auth.userId);
      if (!current) {
        sendJson(req, res, 404, { error: 'User profile not found' });
        return;
      }

      const mergedStep = Math.max(current.onboardingStep || 1, step);
      const merged = await patchUser(auth.userId, {
        ...pageData,
        onboardingStep: mergedStep,
        onboardingComplete: parsed.data.onboardingComplete ?? current.onboardingComplete,
      });

      sendJson(req, res, 200, { user: merged });
      return;
    }

    if (method === 'GET' && pathname === '/activity/sessions') {
      const auth = readAuth(req, ['web', 'extension']);
      if (!auth) {
        logWarn('Unauthorized /activity/sessions access', { requestId, pathname });
        sendJson(req, res, 401, { error: 'Missing or invalid token' });
        return;
      }

      const user = await getUser(auth.userId);
      const activity = await listActivitySessions(
        auth.userId,
        {
          search: url.searchParams.get('search') || undefined,
          status: (url.searchParams.get('status') as 'submitted' | 'abandoned' | 'in_progress' | null) || undefined,
          examCategory: url.searchParams.get('examCategory') || undefined,
          modelName: url.searchParams.get('modelName') || undefined,
          dateFrom: url.searchParams.get('dateFrom') || undefined,
          dateTo: url.searchParams.get('dateTo') || undefined,
          page: parsePositiveInteger(url.searchParams.get('page'), 1),
          pageSize: parsePositiveInteger(url.searchParams.get('pageSize'), 20),
        },
        user
      );

      sendJson(req, res, 200, activity);
      return;
    }

    if (method === 'GET' && pathname.startsWith('/activity/sessions/')) {
      const auth = readAuth(req, ['web', 'extension']);
      if (!auth) {
        logWarn('Unauthorized /activity/sessions/:id access', { requestId, pathname });
        sendJson(req, res, 401, { error: 'Missing or invalid token' });
        return;
      }

      const sessionId = pathname.slice('/activity/sessions/'.length);
      const session = await getFormSession(auth.userId, sessionId);
      if (!session) {
        sendJson(req, res, 404, { error: 'Session not found' });
        return;
      }

      const creditEvents = await listCreditEvents(auth.userId, sessionId);
      sendJson(req, res, 200, { session, creditEvents });
      return;
    }

    if (method === 'GET' && pathname === '/activity/document-events') {
      const auth = readAuth(req, ['web', 'extension']);
      if (!auth) {
        logWarn('Unauthorized /activity/document-events access', { requestId, pathname });
        sendJson(req, res, 401, { error: 'Missing or invalid token' });
        return;
      }

      const user = await getUser(auth.userId);
      const events = await listDocumentCreditEvents(auth.userId, user);
      sendJson(req, res, 200, { events });
      return;
    }

    if (method === 'POST' && pathname === '/activity/sessions') {
      const auth = readAuth(req, ['web', 'extension']);
      if (!auth) {
        logWarn('Unauthorized /activity/sessions create access', { requestId, pathname });
        sendJson(req, res, 401, { error: 'Missing or invalid token' });
        return;
      }

      const body = await readJsonBody(req, requestId);
      const parsed = createFormSessionSchema.safeParse(body || {});
      if (!parsed.success) {
        logWarn('Validation failed for /activity/sessions', {
          requestId,
          errors: parsed.error.flatten(),
          bodyKeys: body && typeof body === 'object' ? Object.keys(body) : [],
        });
        sendJson(req, res, 400, { error: parsed.error.flatten() });
        return;
      }

      const session = await createFormSession({
        userId: auth.userId,
        ...parsed.data,
      });

      sendJson(req, res, 201, { session });
      return;
    }

    if (method === 'POST' && pathname === '/activity/credit-events') {
      const auth = readAuth(req, ['web', 'extension']);
      if (!auth) {
        logWarn('Unauthorized /activity/credit-events access', { requestId, pathname });
        sendJson(req, res, 401, { error: 'Missing or invalid token' });
        return;
      }

      const body = await readJsonBody(req, requestId);
      const parsed = createCreditEventSchema.safeParse(body || {});
      if (!parsed.success) {
        logWarn('Validation failed for /activity/credit-events', {
          requestId,
          errors: parsed.error.flatten(),
          bodyKeys: body && typeof body === 'object' ? Object.keys(body) : [],
        });
        sendJson(req, res, 400, { error: parsed.error.flatten() });
        return;
      }

      const event = await createCreditEvent({
        userId: auth.userId,
        ...parsed.data,
      });

      sendJson(req, res, 201, { event });
      return;
    }

    if (method === 'POST' && pathname === '/vault/process') {
      const auth = readAuth(req, ['web', 'extension']);
      if (!auth) {
        logWarn('Unauthorized /vault/process access', { requestId, pathname });
        sendJson(req, res, 401, { error: 'Missing or invalid token' });
        return;
      }

      const body = await readJsonBody(req, requestId);
      const parsed = processVaultSchema.safeParse(body || {});
      if (!parsed.success) {
        logWarn('Validation failed for /vault/process', {
          requestId,
          errors: parsed.error.flatten(),
          bodyKeys: body && typeof body === 'object' ? Object.keys(body) : [],
        });
        sendJson(req, res, 400, { error: parsed.error.flatten() });
        return;
      }
      const { docType, fileUrl, storagePath, mimeType } = parsed.data;

      const current = await getUser(auth.userId);
      if (!current) {
        sendJson(req, res, 404, { error: 'User profile not found' });
        return;
      }

      const isDeveloper = current.email === 'jithusoe@gmail.com' || current.email === 'sabapplierai100m@gmail.com' || current.email === 'palanirudh82994@gmail.com';

      try {
        const extraction = await runDocumentExtraction(fileUrl, docType, mimeType || 'application/pdf', requestId, isDeveloper);
        const extractedData = extraction.extractedData;
        const now = new Date().toISOString();
        const inputTokens = Math.max(0, Number(extraction.usage?.inputTokens) || 0);
        const outputTokens = Math.max(0, Number(extraction.usage?.outputTokens) || 0);
        const totalTokens =
          Math.max(0, Number(extraction.usage?.totalTokens) || 0) || inputTokens + outputTokens;
        const doc: UserDocument = {
          fileUrl,
          storagePath,
          extractedData,
          status: 'verified',
          uploadedAt: current.documents?.[docType]?.uploadedAt || now,
          processedAt: now,
        };

        const updated = await patchUser(auth.userId, {
          documents: {
            ...current.documents,
            [docType]: doc,
          },
        });

        const event = await createCreditEvent({
          userId: auth.userId,
          eventType: 'doc_upload_extract',
          agentName: 'document_extractor',
          modelName: DEFAULT_AI_MODEL,
          inputTokens,
          outputTokens,
          totalTokens,
          createdAt: now,
          metadata: {
            docType,
            fileUrl,
            storagePath,
            mimeType: mimeType || 'application/pdf',
            status: 'verified',
            usageSource: extraction.usage ? 'provider' : 'missing_provider_usage',
            providerUsage: extraction.usage || null,
          },
        });

        sendJson(req, res, 200, { document: doc, user: updated });
        return;
      } catch (error) {
        logError('Vault processing failed', error, { requestId, docType });
        const now = new Date().toISOString();
        const inputTokens = 0;
        const failed: UserDocument = {
          fileUrl,
          storagePath,
          extractedData: null,
          status: 'rejected',
          uploadedAt: current.documents?.[docType]?.uploadedAt || now,
          processedAt: now,
          error: 'processing_failed',
        };

        const updated = await patchUser(auth.userId, {
          documents: {
            ...current.documents,
            [docType]: failed,
          },
        });

        const event = await createCreditEvent({
          userId: auth.userId,
          eventType: 'doc_upload_extract',
          agentName: 'document_extractor',
          modelName: DEFAULT_AI_MODEL,
          inputTokens,
          outputTokens: 0,
          totalTokens: 0,
          createdAt: now,
          metadata: {
            docType,
            fileUrl,
            storagePath,
            mimeType: mimeType || 'application/pdf',
            status: 'rejected',
            error: error instanceof Error ? error.message : 'processing_failed',
            usageSource: 'unavailable',
          },
        });

        sendJson(req, res, 500, { error: 'Processing failed', user: updated });
        return;
      }
    }

    if (method === 'POST' && pathname === '/vault/upload') {
      const auth = readAuth(req, ['web', 'extension']);
      if (!auth) {
        logWarn('Unauthorized /vault/upload access', { requestId, pathname });
        sendJson(req, res, 401, { error: 'Missing or invalid token' });
        return;
      }

      const body = await readJsonBody(req, requestId);
      const parsed = uploadVaultSchema.safeParse(body || {});
      if (!parsed.success) {
        logWarn('Validation failed for /vault/upload', {
          requestId,
          errors: parsed.error.flatten(),
          bodyKeys: body && typeof body === 'object' ? Object.keys(body) : [],
        });
        sendJson(req, res, 400, { error: parsed.error.flatten() });
        return;
      }

      const { docType, fileName, mimeType, dataUri } = parsed.data;
      const current = await getUser(auth.userId);
      if (!current) {
        sendJson(req, res, 404, { error: 'User profile not found' });
        return;
      }

      try {
        const fileBuffer = decodeDataUri(dataUri);
        const uploaded = await uploadToFirebaseStorage({
          userId: auth.userId,
          docType,
          fileName,
          mimeType,
          fileBuffer,
        });

        const now = new Date().toISOString();
        const updated = await patchUser(auth.userId, {
          documents: {
            ...current.documents,
            [docType]: {
              fileUrl: uploaded.fileUrl,
              storagePath: uploaded.storagePath,
              extractedData: current.documents?.[docType]?.extractedData || null,
              status: 'processing',
              uploadedAt: now,
              processedAt: current.documents?.[docType]?.processedAt,
              error: undefined,
            },
          },
        });

        sendJson(req, res, 200, {
          fileUrl: uploaded.fileUrl,
          storagePath: uploaded.storagePath,
          user: updated,
        });
        return;
      } catch (error) {
        logError('Upload to Firebase Storage failed', error, { requestId, docType });
        const detail = error instanceof Error ? error.message : 'Unknown upload error';
        sendJson(req, res, 500, {
          error: 'Upload failed',
          detail: process.env.NODE_ENV === 'production' ? undefined : detail,
        });
        return;
      }
    }

    sendJson(req, res, 404, { error: 'Not found' });
  } catch (error) {
    logError('Unhandled server error', error, { requestId });
    sendJson(req, res, 500, { error: 'Internal server error' });
  }
});

async function start(): Promise<void> {
  await initDb();
  server.listen(config.port, () => {
    logInfo(`Sabapplier backend listening on http://localhost:${config.port}`);
  });
}

start().catch((error) => {
  logError('Failed to start backend', error);
  process.exit(1);
});
