import { promises as fs } from 'node:fs';
import path from 'node:path';
import { isDbEnabled, query } from './db';
import { UserProfile } from './types';

const dataDir = path.resolve(process.cwd(), 'data');
const dataFile = path.join(dataDir, 'users.json');

type StoreShape = Record<string, UserProfile>;

async function ensureStore(): Promise<void> {
  await fs.mkdir(dataDir, { recursive: true });
  try {
    await fs.access(dataFile);
  } catch {
    await fs.writeFile(dataFile, JSON.stringify({}, null, 2), 'utf8');
  }
}

async function readStore(): Promise<StoreShape> {
  await ensureStore();
  const raw = await fs.readFile(dataFile, 'utf8');
  if (!raw.trim()) return {};
  return JSON.parse(raw) as StoreShape;
}

async function writeStore(store: StoreShape): Promise<void> {
  await ensureStore();
  await fs.writeFile(dataFile, JSON.stringify(store, null, 2), 'utf8');
}

function mapRowToProfile(row: {
  user_id: string;
  google_id: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
  profile: Record<string, unknown>;
  created_at: Date | string;
  updated_at: Date | string;
}): UserProfile {
  const profile = row.profile as unknown as UserProfile;
  return {
    ...profile,
    userId: row.user_id,
    googleId: row.google_id,
    email: row.email,
    fullName: row.full_name,
    avatarUrl: row.avatar_url || undefined,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}

export async function getUser(userId: string): Promise<UserProfile | null> {
  if (!isDbEnabled()) {
    const store = await readStore();
    return store[userId] || null;
  }

  const result = await query(
    `SELECT user_id, google_id, email, full_name, avatar_url, profile, created_at, updated_at
     FROM app_users
     WHERE user_id = $1
     LIMIT 1`,
    [userId]
  );
  if (result.rowCount === 0) return null;
  return mapRowToProfile(result.rows[0] as any);
}

export async function getUserByGoogleId(googleId: string): Promise<UserProfile | null> {
  if (!isDbEnabled()) {
    const store = await readStore();
    for (const user of Object.values(store)) {
      if (user.googleId === googleId) return user;
      if (!user.googleId && user.userId === googleId) return user;
    }
    return null;
  }

  const result = await query(
    `SELECT user_id, google_id, email, full_name, avatar_url, profile, created_at, updated_at
     FROM app_users
     WHERE google_id = $1
     LIMIT 1`,
    [googleId]
  );
  if (result.rowCount === 0) return null;
  return mapRowToProfile(result.rows[0] as any);
}

export async function upsertUser(user: UserProfile): Promise<UserProfile> {
  if (!isDbEnabled()) {
    const store = await readStore();
    store[user.userId] = user;
    await writeStore(store);
    return user;
  }

  const result = await query(
    `INSERT INTO app_users (user_id, google_id, email, full_name, avatar_url, profile, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6::jsonb, NOW(), NOW())
     ON CONFLICT (user_id)
     DO UPDATE SET
       google_id = EXCLUDED.google_id,
       email = EXCLUDED.email,
       full_name = EXCLUDED.full_name,
       avatar_url = EXCLUDED.avatar_url,
       profile = EXCLUDED.profile,
       updated_at = NOW()
     RETURNING user_id, google_id, email, full_name, avatar_url, profile, created_at, updated_at`,
    [
      user.userId,
      user.googleId,
      user.email,
      user.fullName,
      user.avatarUrl || null,
      JSON.stringify(user),
    ]
  );
  return mapRowToProfile(result.rows[0] as any);
}

export async function patchUser(userId: string, patch: Partial<UserProfile>): Promise<UserProfile | null> {
  const current = await getUser(userId);
  if (!current) return null;

  const merged: UserProfile = {
    ...current,
    ...patch,
    documents: patch.documents ? patch.documents : current.documents,
    professions: patch.professions ? patch.professions : current.professions,
    updatedAt: new Date().toISOString(),
  };

  if (!isDbEnabled()) {
    const store = await readStore();
    store[userId] = merged;
    await writeStore(store);
    return merged;
  }

  const result = await query(
    `UPDATE app_users
     SET email = $2,
         full_name = $3,
         avatar_url = $4,
         profile = $5::jsonb,
         updated_at = NOW()
     WHERE user_id = $1
     RETURNING user_id, google_id, email, full_name, avatar_url, profile, created_at, updated_at`,
    [
      userId,
      merged.email,
      merged.fullName,
      merged.avatarUrl || null,
      JSON.stringify(merged),
    ]
  );

  if (result.rowCount === 0) return null;
  return mapRowToProfile(result.rows[0] as any);
}

export async function deleteUser(userId: string): Promise<boolean> {
  if (!isDbEnabled()) {
    const store = await readStore();
    if (!store[userId]) return false;
    delete store[userId];
    await writeStore(store);
    return true;
  }

  const result = await query(
    `DELETE FROM app_users
     WHERE user_id = $1`,
    [userId]
  );
  return result.rowCount > 0;
}
