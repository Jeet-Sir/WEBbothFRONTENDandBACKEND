"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.estimateTokenCount = estimateTokenCount;
exports.calculateCreditsUsed = calculateCreditsUsed;
exports.createCreditEvent = createCreditEvent;
exports.createFormSession = createFormSession;
exports.getActivitySummary = getActivitySummary;
exports.listActivitySessions = listActivitySessions;
exports.getFormSession = getFormSession;
exports.listCreditEvents = listCreditEvents;
exports.listDocumentCreditEvents = listDocumentCreditEvents;
const node_crypto_1 = require("node:crypto");
const mongodb_1 = require("mongodb");
const config_1 = require("./config");
const MODEL_CREDIT_RATES = {
    'googleai/gemini-2.5-flash': 0.18,
    'gpt-4o-mini': 0.24,
    'gpt-4o': 0.42,
    'claude-3-5-sonnet': 0.48,
    'claude-3.5-sonnet': 0.48,
};
const DEFAULT_CREDITS_PER_1K_TOKENS = 0.2;
const USD_TO_INR = 94.8;
const PRICE_MARGIN_MULTIPLIER = 2;
const MONTHLY_PLAN_PRICE_INR = 155;
const MONTHLY_PLAN_CREDITS = 100;
const INR_PER_APP_CREDIT = MONTHLY_PLAN_PRICE_INR / MONTHLY_PLAN_CREDITS;
const MODEL_TOKEN_PRICING_USD_PER_MILLION = {
    'googleai/gemini-2.5-flash': {
        input: 0.3,
        output: 2.5,
    },
};
let mongoClientPromise = null;
let indexesReadyPromise = null;
function assertMongoConfigured() {
    if (!config_1.config.mongoUri) {
        throw new Error('MONGODB_URI is required for activity tracking');
    }
}
async function getMongoClient() {
    assertMongoConfigured();
    if (!mongoClientPromise) {
        const client = new mongodb_1.MongoClient(config_1.config.mongoUri);
        mongoClientPromise = client.connect();
    }
    return mongoClientPromise;
}
async function ensureIndexes() {
    if (!indexesReadyPromise) {
        indexesReadyPromise = (async () => {
            const client = await getMongoClient();
            const db = client.db(config_1.config.mongoDbName);
            const creditEvents = db.collection('creditEvents');
            const formSessions = db.collection('formSessions');
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
    const db = client.db(config_1.config.mongoDbName);
    return {
        creditEvents: db.collection('creditEvents'),
        formSessions: db.collection('formSessions'),
    };
}
function normalizeTokenPair(inputTokens = 0, outputTokens = 0, totalTokens) {
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
function getBillingPeriod(dateIso) {
    const date = new Date(dateIso);
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1)).toISOString().slice(0, 10);
}
function getSubscriptionCycleRange(userProfile) {
    const start = userProfile?.subscriptionCurrentStart ? new Date(userProfile.subscriptionCurrentStart) : null;
    const end = userProfile?.subscriptionCurrentEnd ? new Date(userProfile.subscriptionCurrentEnd) : null;
    if (!start || !end || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start >= end) {
        return null;
    }
    return { start, end };
}
function roundCredits(value) {
    return Number(Number(value || 0).toFixed(4));
}
function roundPrice(value) {
    return Number(Number(value || 0).toFixed(6));
}
function calculateUsdChargeFromTokens(inputTokens, totalTokens, modelName) {
    const rates = MODEL_TOKEN_PRICING_USD_PER_MILLION[modelName];
    if (!rates) {
        return undefined;
    }
    const safeInputTokens = Math.max(0, Math.round(inputTokens));
    const safeTotalTokens = Math.max(0, Math.round(totalTokens));
    const billableOutputTokens = Math.max(0, safeTotalTokens - safeInputTokens);
    const baseCostUsd = (safeInputTokens / 1_000_000) * rates.input + (billableOutputTokens / 1_000_000) * rates.output;
    return baseCostUsd * PRICE_MARGIN_MULTIPLIER;
}
function calculatePriceFromTokens(inputTokens, totalTokens, modelName) {
    const finalCostUsd = calculateUsdChargeFromTokens(inputTokens, totalTokens, modelName);
    if (finalCostUsd == null) {
        return undefined;
    }
    return {
        usd: roundPrice(finalCostUsd),
        inr: roundPrice(finalCostUsd * USD_TO_INR),
    };
}
function calculateCreditsFromPriceInr(priceInr) {
    return roundCredits(priceInr / INR_PER_APP_CREDIT);
}
function getEffectiveCreditsUsed(inputTokens, totalTokens, modelName, storedCredits) {
    const price = calculatePriceFromTokens(inputTokens, totalTokens, modelName);
    if (price) {
        return calculateCreditsFromPriceInr(price.inr);
    }
    return roundCredits(storedCredits ?? calculateCreditsUsed(totalTokens, modelName, inputTokens));
}
function sumPrices(values) {
    const definedValues = values.filter((value) => Boolean(value));
    if (definedValues.length === 0 || definedValues.length !== values.length) {
        return undefined;
    }
    return {
        usd: roundPrice(definedValues.reduce((sum, value) => sum + value.usd, 0)),
        inr: roundPrice(definedValues.reduce((sum, value) => sum + value.inr, 0)),
    };
}
function estimateTokenCount(value) {
    if (value == null)
        return 0;
    const text = typeof value === 'string'
        ? value
        : JSON.stringify(value, (_key, nestedValue) => (typeof nestedValue === 'bigint' ? nestedValue.toString() : nestedValue));
    if (!text)
        return 0;
    return Math.max(1, Math.ceil(text.length / 4));
}
function calculateCreditsUsed(totalTokens, modelName, inputTokens = 0) {
    const price = calculatePriceFromTokens(inputTokens, totalTokens, modelName);
    if (price != null) {
        return calculateCreditsFromPriceInr(price.inr);
    }
    const rate = MODEL_CREDIT_RATES[modelName] ?? DEFAULT_CREDITS_PER_1K_TOKENS;
    return roundCredits((Math.max(0, totalTokens) / 1000) * rate);
}
function normalizeAgentLog(input) {
    const tokenCounts = normalizeTokenPair(input.inputTokens, input.outputTokens, input.totalTokens);
    return {
        id: (0, node_crypto_1.randomUUID)(),
        agentName: input.agentName,
        modelName: input.modelName,
        inputTokens: tokenCounts.inputTokens,
        outputTokens: tokenCounts.outputTokens,
        totalTokens: tokenCounts.totalTokens,
        creditsUsed: input.creditsUsed != null
            ? roundCredits(input.creditsUsed)
            : calculateCreditsUsed(tokenCounts.totalTokens, input.modelName, tokenCounts.inputTokens),
        createdAt: new Date(input.createdAt || new Date().toISOString()),
        metadata: input.metadata,
    };
}
function normalizeDocumentUsage(input) {
    const tokenCounts = normalizeTokenPair(input.inputTokens, input.outputTokens, input.totalTokens);
    return {
        id: (0, node_crypto_1.randomUUID)(),
        documentName: input.documentName,
        eventType: input.eventType,
        modelName: input.modelName,
        inputTokens: tokenCounts.inputTokens,
        outputTokens: tokenCounts.outputTokens,
        totalTokens: tokenCounts.totalTokens,
        creditsUsed: input.creditsUsed != null
            ? roundCredits(input.creditsUsed)
            : calculateCreditsUsed(tokenCounts.totalTokens, input.modelName, tokenCounts.inputTokens),
        createdAt: new Date(input.createdAt || new Date().toISOString()),
        metadata: input.metadata,
    };
}
function duplicateKeyMatch(error, fieldName) {
    return (error instanceof Error &&
        'code' in error &&
        Number(error.code) === 11000 &&
        error.message.includes(fieldName));
}
function toPlainSession(sessionDoc) {
    if (!sessionDoc || !sessionDoc._id)
        return null;
    const agentLogs = (sessionDoc.agentLogs || []).map((agentLog) => ({
        ...agentLog,
        creditsUsed: getEffectiveCreditsUsed(agentLog.inputTokens || 0, agentLog.totalTokens || 0, agentLog.modelName, agentLog.creditsUsed),
        price: calculatePriceFromTokens(agentLog.inputTokens || 0, agentLog.totalTokens || 0, agentLog.modelName),
        createdAt: agentLog.createdAt.toISOString(),
    }));
    const documents = (sessionDoc.documents || []).map((documentUsage) => ({
        ...documentUsage,
        creditsUsed: getEffectiveCreditsUsed(documentUsage.inputTokens || 0, documentUsage.totalTokens || 0, documentUsage.modelName, documentUsage.creditsUsed),
        price: calculatePriceFromTokens(documentUsage.inputTokens || 0, documentUsage.totalTokens || 0, documentUsage.modelName),
        createdAt: documentUsage.createdAt.toISOString(),
    }));
    const plainSession = {
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
        creditsUsed: roundCredits([...agentLogs, ...documents].reduce((sum, item) => sum + item.creditsUsed, 0)),
        totalTokens: sessionDoc.totalTokens || 0,
        agentCount: sessionDoc.agentCount || 0,
        agentLogs,
        documents,
        metadata: sessionDoc.metadata,
    };
    plainSession.price = sumPrices([
        ...plainSession.agentLogs.map((agentLog) => agentLog.price),
        ...plainSession.documents.map((documentUsage) => documentUsage.price),
    ]);
    return plainSession;
}
function toPlainCreditEvent(event) {
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
        creditsUsed: getEffectiveCreditsUsed(event.inputTokens || 0, event.totalTokens || 0, event.modelName, event.creditsUsed),
        price: calculatePriceFromTokens(event.inputTokens || 0, event.totalTokens || 0, event.modelName),
        billingPeriod: event.billingPeriod,
        createdAt: event.createdAt.toISOString(),
        metadata: event.metadata,
    };
}
function escapeRegex(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
function normalizeDocumentKey(value) {
    return value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');
}
function getDocumentTypeFromStoragePath(storagePath) {
    const segments = storagePath
        .replace(/^local:\/\//, '')
        .split('/')
        .map((segment) => segment.trim())
        .filter(Boolean);
    const documentsIndex = segments.lastIndexOf('documents');
    const docType = documentsIndex >= 0 ? segments[documentsIndex + 1] : null;
    return docType ? normalizeDocumentKey(docType) : null;
}
function buildSessionMatch(userId, filters = {}) {
    const match = { userId };
    if (filters.status)
        match.status = filters.status;
    if (filters.examCategory)
        match.examCategory = filters.examCategory;
    if (filters.modelName)
        match.modelName = filters.modelName;
    if (filters.dateFrom || filters.dateTo) {
        const updatedAt = {};
        if (filters.dateFrom)
            updatedAt.$gte = new Date(`${filters.dateFrom}T00:00:00.000Z`);
        if (filters.dateTo)
            updatedAt.$lte = new Date(`${filters.dateTo}T23:59:59.999Z`);
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
async function createCreditEvent(input) {
    const { creditEvents } = await getCollections();
    const createdAt = input.createdAt || new Date().toISOString();
    const tokenCounts = normalizeTokenPair(input.inputTokens, input.outputTokens, input.totalTokens);
    const doc = {
        userId: input.userId,
        sessionId: input.sessionId ?? null,
        eventType: input.eventType,
        agentName: input.agentName,
        modelName: input.modelName,
        inputTokens: tokenCounts.inputTokens,
        outputTokens: tokenCounts.outputTokens,
        totalTokens: tokenCounts.totalTokens,
        creditsUsed: input.creditsUsed != null
            ? roundCredits(input.creditsUsed)
            : calculateCreditsUsed(tokenCounts.totalTokens, input.modelName, tokenCounts.inputTokens),
        billingPeriod: getBillingPeriod(createdAt),
        createdAt: new Date(createdAt),
        metadata: input.metadata,
    };
    try {
        const result = await creditEvents.insertOne(doc);
        return toPlainCreditEvent({ ...doc, _id: result.insertedId });
    }
    catch (error) {
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
async function createFormSession(input) {
    const { formSessions } = await getCollections();
    const startedAt = input.startedAt || new Date().toISOString();
    const updatedAt = input.updatedAt || input.submittedAt || startedAt;
    const agentLogs = (input.agentLogs || []).map(normalizeAgentLog);
    const documents = (input.documents || []).map(normalizeDocumentUsage);
    const totalTokens = [...agentLogs, ...documents].reduce((sum, item) => sum + item.totalTokens, 0);
    const creditsUsed = roundCredits([...agentLogs, ...documents].reduce((sum, item) => sum + item.creditsUsed, 0));
    const doc = {
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
        return toPlainSession({ ...doc, _id: result.insertedId });
    }
    catch (error) {
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
async function getActivitySummary(userId, userProfile) {
    const { creditEvents, formSessions } = await getCollections();
    const currentBillingPeriod = getBillingPeriod(new Date().toISOString());
    const subscriptionCycle = getSubscriptionCycleRange(userProfile);
    const docsUploaded = userProfile ? Object.keys(userProfile.documents || {}).length : 0;
    const currentCycleMatch = subscriptionCycle
        ? {
            userId,
            createdAt: {
                $gte: subscriptionCycle.start,
                $lt: subscriptionCycle.end,
            },
        }
        : { userId, billingPeriod: currentBillingPeriod };
    const [submittedAgg, allCreditEvents, monthlyCreditEvents, currentCycleCreditEvents] = await Promise.all([
        formSessions.aggregate([{ $match: { userId, status: 'submitted' } }, { $count: 'count' }]).toArray(),
        creditEvents.find({ userId }).project({ inputTokens: 1, totalTokens: 1, modelName: 1, creditsUsed: 1 }).toArray(),
        creditEvents
            .find({ userId, billingPeriod: currentBillingPeriod })
            .project({ inputTokens: 1, totalTokens: 1, modelName: 1, creditsUsed: 1 })
            .toArray(),
        creditEvents.find(currentCycleMatch).project({ inputTokens: 1, totalTokens: 1, modelName: 1, creditsUsed: 1 }).toArray(),
    ]);
    const sumCredits = (events) => roundCredits(events.reduce((sum, event) => sum +
        getEffectiveCreditsUsed(event.inputTokens || 0, event.totalTokens || 0, event.modelName || '', event.creditsUsed), 0));
    return {
        totalFormsFilled: submittedAgg[0]?.count || 0,
        totalCreditsUsed: sumCredits(allCreditEvents),
        totalPrice: sumPrices(allCreditEvents.map((event) => calculatePriceFromTokens(event.inputTokens || 0, event.totalTokens || 0, event.modelName || ''))),
        docsUploaded,
        creditsThisMonth: sumCredits(monthlyCreditEvents),
        priceThisMonth: sumPrices(monthlyCreditEvents.map((event) => calculatePriceFromTokens(event.inputTokens || 0, event.totalTokens || 0, event.modelName || ''))),
        creditsCurrentCycle: sumCredits(currentCycleCreditEvents),
        priceCurrentCycle: sumPrices(currentCycleCreditEvents.map((event) => calculatePriceFromTokens(event.inputTokens || 0, event.totalTokens || 0, event.modelName || ''))),
        currentCycleStart: subscriptionCycle?.start.toISOString(),
        currentCycleEnd: subscriptionCycle?.end.toISOString(),
    };
}
async function listActivitySessions(userId, filters = {}, userProfile) {
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
        sessions: items.map((item) => toPlainSession(item)).filter(Boolean),
        total,
        page,
        pageSize,
        hasMore: skip + pageSize < total,
        availableCategories: Array.from(new Set(allValues.map((item) => item.examCategory).filter((value) => Boolean(value)))).sort(),
        availableModels: Array.from(new Set(allValues.map((item) => item.modelName).filter((value) => Boolean(value)))).sort(),
    };
}
async function getFormSession(userId, sessionId) {
    if (!mongodb_1.ObjectId.isValid(sessionId)) {
        return null;
    }
    const { formSessions } = await getCollections();
    const session = await formSessions.findOne({ _id: new mongodb_1.ObjectId(sessionId), userId });
    return toPlainSession(session);
}
async function listCreditEvents(userId, sessionId) {
    const { creditEvents } = await getCollections();
    const query = { userId };
    if (sessionId) {
        query.sessionId = sessionId;
    }
    const events = await creditEvents.find(query).sort({ createdAt: -1 }).toArray();
    return events.map(toPlainCreditEvent);
}
async function listDocumentCreditEvents(userId, userProfile) {
    const { creditEvents } = await getCollections();
    const currentDocuments = Object.entries(userProfile?.documents || {});
    const currentDocTypes = new Set();
    const currentStoragePaths = new Set();
    currentDocuments.forEach(([documentKey, documentValue]) => {
        const normalizedKey = normalizeDocumentKey(documentKey);
        if (normalizedKey) {
            currentDocTypes.add(normalizedKey);
        }
        const storagePath = typeof documentValue?.storagePath === 'string' ? documentValue.storagePath.trim() : '';
        if (storagePath) {
            currentStoragePaths.add(storagePath);
            const docTypeFromPath = getDocumentTypeFromStoragePath(storagePath);
            if (docTypeFromPath) {
                currentDocTypes.add(docTypeFromPath);
            }
        }
    });
    const events = await creditEvents
        .find({ userId, eventType: 'doc_upload_extract' })
        .sort({ createdAt: -1 })
        .toArray();
    const seen = new Set();
    const latestEvents = events.filter((event) => {
        const metadata = event.metadata || {};
        const storagePath = typeof metadata.storagePath === 'string' ? metadata.storagePath.trim() : '';
        const docType = typeof metadata.docType === 'string' && metadata.docType.trim()
            ? normalizeDocumentKey(metadata.docType)
            : getDocumentTypeFromStoragePath(storagePath);
        if (currentDocTypes.size > 0 || currentStoragePaths.size > 0) {
            const matchesStoragePath = storagePath ? currentStoragePaths.has(storagePath) : false;
            const matchesDocType = docType ? currentDocTypes.has(docType) : false;
            if (!matchesStoragePath && !matchesDocType) {
                return false;
            }
        }
        const groupKey = storagePath || docType || String(event._id);
        if (seen.has(groupKey)) {
            return false;
        }
        seen.add(groupKey);
        return true;
    });
    return latestEvents.map(toPlainCreditEvent);
}
