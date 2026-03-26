"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const dotenv_1 = require("dotenv");
const node_path_1 = __importDefault(require("node:path"));
(0, dotenv_1.config)({ path: node_path_1.default.resolve(__dirname, '..', '.env') });
exports.config = {
    port: Number(process.env.PORT || 4000),
    jwtSecret: process.env.JWT_SECRET || 'dev-jwt-secret',
    googleClientId: process.env.GOOGLE_CLIENT_ID || '',
    googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    corsOrigins: (process.env.CORS_ORIGIN || process.env.CORS_ORIGINS || 'http://localhost:3000')
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean),
    dbUser: process.env.DB_USER || '',
    dbPassword: process.env.DB_PASSWORD || '',
    dbHost: process.env.DB_HOST || '',
    dbPort: Number(process.env.DB_PORT || 5432),
    dbName: process.env.DB_NAME || '',
    dbSslCaPath: process.env.DB_SSL_CA_PATH || '',
    dbRejectUnauthorized: process.env.DB_REJECT_UNAUTHORIZED !== 'false',
    rateLimitWindowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 60_000),
    rateLimitMax: Number(process.env.RATE_LIMIT_MAX || 120),
    firebaseStorageBucket: process.env.FIREBASE_STORAGE_BUCKET || '',
    firebaseServiceAccountPath: process.env.FIREBASE_SERVICE_ACCOUNT_PATH || '',
    firebaseServiceAccountJson: process.env.FIREBASE_SERVICE_ACCOUNT_JSON || '',
    firebaseProjectId: process.env.FIREBASE_PROJECT_ID || '',
    firebaseClientEmail: process.env.FIREBASE_CLIENT_EMAIL || '',
    firebasePrivateKey: process.env.FIREBASE_PRIVATE_KEY || '',
    activityMirrorBaseUrl: (process.env.ACTIVITY_MIRROR_BASE_URL || 'http://localhost:4002').replace(/\/$/, ''),
    activityMirrorTimeoutMs: Number(process.env.ACTIVITY_MIRROR_TIMEOUT_MS || 5000),
};
