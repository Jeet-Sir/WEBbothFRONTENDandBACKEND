"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_http_1 = require("node:http");
const node_crypto_1 = require("node:crypto");
const config_1 = require("./config");
const auth_1 = require("./auth");
const google_1 = require("./google");
const db_1 = require("./db");
const activity_store_1 = require("./activity-store");
const store_1 = require("./store");
const storage_1 = require("./storage");
const validation_1 = require("./validation");
const file_manager_1 = require("./ai/file-manager");
const DEFAULT_AI_MODEL = 'googleai/gemini-2.5-flash';
async function runDocumentExtraction(fileUrl, docType, mimeType = 'application/pdf', requestId) {
    try {
        const fileUri = await (0, file_manager_1.uploadFileToGemini)(fileUrl, mimeType);
        const ai = await import('./ai/flows/extract-data-from-document.js');
        const result = await ai.extractDataFromDocument({ fileUri, docType, mimeType });
        return {
            extractedData: result.extractedData || {},
            usage: result.usage,
        };
    }
    catch (error) {
        logWarn('AI extraction unavailable, storing fallback payload', { requestId, error });
        return {
            extractedData: {
                warning: 'ai_unavailable',
                docType,
            },
        };
    }
}
function resolveCorsOrigin(req) {
    const origin = req.headers.origin;
    if (!origin)
        return config_1.config.corsOrigins[0] || null;
    if (config_1.config.corsOrigins.includes(origin))
        return origin;
    if (origin.startsWith('chrome-extension://'))
        return origin;
    return null;
}
function setCorsHeaders(req, res) {
    const allowedOrigin = resolveCorsOrigin(req);
    if (allowedOrigin) {
        res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
        res.setHeader('Vary', 'Origin');
    }
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
}
function setSecurityHeaders(res) {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('Cross-Origin-Resource-Policy', 'same-site');
    res.setHeader('X-DNS-Prefetch-Control', 'off');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    res.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'; base-uri 'none';");
}
function sendJson(req, res, status, body) {
    setCorsHeaders(req, res);
    setSecurityHeaders(res);
    res.statusCode = status;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(body));
}
function logInfo(message, meta) {
    const timestamp = new Date().toISOString();
    if (meta) {
        console.log(`[INFO] [${timestamp}] ${message}`, JSON.stringify(meta, null, 2));
        return;
    }
    console.log(`[INFO] [${timestamp}] ${message}`);
}
function logWarn(message, meta) {
    const timestamp = new Date().toISOString();
    if (meta) {
        console.warn(`[WARN] [${timestamp}] ${message}`, JSON.stringify(meta, null, 2));
        return;
    }
    console.warn(`[WARN] [${timestamp}] ${message}`);
}
function logError(message, error, meta) {
    const timestamp = new Date().toISOString();
    if (meta) {
        console.error(`[ERROR] [${timestamp}] ${message}`, JSON.stringify(meta, null, 2), error);
        return;
    }
    console.error(`[ERROR] [${timestamp}] ${message}`, error);
}
async function readJsonBody(req, requestId) {
    const chunks = [];
    for await (const chunk of req) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    const text = Buffer.concat(chunks).toString('utf8');
    logInfo('Body read', { requestId, sizeBytes: text.length, snippet: text.slice(0, 100) + (text.length > 100 ? '...' : '') });
    return text ? JSON.parse(text) : {};
}
function decodeDataUri(dataUri) {
    const match = dataUri.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) {
        throw new Error('Invalid dataUri format');
    }
    return Buffer.from(match[2], 'base64');
}
function parsePositiveInteger(value, fallback) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 1) {
        return fallback;
    }
    return Math.floor(parsed);
}
function readAuth(req, allowedScopes) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer '))
        return null;
    const token = authHeader.slice('Bearer '.length);
    const decoded = (0, auth_1.verifyJwt)(token);
    if (!decoded)
        return null;
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
function getBearerToken(req) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer '))
        return null;
    return authHeader.slice('Bearer '.length).trim() || null;
}
function normalizeMirrorTimestamp(value) {
    const date = new Date(value || Date.now());
    if (Number.isNaN(date.getTime())) {
        return new Date().toISOString();
    }
    return date.toISOString();
}
async function mirrorCreditEventToExtension(req, event) {
    const token = getBearerToken(req);
    if (!token || !config_1.config.activityMirrorBaseUrl) {
        return;
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), config_1.config.activityMirrorTimeoutMs);
    try {
        const metadata = event.metadata || {};
        const response = await fetch(`${config_1.config.activityMirrorBaseUrl}/api/activity/import-credit-event`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                eventType: event.eventType,
                agentName: event.agentName,
                modelName: event.modelName,
                inputTokens: event.inputTokens,
                outputTokens: event.outputTokens,
                totalTokens: event.totalTokens,
                creditsUsed: event.creditsUsed,
                createdAt: normalizeMirrorTimestamp(event.createdAt),
                sourceEventId: event.id,
                sourceSystem: 'website_backend',
                metadata: {
                    ...metadata,
                    documentName: typeof metadata.documentName === 'string' && metadata.documentName.length > 0
                        ? metadata.documentName
                        : typeof metadata.docType === 'string' && metadata.docType.length > 0
                            ? metadata.docType
                            : 'website_document',
                },
            }),
            signal: controller.signal,
        });
        if (!response.ok) {
            const responseText = await response.text();
            logWarn('Failed to mirror activity event to extension backend', {
                status: response.status,
                eventId: event.id,
                response: responseText.slice(0, 240),
            });
        }
    }
    catch (error) {
        logWarn('Activity mirroring to extension backend failed', {
            eventId: event.id,
            error: error instanceof Error ? error.message : String(error),
        });
    }
    finally {
        clearTimeout(timeout);
    }
}
function parseCookies(req) {
    const list = req.headers.cookie;
    if (!list)
        return {};
    const cookies = {};
    list.split(';').forEach(cookie => {
        const parts = cookie.split('=');
        const key = parts.shift()?.trim();
        if (!key)
            return;
        cookies[key] = decodeURI(parts.join('='));
    });
    return cookies;
}
function getClientIp(req) {
    const xff = req.headers['x-forwarded-for'];
    if (typeof xff === 'string' && xff.length > 0) {
        return xff.split(',')[0].trim();
    }
    return req.socket.remoteAddress || 'unknown';
}
const requestBuckets = new Map();
function getRateLimitKey(req) {
    const method = req.method || 'GET';
    const pathname = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`).pathname;
    return `${getClientIp(req)}:${method}:${pathname}`;
}
function shouldRateLimit(req) {
    const method = req.method || 'GET';
    if (method === 'OPTIONS') {
        return false;
    }
    const pathname = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`).pathname;
    if (pathname === '/health') {
        return false;
    }
    return true;
}
function isRateLimited(req) {
    if (!shouldRateLimit(req)) {
        return false;
    }
    const key = getRateLimitKey(req);
    const now = Date.now();
    const existing = requestBuckets.get(key);
    if (!existing || now > existing.resetAt) {
        requestBuckets.set(key, { count: 1, resetAt: now + config_1.config.rateLimitWindowMs });
        return false;
    }
    existing.count += 1;
    if (existing.count > config_1.config.rateLimitMax)
        return true;
    return false;
}
const server = (0, node_http_1.createServer)(async (req, res) => {
    const requestId = (0, node_crypto_1.randomUUID)().slice(0, 8);
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
            const decoded = (0, auth_1.verifyJwt)(sessionToken);
            if (!decoded || (decoded.scope && decoded.scope !== 'web')) {
                logWarn('Invalid session token for extension auth', { requestId });
                res.writeHead(302, { Location: `${redirectUri}?error=invalid_session` });
                res.end();
                return;
            }
            const extensionToken = (0, auth_1.issueJwt)({ userId: decoded.userId, email: decoded.email, scope: 'extension' }, 30 * 60 // 30 minutes
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
            const decoded = (0, auth_1.verifyJwt)(sessionToken);
            if (!decoded || (decoded.scope && decoded.scope !== 'web')) {
                sendJson(req, res, 401, { error: 'Invalid session cookie' });
                return;
            }
            const extensionToken = (0, auth_1.issueJwt)({ userId: decoded.userId, email: decoded.email, scope: 'extension' }, 30 * 60 // 30 minutes
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
            const decoded = (0, auth_1.verifyJwt)(sessionToken);
            if (!decoded || (decoded.scope && decoded.scope !== 'web')) {
                sendJson(req, res, 401, { error: 'Invalid session cookie' });
                return;
            }
            const user = await (0, store_1.getUser)(decoded.userId);
            if (!user) {
                sendJson(req, res, 404, { error: 'User profile not found' });
                return;
            }
            sendJson(req, res, 200, { token: sessionToken, user });
            return;
        }
        if (method === 'POST' && pathname === '/auth/logout') {
            res.setHeader('Set-Cookie', [
                'sabapplier_session=',
                'Path=/',
                'HttpOnly',
                'SameSite=None',
                'Secure',
                'Max-Age=0'
            ].join('; '));
            sendJson(req, res, 200, { success: true });
            return;
        }
        if (method === 'POST' && (pathname === '/auth/google' || pathname === '/auth/google/code')) {
            const body = await readJsonBody(req, requestId);
            const parsed = validation_1.authGoogleSchema.safeParse(body);
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
                ? await (0, google_1.exchangeCodeForGoogleIdentity)(code)
                : await (0, google_1.verifyGoogleCredential)(credential);
            const now = new Date().toISOString();
            const existing = await (0, store_1.getUserByGoogleId)(googleUser.sub);
            const user = existing || {
                userId: (0, node_crypto_1.randomUUID)(),
                googleId: googleUser.sub,
                email: googleUser.email,
                fullName: googleUser.name,
                avatarUrl: googleUser.picture,
                onboardingComplete: false,
                onboardingStep: 1,
                professions: [],
                coFounders: [],
                documents: {},
                createdAt: now,
                updatedAt: now,
            };
            if (!existing) {
                await (0, store_1.upsertUser)(user);
            }
            else {
                await (0, store_1.patchUser)(existing.userId, {
                    email: googleUser.email,
                    fullName: googleUser.name,
                    avatarUrl: googleUser.picture,
                });
            }
            const token = (0, auth_1.issueJwt)({ userId: user.userId, email: user.email, scope: 'web' });
            const cookieOpts = [
                `sabapplier_session=${token}`,
                'Path=/',
                'HttpOnly',
                'SameSite=None',
                'Secure',
                'Max-Age=' + (7 * 24 * 60 * 60)
            ];
            res.setHeader('Set-Cookie', cookieOpts.join('; '));
            const latest = await (0, store_1.getUser)(user.userId);
            sendJson(req, res, 200, { token, user: latest || user });
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
                const user = await (0, store_1.getUser)(auth.userId);
                if (!user) {
                    sendJson(req, res, 404, { error: 'User profile not found' });
                    return;
                }
                sendJson(req, res, 200, { user });
                return;
            }
            if (method === 'POST') {
                const body = await readJsonBody(req, requestId);
                const parsed = validation_1.profilePatchSchema.safeParse(body || {});
                if (!parsed.success) {
                    logWarn('Validation failed for /profile', {
                        requestId,
                        errors: parsed.error.flatten(),
                        bodyKeys: body && typeof body === 'object' ? Object.keys(body) : [],
                    });
                    sendJson(req, res, 400, { error: parsed.error.flatten() });
                    return;
                }
                const patched = await (0, store_1.patchUser)(auth.userId, parsed.data || {});
                if (!patched) {
                    sendJson(req, res, 404, { error: 'User profile not found' });
                    return;
                }
                sendJson(req, res, 200, { user: patched });
                return;
            }
            if (method === 'DELETE') {
                const current = await (0, store_1.getUser)(auth.userId);
                if (!current) {
                    sendJson(req, res, 404, { error: 'User profile not found' });
                    return;
                }
                try {
                    await (0, storage_1.deleteUserStorageData)(auth.userId);
                }
                catch (error) {
                    logWarn('Failed to cleanup user storage data', { requestId, userId: auth.userId });
                }
                const deleted = await (0, store_1.deleteUser)(auth.userId);
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
            const parsed = validation_1.onboardSchema.safeParse(body || {});
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
            const pageData = parsed.data.pageData;
            const current = await (0, store_1.getUser)(auth.userId);
            if (!current) {
                sendJson(req, res, 404, { error: 'User profile not found' });
                return;
            }
            const mergedStep = Math.max(current.onboardingStep || 1, step);
            const merged = await (0, store_1.patchUser)(auth.userId, {
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
            const user = await (0, store_1.getUser)(auth.userId);
            const activity = await (0, activity_store_1.listActivitySessions)(auth.userId, {
                search: url.searchParams.get('search') || undefined,
                status: url.searchParams.get('status') || undefined,
                examCategory: url.searchParams.get('examCategory') || undefined,
                modelName: url.searchParams.get('modelName') || undefined,
                dateFrom: url.searchParams.get('dateFrom') || undefined,
                dateTo: url.searchParams.get('dateTo') || undefined,
                page: parsePositiveInteger(url.searchParams.get('page'), 1),
                pageSize: parsePositiveInteger(url.searchParams.get('pageSize'), 20),
            }, user);
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
            const session = await (0, activity_store_1.getFormSession)(auth.userId, sessionId);
            if (!session) {
                sendJson(req, res, 404, { error: 'Session not found' });
                return;
            }
            const creditEvents = await (0, activity_store_1.listCreditEvents)(auth.userId, sessionId);
            sendJson(req, res, 200, { session, creditEvents });
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
            const parsed = validation_1.createFormSessionSchema.safeParse(body || {});
            if (!parsed.success) {
                logWarn('Validation failed for /activity/sessions', {
                    requestId,
                    errors: parsed.error.flatten(),
                    bodyKeys: body && typeof body === 'object' ? Object.keys(body) : [],
                });
                sendJson(req, res, 400, { error: parsed.error.flatten() });
                return;
            }
            const session = await (0, activity_store_1.createFormSession)({
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
            const parsed = validation_1.createCreditEventSchema.safeParse(body || {});
            if (!parsed.success) {
                logWarn('Validation failed for /activity/credit-events', {
                    requestId,
                    errors: parsed.error.flatten(),
                    bodyKeys: body && typeof body === 'object' ? Object.keys(body) : [],
                });
                sendJson(req, res, 400, { error: parsed.error.flatten() });
                return;
            }
            const event = await (0, activity_store_1.createCreditEvent)({
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
            const parsed = validation_1.processVaultSchema.safeParse(body || {});
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
            const current = await (0, store_1.getUser)(auth.userId);
            if (!current) {
                sendJson(req, res, 404, { error: 'User profile not found' });
                return;
            }
            try {
                const extraction = await runDocumentExtraction(fileUrl, docType, mimeType || 'application/pdf', requestId);
                const extractedData = extraction.extractedData;
                const now = new Date().toISOString();
                const inputTokens = Math.max(0, Number(extraction.usage?.inputTokens) || 0);
                const outputTokens = Math.max(0, Number(extraction.usage?.outputTokens) || 0);
                const totalTokens = Math.max(0, Number(extraction.usage?.totalTokens) || 0) || inputTokens + outputTokens;
                const doc = {
                    fileUrl,
                    storagePath,
                    extractedData,
                    status: 'verified',
                    uploadedAt: current.documents?.[docType]?.uploadedAt || now,
                    processedAt: now,
                };
                const updated = await (0, store_1.patchUser)(auth.userId, {
                    documents: {
                        ...current.documents,
                        [docType]: doc,
                    },
                });
                const event = await (0, activity_store_1.createCreditEvent)({
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
                await mirrorCreditEventToExtension(req, event);
                sendJson(req, res, 200, { document: doc, user: updated });
                return;
            }
            catch (error) {
                logError('Vault processing failed', error, { requestId, docType });
                const now = new Date().toISOString();
                const inputTokens = 0;
                const failed = {
                    fileUrl,
                    storagePath,
                    extractedData: null,
                    status: 'rejected',
                    uploadedAt: current.documents?.[docType]?.uploadedAt || now,
                    processedAt: now,
                    error: 'processing_failed',
                };
                const updated = await (0, store_1.patchUser)(auth.userId, {
                    documents: {
                        ...current.documents,
                        [docType]: failed,
                    },
                });
                const event = await (0, activity_store_1.createCreditEvent)({
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
                await mirrorCreditEventToExtension(req, event);
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
            const parsed = validation_1.uploadVaultSchema.safeParse(body || {});
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
            const current = await (0, store_1.getUser)(auth.userId);
            if (!current) {
                sendJson(req, res, 404, { error: 'User profile not found' });
                return;
            }
            try {
                const fileBuffer = decodeDataUri(dataUri);
                const uploaded = await (0, storage_1.uploadToFirebaseStorage)({
                    userId: auth.userId,
                    docType,
                    fileName,
                    mimeType,
                    fileBuffer,
                });
                const now = new Date().toISOString();
                const updated = await (0, store_1.patchUser)(auth.userId, {
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
            }
            catch (error) {
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
    }
    catch (error) {
        logError('Unhandled server error', error, { requestId });
        sendJson(req, res, 500, { error: 'Internal server error' });
    }
});
async function start() {
    await (0, db_1.initDb)();
    server.listen(config_1.config.port, () => {
        logInfo(`Sabapplier backend listening on http://localhost:${config_1.config.port}`);
    });
}
start().catch((error) => {
    logError('Failed to start backend', error);
    process.exit(1);
});
