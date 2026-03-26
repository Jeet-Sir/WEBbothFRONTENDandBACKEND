import fs from 'node:fs';
import { config } from './config';

type QueryResultRow = Record<string, unknown>;
type QueryResult<T extends QueryResultRow = QueryResultRow> = {
  rows: T[];
  rowCount: number;
};

type PoolLike = {
  query: (text: string, params?: unknown[]) => Promise<QueryResult>;
};

let pool: PoolLike | null = null;
let dbEnabled = false;

function createSslConfig(): false | { rejectUnauthorized: boolean; ca?: string } {
  if (!config.dbHost || !config.dbName) return false;
  if (!config.dbSslCaPath) {
    return { rejectUnauthorized: false };
  }
  return {
    rejectUnauthorized: config.dbRejectUnauthorized,
    ca: fs.readFileSync(config.dbSslCaPath, 'utf8'),
  };
}

export function isDbEnabled(): boolean {
  return dbEnabled && Boolean(pool);
}

export async function query(text: string, params: unknown[] = []): Promise<QueryResult> {
  if (!pool) {
    throw new Error('Database is not initialized');
  }
  return pool.query(text, params);
}

export async function initDb(): Promise<void> {
  if (!config.dbHost || !config.dbName || !config.dbUser) {
    dbEnabled = false;
    console.warn('DB config missing; using local JSON fallback storage.');
    return;
  }

  try {
    const mod = await import('pg');
    const Pool = mod.Pool;
    pool = new Pool({
      user: config.dbUser,
      password: config.dbPassword,
      host: config.dbHost,
      port: config.dbPort,
      database: config.dbName,
      ssl: createSslConfig(),
      max: 20,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
    }) as PoolLike;

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
  } catch (error) {
    dbEnabled = false;
    pool = null;
    console.warn('PostgreSQL unavailable; using local JSON fallback storage.', error);
  }
}
