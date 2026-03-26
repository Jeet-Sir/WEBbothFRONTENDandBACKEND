"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUser = getUser;
exports.getUserByGoogleId = getUserByGoogleId;
exports.upsertUser = upsertUser;
exports.patchUser = patchUser;
exports.deleteUser = deleteUser;
const node_fs_1 = require("node:fs");
const node_path_1 = __importDefault(require("node:path"));
const db_1 = require("./db");
const dataDir = node_path_1.default.resolve(process.cwd(), 'data');
const dataFile = node_path_1.default.join(dataDir, 'users.json');
async function ensureStore() {
    await node_fs_1.promises.mkdir(dataDir, { recursive: true });
    try {
        await node_fs_1.promises.access(dataFile);
    }
    catch {
        await node_fs_1.promises.writeFile(dataFile, JSON.stringify({}, null, 2), 'utf8');
    }
}
async function readStore() {
    await ensureStore();
    const raw = await node_fs_1.promises.readFile(dataFile, 'utf8');
    if (!raw.trim())
        return {};
    return JSON.parse(raw);
}
async function writeStore(store) {
    await ensureStore();
    await node_fs_1.promises.writeFile(dataFile, JSON.stringify(store, null, 2), 'utf8');
}
function mapRowToProfile(row) {
    const profile = row.profile;
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
async function getUser(userId) {
    if (!(0, db_1.isDbEnabled)()) {
        const store = await readStore();
        return store[userId] || null;
    }
    const result = await (0, db_1.query)(`SELECT user_id, google_id, email, full_name, avatar_url, profile, created_at, updated_at
     FROM app_users
     WHERE user_id = $1
     LIMIT 1`, [userId]);
    if (result.rowCount === 0)
        return null;
    return mapRowToProfile(result.rows[0]);
}
async function getUserByGoogleId(googleId) {
    if (!(0, db_1.isDbEnabled)()) {
        const store = await readStore();
        for (const user of Object.values(store)) {
            if (user.googleId === googleId)
                return user;
            if (!user.googleId && user.userId === googleId)
                return user;
        }
        return null;
    }
    const result = await (0, db_1.query)(`SELECT user_id, google_id, email, full_name, avatar_url, profile, created_at, updated_at
     FROM app_users
     WHERE google_id = $1
     LIMIT 1`, [googleId]);
    if (result.rowCount === 0)
        return null;
    return mapRowToProfile(result.rows[0]);
}
async function upsertUser(user) {
    if (!(0, db_1.isDbEnabled)()) {
        const store = await readStore();
        store[user.userId] = user;
        await writeStore(store);
        return user;
    }
    const result = await (0, db_1.query)(`INSERT INTO app_users (user_id, google_id, email, full_name, avatar_url, profile, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6::jsonb, NOW(), NOW())
     ON CONFLICT (user_id)
     DO UPDATE SET
       google_id = EXCLUDED.google_id,
       email = EXCLUDED.email,
       full_name = EXCLUDED.full_name,
       avatar_url = EXCLUDED.avatar_url,
       profile = EXCLUDED.profile,
       updated_at = NOW()
     RETURNING user_id, google_id, email, full_name, avatar_url, profile, created_at, updated_at`, [
        user.userId,
        user.googleId,
        user.email,
        user.fullName,
        user.avatarUrl || null,
        JSON.stringify(user),
    ]);
    return mapRowToProfile(result.rows[0]);
}
async function patchUser(userId, patch) {
    const current = await getUser(userId);
    if (!current)
        return null;
    const merged = {
        ...current,
        ...patch,
        documents: patch.documents ? patch.documents : current.documents,
        professions: patch.professions ? patch.professions : current.professions,
        updatedAt: new Date().toISOString(),
    };
    if (!(0, db_1.isDbEnabled)()) {
        const store = await readStore();
        store[userId] = merged;
        await writeStore(store);
        return merged;
    }
    const result = await (0, db_1.query)(`UPDATE app_users
     SET email = $2,
         full_name = $3,
         avatar_url = $4,
         profile = $5::jsonb,
         updated_at = NOW()
     WHERE user_id = $1
     RETURNING user_id, google_id, email, full_name, avatar_url, profile, created_at, updated_at`, [
        userId,
        merged.email,
        merged.fullName,
        merged.avatarUrl || null,
        JSON.stringify(merged),
    ]);
    if (result.rowCount === 0)
        return null;
    return mapRowToProfile(result.rows[0]);
}
async function deleteUser(userId) {
    if (!(0, db_1.isDbEnabled)()) {
        const store = await readStore();
        if (!store[userId])
            return false;
        delete store[userId];
        await writeStore(store);
        return true;
    }
    const result = await (0, db_1.query)(`DELETE FROM app_users
     WHERE user_id = $1`, [userId]);
    return result.rowCount > 0;
}
