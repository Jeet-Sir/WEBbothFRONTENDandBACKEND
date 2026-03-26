"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isDbEnabled = isDbEnabled;
exports.query = query;
exports.initDb = initDb;
const node_fs_1 = __importDefault(require("node:fs"));
const config_1 = require("./config");
let pool = null;
let dbEnabled = false;
function createSslConfig() {
    if (!config_1.config.dbHost || !config_1.config.dbName)
        return false;
    if (!config_1.config.dbSslCaPath) {
        return { rejectUnauthorized: false };
    }
    return {
        rejectUnauthorized: config_1.config.dbRejectUnauthorized,
        ca: node_fs_1.default.readFileSync(config_1.config.dbSslCaPath, 'utf8'),
    };
}
function isDbEnabled() {
    return dbEnabled && Boolean(pool);
}
async function query(text, params = []) {
    if (!pool) {
        throw new Error('Database is not initialized');
    }
    return pool.query(text, params);
}
async function initDb() {
    if (!config_1.config.dbHost || !config_1.config.dbName || !config_1.config.dbUser) {
        dbEnabled = false;
        console.warn('DB config missing; using local JSON fallback storage.');
        return;
    }
    try {
        const mod = await import('pg');
        const Pool = mod.Pool;
        pool = new Pool({
            user: config_1.config.dbUser,
            password: config_1.config.dbPassword,
            host: config_1.config.dbHost,
            port: config_1.config.dbPort,
            database: config_1.config.dbName,
            ssl: createSslConfig(),
            max: 20,
            idleTimeoutMillis: 30_000,
            connectionTimeoutMillis: 10_000,
        });
        await query(`
      CREATE TABLE IF NOT EXISTS app_users (
        user_id TEXT PRIMARY KEY,
        google_id TEXT UNIQUE NOT NULL,
        email TEXT NOT NULL,
        full_name TEXT NOT NULL,
        avatar_url TEXT,
        profile JSONB NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
        dbEnabled = true;
        console.log('PostgreSQL connected.');
    }
    catch (error) {
        dbEnabled = false;
        pool = null;
        console.warn('PostgreSQL unavailable; using local JSON fallback storage.', error);
    }
}
