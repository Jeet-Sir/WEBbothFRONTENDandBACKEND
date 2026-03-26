"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.estimateTokenCount = estimateTokenCount;
exports.calculateCreditsUsed = calculateCreditsUsed;
exports.createCreditEvent = createCreditEvent;
exports.createFormSession = createFormSession;
exports.getActivitySummary = getActivitySummary;
exports.listActivitySessions = listActivitySessions;
exports.getFormSession = getFormSession;
exports.listCreditEvents = listCreditEvents;
const node_crypto_1 = require("node:crypto");
const node_fs_1 = require("node:fs");
const node_path_1 = __importDefault(require("node:path"));
const dataDir = node_path_1.default.resolve(process.cwd(), 'data');
const activityFile = node_path_1.default.join(dataDir, 'activity.json');
const MODEL_CREDIT_RATES = {
    'googleai/gemini-2.5-flash': 0.18,
    'gpt-4o-mini': 0.24,
    'gpt-4o': 0.42,
    'claude-3-5-sonnet': 0.48,
    'claude-3.5-sonnet': 0.48,
};
const DEFAULT_CREDITS_PER_1K_TOKENS = 0.2;
async function ensureStore() {
    await node_fs_1.promises.mkdir(dataDir, { recursive: true });
    try {
        await node_fs_1.promises.access(activityFile);
    }
    catch {
        await node_fs_1.promises.writeFile(activityFile, JSON.stringify({ creditEvents: [], sessions: [] }, null, 2), 'utf8');
    }
}
async function readStore() {
    await ensureStore();
    const raw = await node_fs_1.promises.readFile(activityFile, 'utf8');
    if (!raw.trim()) {
        return { creditEvents: [], sessions: [] };
    }
    const parsed = JSON.parse(raw);
    return {
        creditEvents: Array.isArray(parsed.creditEvents) ? parsed.creditEvents : [],
        sessions: Array.isArray(parsed.sessions) ? parsed.sessions : [],
    };
}
async function writeStore(store) {
    await ensureStore();
    await node_fs_1.promises.writeFile(activityFile, JSON.stringify(store, null, 2), 'utf8');
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
function roundCredits(value) {
    return Number(value.toFixed(4));
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
function calculateCreditsUsed(totalTokens, modelName) {
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
            : calculateCreditsUsed(tokenCounts.totalTokens, input.modelName),
        createdAt: input.createdAt || new Date().toISOString(),
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
            : calculateCreditsUsed(tokenCounts.totalTokens, input.modelName),
        createdAt: input.createdAt || new Date().toISOString(),
        metadata: input.metadata,
    };
}
async function createCreditEvent(input) {
    const store = await readStore();
    const createdAt = input.createdAt || new Date().toISOString();
    const tokenCounts = normalizeTokenPair(input.inputTokens, input.outputTokens, input.totalTokens);
    const event = {
        id: (0, node_crypto_1.randomUUID)(),
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
            : calculateCreditsUsed(tokenCounts.totalTokens, input.modelName),
        billingPeriod: getBillingPeriod(createdAt),
        createdAt,
        metadata: input.metadata,
    };
    store.creditEvents.push(event);
    await writeStore(store);
    return event;
}
async function createFormSession(input) {
    const store = await readStore();
    const startedAt = input.startedAt || new Date().toISOString();
    const updatedAt = input.updatedAt || input.submittedAt || startedAt;
    const agentLogs = (input.agentLogs || []).map(normalizeAgentLog);
    const documents = (input.documents || []).map(normalizeDocumentUsage);
    const totalTokens = [...agentLogs, ...documents].reduce((sum, item) => sum + item.totalTokens, 0);
    const creditsUsed = roundCredits([...agentLogs, ...documents].reduce((sum, item) => sum + item.creditsUsed, 0));
    const session = {
        id: (0, node_crypto_1.randomUUID)(),
        userId: input.userId,
        formTitle: input.formTitle,
        websiteName: input.websiteName,
        formUrl: input.formUrl,
        examCategory: input.examCategory,
        status: input.status,
        modelName: input.modelName,
        startedAt,
        submittedAt: input.submittedAt,
        updatedAt,
        creditsUsed,
        totalTokens,
        agentCount: agentLogs.length,
        agentLogs,
        documents,
        metadata: input.metadata,
    };
    store.sessions.push(session);
    for (const agentLog of agentLogs) {
        store.creditEvents.push({
            id: (0, node_crypto_1.randomUUID)(),
            userId: input.userId,
            sessionId: session.id,
            eventType: 'form_fill_agent',
            agentName: agentLog.agentName,
            modelName: agentLog.modelName,
            inputTokens: agentLog.inputTokens,
            outputTokens: agentLog.outputTokens,
            totalTokens: agentLog.totalTokens,
            creditsUsed: agentLog.creditsUsed,
            billingPeriod: getBillingPeriod(agentLog.createdAt),
            createdAt: agentLog.createdAt,
            metadata: {
                formTitle: input.formTitle,
                formUrl: input.formUrl,
                ...(agentLog.metadata || {}),
            },
        });
    }
    for (const document of documents) {
        store.creditEvents.push({
            id: (0, node_crypto_1.randomUUID)(),
            userId: input.userId,
            sessionId: session.id,
            eventType: document.eventType,
            agentName: 'document_context',
            modelName: document.modelName,
            inputTokens: document.inputTokens,
            outputTokens: document.outputTokens,
            totalTokens: document.totalTokens,
            creditsUsed: document.creditsUsed,
            billingPeriod: getBillingPeriod(document.createdAt),
            createdAt: document.createdAt,
            metadata: {
                documentName: document.documentName,
                formTitle: input.formTitle,
                formUrl: input.formUrl,
                ...(document.metadata || {}),
            },
        });
    }
    await writeStore(store);
    return session;
}
function sortSessionsByRecency(a, b) {
    const aDate = a.submittedAt || a.updatedAt || a.startedAt;
    const bDate = b.submittedAt || b.updatedAt || b.startedAt;
    return new Date(bDate).getTime() - new Date(aDate).getTime();
}
function filterSessions(sessions, filters) {
    const normalizedSearch = filters.search?.trim().toLowerCase();
    return sessions.filter((session) => {
        if (normalizedSearch) {
            const haystack = [session.formTitle, session.websiteName, session.formUrl]
                .filter(Boolean)
                .join(' ')
                .toLowerCase();
            if (!haystack.includes(normalizedSearch)) {
                return false;
            }
        }
        if (filters.status && session.status !== filters.status) {
            return false;
        }
        if (filters.examCategory && session.examCategory !== filters.examCategory) {
            return false;
        }
        if (filters.modelName && session.modelName !== filters.modelName) {
            return false;
        }
        const sessionDate = new Date(session.submittedAt || session.updatedAt || session.startedAt);
        if (filters.dateFrom) {
            const from = new Date(`${filters.dateFrom}T00:00:00.000Z`);
            if (sessionDate.getTime() < from.getTime()) {
                return false;
            }
        }
        if (filters.dateTo) {
            const to = new Date(`${filters.dateTo}T23:59:59.999Z`);
            if (sessionDate.getTime() > to.getTime()) {
                return false;
            }
        }
        return true;
    });
}
async function getActivitySummary(userId, userProfile) {
    const store = await readStore();
    const sessions = store.sessions.filter((session) => session.userId === userId);
    const creditEvents = store.creditEvents.filter((event) => event.userId === userId);
    const currentBillingPeriod = getBillingPeriod(new Date().toISOString());
    const docsUploaded = userProfile ? Object.keys(userProfile.documents || {}).length : 0;
    return {
        totalFormsFilled: sessions.filter((session) => session.status === 'submitted').length,
        totalCreditsUsed: roundCredits(creditEvents.reduce((sum, event) => sum + event.creditsUsed, 0)),
        docsUploaded,
        creditsThisMonth: roundCredits(creditEvents
            .filter((event) => event.billingPeriod === currentBillingPeriod)
            .reduce((sum, event) => sum + event.creditsUsed, 0)),
    };
}
async function listActivitySessions(userId, filters = {}, userProfile) {
    const store = await readStore();
    const userSessions = store.sessions.filter((session) => session.userId === userId).sort(sortSessionsByRecency);
    const filteredSessions = filterSessions(userSessions, filters);
    const page = Math.max(1, filters.page || 1);
    const pageSize = Math.min(50, Math.max(1, filters.pageSize || 20));
    const start = (page - 1) * pageSize;
    const sessions = filteredSessions.slice(start, start + pageSize);
    const summary = await getActivitySummary(userId, userProfile);
    return {
        summary,
        sessions,
        total: filteredSessions.length,
        page,
        pageSize,
        hasMore: start + pageSize < filteredSessions.length,
        availableCategories: Array.from(new Set(userSessions.map((session) => session.examCategory))).sort(),
        availableModels: Array.from(new Set(userSessions.map((session) => session.modelName))).sort(),
    };
}
async function getFormSession(userId, sessionId) {
    const store = await readStore();
    return store.sessions.find((session) => session.userId === userId && session.id === sessionId) || null;
}
async function listCreditEvents(userId, sessionId) {
    const store = await readStore();
    return store.creditEvents
        .filter((event) => event.userId === userId && (sessionId ? event.sessionId === sessionId : true))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}
