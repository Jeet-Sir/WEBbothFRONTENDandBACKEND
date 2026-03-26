import fs from 'node:fs';
import { promises as fsp } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { config } from './config';

function sanitizeFileName(fileName: string): string {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
}

type ServiceAccountLike = {
  projectId: string;
  clientEmail: string;
  privateKey: string;
};

const LOCAL_STORAGE_ROOT = path.resolve(process.cwd(), 'data', 'local-uploads');
const LOCAL_STORAGE_PREFIX = 'local://';

function readServiceAccountFromEnv(): ServiceAccountLike | null {
  if (config.firebaseServiceAccountJson) {
    const parsed = JSON.parse(config.firebaseServiceAccountJson) as {
      project_id?: string;
      client_email?: string;
      private_key?: string;
      projectId?: string;
      clientEmail?: string;
      privateKey?: string;
    };

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

  if (config.firebaseProjectId && config.firebaseClientEmail && config.firebasePrivateKey) {
    return {
      projectId: config.firebaseProjectId,
      clientEmail: config.firebaseClientEmail,
      privateKey: config.firebasePrivateKey.replace(/\\n/g, '\n'),
    };
  }

  return null;
}

async function getAdminBucket() {
  const appMod = await import('firebase-admin/app');
  const storageMod = await import('firebase-admin/storage');
  const { getApps, initializeApp, cert, applicationDefault } = appMod;

  if (!config.firebaseStorageBucket) {
    throw new Error('FIREBASE_STORAGE_BUCKET is not configured');
  }

  if (getApps().length === 0) {
    const options: Record<string, unknown> = {
      storageBucket: config.firebaseStorageBucket,
    };

    if (config.firebaseServiceAccountPath) {
      const servicePath = path.isAbsolute(config.firebaseServiceAccountPath)
        ? config.firebaseServiceAccountPath
        : path.resolve(process.cwd(), config.firebaseServiceAccountPath);
      const raw = fs.readFileSync(servicePath, 'utf8');
      options.credential = cert(JSON.parse(raw));
    } else {
      const serviceAccount = readServiceAccountFromEnv();
      if (serviceAccount) {
        options.credential = cert(serviceAccount);
      } else {
        options.credential = applicationDefault();
      }
    }

    initializeApp(options);
  }

  return storageMod.getStorage().bucket(config.firebaseStorageBucket);
}

function normalizeLocalStoragePath(storagePath: string): string {
  return storagePath.startsWith(LOCAL_STORAGE_PREFIX)
    ? storagePath.slice(LOCAL_STORAGE_PREFIX.length)
    : storagePath;
}

function resolveLocalStoragePath(storagePath: string): string {
  const normalized = normalizeLocalStoragePath(storagePath).replace(/^\/+/, '');
  const absolute = path.resolve(LOCAL_STORAGE_ROOT, normalized);

  if (absolute !== LOCAL_STORAGE_ROOT && !absolute.startsWith(`${LOCAL_STORAGE_ROOT}${path.sep}`)) {
    throw new Error('Invalid local storage path');
  }

  return absolute;
}

function joinUrl(baseUrl: string, relativePath: string): string {
  return `${baseUrl.replace(/\/+$/, '')}/${relativePath.replace(/^\/+/, '')}`;
}

export async function uploadToFirebaseStorage(input: {
  userId: string;
  docType: string;
  fileName: string;
  mimeType: string;
  fileBuffer: Buffer;
}): Promise<{ fileUrl: string; storagePath: string }> {
  const bucket = await getAdminBucket();
  const safeName = sanitizeFileName(input.fileName);
  const storagePath = `users/${input.userId}/documents/${input.docType}/${Date.now()}_${safeName}`;
  const token = randomUUID();

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

  const fileUrl =
    `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/` +
    `${encodeURIComponent(storagePath)}?alt=media&token=${token}`;

  return { fileUrl, storagePath };
}

export async function uploadToLocalStorage(input: {
  userId: string;
  docType: string;
  fileName: string;
  mimeType: string;
  fileBuffer: Buffer;
  publicBaseUrl: string;
}): Promise<{ fileUrl: string; storagePath: string }> {
  const safeName = sanitizeFileName(input.fileName);
  const relativePath = path.posix.join(
    'users',
    input.userId,
    'documents',
    input.docType,
    `${Date.now()}_${safeName}`
  );
  const absolutePath = resolveLocalStoragePath(relativePath);

  await fsp.mkdir(path.dirname(absolutePath), { recursive: true });
  await fsp.writeFile(absolutePath, input.fileBuffer);

  return {
    fileUrl: joinUrl(
      input.publicBaseUrl,
      `/vault/files/${relativePath.split('/').map((segment) => encodeURIComponent(segment)).join('/')}`
    ),
    storagePath: `${LOCAL_STORAGE_PREFIX}${relativePath}`,
  };
}

export async function readLocalStorageFile(storagePath: string): Promise<Buffer> {
  const absolutePath = resolveLocalStoragePath(storagePath);
  return fsp.readFile(absolutePath);
}

export async function deleteUserStorageData(userId: string): Promise<void> {
  const bucket = await getAdminBucket();
  await bucket.deleteFiles({ prefix: `users/${userId}/` });
}
