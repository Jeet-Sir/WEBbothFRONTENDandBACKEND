import {
  ActivityFilters,
  DocumentCreditEventsResponse,
  ActivitySessionDetailResponse,
  ActivitySessionsResponse,
  CreditEvent,
  CreditEventType,
  CreditPurchaseType,
  FormSession,
  SessionStatus,
  UserProfile,
} from './types';

const RAW_API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';
const API_BASE_URL = RAW_API_BASE_URL.replace(/\/+$/, '');

function fileToDataUri(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
        return;
      }
      reject(new Error('Failed to read file'));
    };
    reader.onerror = () => reject(reader.error || new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    credentials: 'include',
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Request failed (${response.status})`);
  }

  return response.json() as Promise<T>;
}

export async function authWithGoogleCredential(credential: string): Promise<{ token: string; user: UserProfile }> {
  return apiRequest('/auth/google', {
    method: 'POST',
    body: JSON.stringify({ credential }),
  });
}

export async function authWithGoogleCode(code: string): Promise<{ token: string; user: UserProfile }> {
  return apiRequest('/auth/google/code', {
    method: 'POST',
    body: JSON.stringify({ code }),
  });
}

export async function restoreSession(): Promise<{ token: string; user: UserProfile }> {
  return apiRequest('/auth/session', {
    method: 'GET',
    cache: 'no-store',
  });
}

export async function logoutSession(): Promise<{ success: boolean }> {
  return apiRequest('/auth/logout', {
    method: 'POST',
  });
}

export async function fetchProfile(token: string): Promise<{ user: UserProfile }> {
  return apiRequest('/profile', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: 'no-store',
  });
}

export async function saveProfile(token: string, data: Partial<UserProfile>): Promise<{ user: UserProfile }> {
  return apiRequest('/profile', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
}

export async function createCheckoutIntent(
  token: string,
  purchaseType: CreditPurchaseType
): Promise<{ ok: true; user: UserProfile; purchaseType: CreditPurchaseType }> {
  return apiRequest('/payments/checkout-intent', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ purchaseType }),
  });
}

export async function createTopUpPaymentLink(
  token: string
): Promise<{
  ok: true;
  user: UserProfile;
  paymentLinkId: string;
  shortUrl: string;
  status: string;
  referenceId?: string;
}> {
  return apiRequest('/payments/top-ups/10', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({}),
  });
}

export async function createMonthlySubscription(
  token: string
): Promise<{
  ok: true;
  user: UserProfile;
  subscriptionId: string;
  shortUrl: string;
  status: string;
  reused?: boolean;
}> {
  return apiRequest('/payments/subscriptions/monthly', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({}),
  });
}

export async function syncMonthlySubscription(
  token: string
): Promise<{
  ok: true;
  user: UserProfile;
  synced: boolean;
  status?: string;
}> {
  return apiRequest('/payments/subscriptions/sync', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({}),
  });
}

export async function deleteProfile(token: string): Promise<{ success: boolean }> {
  return apiRequest('/profile', {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export async function saveOnboardingStep(
  token: string,
  pageData: Partial<UserProfile>,
  step: number,
  onboardingComplete?: boolean
): Promise<{ user: UserProfile }> {
  return apiRequest('/profile/onboard', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ pageData, step, onboardingComplete }),
  });
}

export async function processVaultDocument(
  token: string,
  payload: { docType: string; fileUrl: string; storagePath?: string; mimeType?: string; dataUri?: string }
): Promise<{ user: UserProfile; document?: any }> {
  return apiRequest('/vault/process', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
}

export async function uploadVaultDocument(
  token: string,
  payload: { docType: string; file: File }
): Promise<{ fileUrl: string; storagePath: string; user: UserProfile }> {
  const dataUri = await fileToDataUri(payload.file);

  return apiRequest('/vault/upload', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      docType: payload.docType,
      fileName: payload.file.name,
      mimeType: payload.file.type || 'application/octet-stream',
      dataUri,
    }),
  });
}

function buildActivityQuery(filters: ActivityFilters): string {
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value == null || value === '') return;
    params.set(key, String(value));
  });

  const query = params.toString();
  return query ? `?${query}` : '';
}

export async function fetchActivitySessions(
  token: string,
  filters: ActivityFilters = {}
): Promise<ActivitySessionsResponse> {
  return apiRequest(`/activity/sessions${buildActivityQuery(filters)}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: 'no-store',
  });
}

export async function fetchActivitySessionDetail(
  token: string,
  sessionId: string
): Promise<ActivitySessionDetailResponse> {
  return apiRequest(`/activity/sessions/${sessionId}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: 'no-store',
  });
}

export async function fetchDocumentCreditEvents(token: string): Promise<DocumentCreditEventsResponse> {
  return apiRequest('/activity/document-events', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: 'no-store',
  });
}

export async function createActivitySession(
  token: string,
  payload: {
    formTitle: string;
    websiteName: string;
    formUrl: string;
    examCategory: string;
    status: SessionStatus;
    modelName: string;
    startedAt?: string;
    submittedAt?: string;
    updatedAt?: string;
    agentLogs?: Array<{
      agentName: string;
      modelName: string;
      inputTokens?: number;
      outputTokens?: number;
      totalTokens?: number;
      creditsUsed?: number;
      createdAt?: string;
      metadata?: Record<string, unknown>;
    }>;
    documents?: Array<{
      documentName: string;
      eventType: Extract<CreditEventType, 'doc_upload_extract' | 'extension_chat_doc'>;
      modelName: string;
      inputTokens?: number;
      outputTokens?: number;
      totalTokens?: number;
      creditsUsed?: number;
      createdAt?: string;
      metadata?: Record<string, unknown>;
    }>;
    metadata?: Record<string, unknown>;
  }
): Promise<{ session: FormSession }> {
  return apiRequest('/activity/sessions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
}

export async function logCreditEvent(
  token: string,
  payload: {
    sessionId?: string | null;
    eventType: CreditEventType;
    agentName: string;
    modelName: string;
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
    creditsUsed?: number;
    createdAt?: string;
    metadata?: Record<string, unknown>;
  }
): Promise<{ event: CreditEvent }> {
  return apiRequest('/activity/credit-events', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
}
