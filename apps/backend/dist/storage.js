"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadToFirebaseStorage = uploadToFirebaseStorage;
exports.uploadToLocalStorage = uploadToLocalStorage;
exports.readLocalStorageFile = readLocalStorageFile;
exports.deleteUserStorageData = deleteUserStorageData;
const node_fs_1 = __importDefault(require("node:fs"));
const node_fs_2 = require("node:fs");
const node_path_1 = __importDefault(require("node:path"));
const node_crypto_1 = require("node:crypto");
const config_1 = require("./config");
function sanitizeFileName(fileName) {
    return fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
}
const LOCAL_STORAGE_ROOT = node_path_1.default.resolve(process.cwd(), 'data', 'local-uploads');
const LOCAL_STORAGE_PREFIX = 'local://';
function readServiceAccountFromEnv() {
    if (config_1.config.firebaseServiceAccountJson) {
        const parsed = JSON.parse(config_1.config.firebaseServiceAccountJson);
        const projectId = parsed.project_id || parsed.projectId;
        const clientEmail = parsed.client_email || parsed.clientEmail;
        const privateKey = parsed.private_key || parsed.privateKey;
        if (projectId && clientEmail && privateKey) {
            return {
                projectId,
                clientEmail,
                privateKey: privateKey.replace(/\\n/g, '\n'),
            };
        }
    }
    if (config_1.config.firebaseProjectId && config_1.config.firebaseClientEmail && config_1.config.firebasePrivateKey) {
        return {
            projectId: config_1.config.firebaseProjectId,
            clientEmail: config_1.config.firebaseClientEmail,
            privateKey: config_1.config.firebasePrivateKey.replace(/\\n/g, '\n'),
        };
    }
    return null;
}
async function getAdminBucket() {
    const appMod = await import('firebase-admin/app');
    const storageMod = await import('firebase-admin/storage');
    const { getApps, initializeApp, cert, applicationDefault } = appMod;
    if (!config_1.config.firebaseStorageBucket) {
        throw new Error('FIREBASE_STORAGE_BUCKET is not configured');
    }
    if (getApps().length === 0) {
        const options = {
            storageBucket: config_1.config.firebaseStorageBucket,
        };
        if (config_1.config.firebaseServiceAccountPath) {
            const servicePath = node_path_1.default.isAbsolute(config_1.config.firebaseServiceAccountPath)
                ? config_1.config.firebaseServiceAccountPath
                : node_path_1.default.resolve(process.cwd(), config_1.config.firebaseServiceAccountPath);
            const raw = node_fs_1.default.readFileSync(servicePath, 'utf8');
            options.credential = cert(JSON.parse(raw));
        }
        else {
            const serviceAccount = readServiceAccountFromEnv();
            if (serviceAccount) {
                options.credential = cert(serviceAccount);
            }
            else {
                options.credential = applicationDefault();
            }
        }
        initializeApp(options);
    }
    return storageMod.getStorage().bucket(config_1.config.firebaseStorageBucket);
}
function normalizeLocalStoragePath(storagePath) {
    return storagePath.startsWith(LOCAL_STORAGE_PREFIX)
        ? storagePath.slice(LOCAL_STORAGE_PREFIX.length)
        : storagePath;
}
function resolveLocalStoragePath(storagePath) {
    const normalized = normalizeLocalStoragePath(storagePath).replace(/^\/+/, '');
    const absolute = node_path_1.default.resolve(LOCAL_STORAGE_ROOT, normalized);
    if (absolute !== LOCAL_STORAGE_ROOT && !absolute.startsWith(`${LOCAL_STORAGE_ROOT}${node_path_1.default.sep}`)) {
        throw new Error('Invalid local storage path');
    }
    return absolute;
}
function joinUrl(baseUrl, relativePath) {
    return `${baseUrl.replace(/\/+$/, '')}/${relativePath.replace(/^\/+/, '')}`;
}
async function uploadToFirebaseStorage(input) {
    const bucket = await getAdminBucket();
    const safeName = sanitizeFileName(input.fileName);
    const storagePath = `users/${input.userId}/documents/${input.docType}/${Date.now()}_${safeName}`;
    const token = (0, node_crypto_1.randomUUID)();
    const file = bucket.file(storagePath);
    await file.save(input.fileBuffer, {
        resumable: false,
        contentType: input.mimeType,
        metadata: {
            contentType: input.mimeType,
            metadata: {
                firebaseStorageDownloadTokens: token,
            },
        },
    });
    const fileUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/` +
        `${encodeURIComponent(storagePath)}?alt=media&token=${token}`;
    return { fileUrl, storagePath };
}
async function uploadToLocalStorage(input) {
    const safeName = sanitizeFileName(input.fileName);
    const relativePath = node_path_1.default.posix.join('users', input.userId, 'documents', input.docType, `${Date.now()}_${safeName}`);
    const absolutePath = resolveLocalStoragePath(relativePath);
    await node_fs_2.promises.mkdir(node_path_1.default.dirname(absolutePath), { recursive: true });
    await node_fs_2.promises.writeFile(absolutePath, input.fileBuffer);
    return {
        fileUrl: joinUrl(input.publicBaseUrl, `/vault/files/${relativePath.split('/').map((segment) => encodeURIComponent(segment)).join('/')}`),
        storagePath: `${LOCAL_STORAGE_PREFIX}${relativePath}`,
    };
}
async function readLocalStorageFile(storagePath) {
    const absolutePath = resolveLocalStoragePath(storagePath);
    return node_fs_2.promises.readFile(absolutePath);
}
async function deleteUserStorageData(userId) {
    const bucket = await getAdminBucket();
    await bucket.deleteFiles({ prefix: `users/${userId}/` });
}
