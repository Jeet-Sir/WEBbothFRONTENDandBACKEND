import crypto from 'node:crypto';
import { config } from './config';
import { AuthJwtPayload } from './types';

function b64url(input: string): string {
  return Buffer.from(input, 'utf8').toString('base64url');
}

function b64urlDecode(input: string): string {
  return Buffer.from(input, 'base64url').toString('utf8');
}

export function issueJwt(payload: AuthJwtPayload, expiresInSeconds: number = 7 * 24 * 60 * 60): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const body = {
    ...payload,
    exp: Math.floor(Date.now() / 1000) + expiresInSeconds,
  };
  const encodedHeader = b64url(JSON.stringify(header));
  const encodedBody = b64url(JSON.stringify(body));
  const signature = crypto
    .createHmac('sha256', config.jwtSecret)
    .update(`${encodedHeader}.${encodedBody}`)
    .digest('base64url');
  return `${encodedHeader}.${encodedBody}.${signature}`;
}

export function verifyJwt(token: string): AuthJwtPayload | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [encodedHeader, encodedBody, signature] = parts;
  const expected = crypto
    .createHmac('sha256', config.jwtSecret)
    .update(`${encodedHeader}.${encodedBody}`)
    .digest('base64url');

  if (signature !== expected) return null;
  const payload = JSON.parse(b64urlDecode(encodedBody)) as AuthJwtPayload & { exp?: number };
  if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
  return { userId: payload.userId, email: payload.email, scope: payload.scope };
}
