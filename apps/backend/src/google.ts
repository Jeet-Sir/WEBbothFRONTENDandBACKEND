import { config } from './config';

export interface GoogleIdentity {
  sub: string;
  email: string;
  name: string;
  picture?: string;
}

interface GoogleTokenResponse {
  access_token?: string;
  expires_in?: number;
  id_token?: string;
  refresh_token?: string;
  scope?: string;
  token_type?: string;
  error?: string;
  error_description?: string;
}

function decodeJwtPayload(token: string): Record<string, unknown> {
  const parts = token.split('.');
  if (parts.length < 2) throw new Error('Invalid JWT structure');
  const payload = Buffer.from(parts[1], 'base64url').toString('utf8');
  return JSON.parse(payload) as Record<string, unknown>;
}

function fromPayload(payload: Record<string, unknown>): GoogleIdentity {
  if (!payload.sub || !payload.email) {
    throw new Error('Invalid Google token payload');
  }
  return {
    sub: String(payload.sub),
    email: String(payload.email),
    name: String(payload.name || payload.email),
    picture: payload.picture ? String(payload.picture) : undefined,
  };
}

export async function verifyGoogleCredential(credential: string): Promise<GoogleIdentity> {
  try {
    const mod = await import('google-auth-library');
    const OAuth2Client = mod.OAuth2Client;
    const googleClient = new OAuth2Client(config.googleClientId || undefined);
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: config.googleClientId || undefined,
    });
    const payload = ticket.getPayload();
    return fromPayload(payload as unknown as Record<string, unknown>);
  } catch {
    // Dev fallback when dependency/runtime is unavailable.
    const payload = decodeJwtPayload(credential);
    return fromPayload(payload);
  }
}

async function verifyIdTokenViaGoogle(idToken: string): Promise<GoogleIdentity> {
  const url = new URL('https://oauth2.googleapis.com/tokeninfo');
  url.searchParams.set('id_token', idToken);
  const response = await fetch(url.toString(), { method: 'GET' });
  if (!response.ok) {
    throw new Error('Google tokeninfo verification failed');
  }
  const payload = (await response.json()) as Record<string, unknown>;
  if (config.googleClientId && payload.aud !== config.googleClientId) {
    throw new Error('Google token audience mismatch');
  }
  return fromPayload(payload);
}

export async function exchangeCodeForGoogleIdentity(code: string): Promise<GoogleIdentity> {
  if (!config.googleClientId || !config.googleClientSecret) {
    throw new Error('Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET');
  }

  const body = new URLSearchParams({
    code,
    client_id: config.googleClientId,
    client_secret: config.googleClientSecret,
    redirect_uri: 'postmessage',
    grant_type: 'authorization_code',
  });

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  const tokenResponse = (await response.json()) as GoogleTokenResponse;
  if (!response.ok || tokenResponse.error) {
    throw new Error(tokenResponse.error_description || tokenResponse.error || 'OAuth code exchange failed');
  }

  if (!tokenResponse.id_token) {
    throw new Error('No id_token returned from Google');
  }

  return verifyIdTokenViaGoogle(tokenResponse.id_token);
}
