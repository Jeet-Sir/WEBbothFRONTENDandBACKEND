# Codebase Understanding Baseline

Updated: March 10, 2026

This document is the current-state architecture brief for the repository. It is meant to be the baseline reference before new feature work. Where documentation conflicts with code, the implementation in the repository should be treated as the source of truth.

## 1. Repository Shape

The repository is a root npm workspace:

- `package.json`
  - Declares the workspace as `apps/*`
  - Provides root scripts for `dev:backend`, `dev:website`, `build:backend`, and `build:website`
- `apps/backend`
  - Custom TypeScript Node backend
- `apps/website`
  - Next.js 15 frontend
- `apps/docker-compose.yml`
  - Local stack orchestration for Postgres, backend, and website
- `docs/`
  - Mixed project docs; some are current, some are stale

There is no visible Turbo, Nx, or other workspace orchestrator in use. Coordination is done through npm workspaces and Docker Compose.

## 2. Runtime Architecture

### Backend

The backend is a custom HTTP server implemented in [`apps/backend/src/index.ts`](/workspaces/sabapplierBothBackAndWeb_migration/apps/backend/src/index.ts). It does not use Express, Fastify, or Nest.

Current backend responsibilities:

- Manual route handling
- CORS and security headers
- In-memory IP-based rate limiting
- Google OAuth identity verification or auth code exchange
- Custom HMAC JWT issuance and verification
- User profile persistence
- Firebase Admin Storage upload and cleanup
- Gemini/Genkit-driven document extraction

Supporting backend modules:

- [`apps/backend/src/config.ts`](/workspaces/sabapplierBothBackAndWeb_migration/apps/backend/src/config.ts)
  - Loads `apps/backend/.env`
  - Exposes ports, DB config, JWT secret, Google OAuth config, CORS origins, Firebase settings, and rate-limit settings
- [`apps/backend/src/db.ts`](/workspaces/sabapplierBothBackAndWeb_migration/apps/backend/src/db.ts)
  - Initializes PostgreSQL when DB env vars are present
  - Creates `app_users` if needed
  - Falls back to local JSON storage if DB is unavailable or not configured
- [`apps/backend/src/store.ts`](/workspaces/sabapplierBothBackAndWeb_migration/apps/backend/src/store.ts)
  - Provides `getUser`, `getUserByGoogleId`, `upsertUser`, `patchUser`, and `deleteUser`
  - Uses Postgres when enabled, otherwise `apps/backend/data/users.json`
- [`apps/backend/src/auth.ts`](/workspaces/sabapplierBothBackAndWeb_migration/apps/backend/src/auth.ts)
  - Issues and verifies custom HS256 JWTs
- [`apps/backend/src/google.ts`](/workspaces/sabapplierBothBackAndWeb_migration/apps/backend/src/google.ts)
  - Verifies Google ID tokens
  - Exchanges Google auth codes for identity
- [`apps/backend/src/storage.ts`](/workspaces/sabapplierBothBackAndWeb_migration/apps/backend/src/storage.ts)
  - Uploads documents to Firebase Admin Storage
  - Deletes all stored user files on account deletion
- [`apps/backend/src/validation.ts`](/workspaces/sabapplierBothBackAndWeb_migration/apps/backend/src/validation.ts)
  - Zod schemas for auth, profile patching, onboarding, vault processing, and upload payloads
- [`apps/backend/src/ai/file-manager.ts`](/workspaces/sabapplierBothBackAndWeb_migration/apps/backend/src/ai/file-manager.ts)
  - Downloads an uploaded file and sends it to Gemini Files API
- [`apps/backend/src/ai/flows/extract-data-from-document.ts`](/workspaces/sabapplierBothBackAndWeb_migration/apps/backend/src/ai/flows/extract-data-from-document.ts)
  - Defines the Genkit extraction flow

### Frontend

The frontend is a Next.js 15 application in [`apps/website`](/workspaces/sabapplierBothBackAndWeb_migration/apps/website).

The active authenticated app is centralized in [`apps/website/src/app/page.tsx`](/workspaces/sabapplierBothBackAndWeb_migration/apps/website/src/app/page.tsx):

- Reads and stores the SabApplier JWT in browser `localStorage`
- Loads the Google client script and launches Google sign-in
- Fetches the backend profile after login
- Gates access on `onboardingComplete`
- Renders one of:
  - public landing page
  - onboarding wizard
  - authenticated dashboard

Main frontend runtime areas:

- [`apps/website/src/lib/api.ts`](/workspaces/sabapplierBothBackAndWeb_migration/apps/website/src/lib/api.ts)
  - Backend API client for auth, profile, onboarding, and vault processing
- [`apps/website/src/components/onboarding/OnboardingWizard.tsx`](/workspaces/sabapplierBothBackAndWeb_migration/apps/website/src/components/onboarding/OnboardingWizard.tsx)
  - Three-step onboarding UI
  - Persists through generic profile saves via the parent `saveUser`
- [`apps/website/src/components/dashboard/Vault.tsx`](/workspaces/sabapplierBothBackAndWeb_migration/apps/website/src/components/dashboard/Vault.tsx)
  - Main document vault UI
  - Uploads directly to Firebase from the browser
  - Calls backend `/vault/process` after upload
- [`apps/website/src/components/dashboard/Profile.tsx`](/workspaces/sabapplierBothBackAndWeb_migration/apps/website/src/components/dashboard/Profile.tsx)
  - Profile display and edit UI
- [`apps/website/src/components/dashboard/Home.tsx`](/workspaces/sabapplierBothBackAndWeb_migration/apps/website/src/components/dashboard/Home.tsx)
  - Logged-in home screen
- [`apps/website/src/firebase/storage.ts`](/workspaces/sabapplierBothBackAndWeb_migration/apps/website/src/firebase/storage.ts)
  - Client-side Firebase Storage upload helper
- [`apps/website/src/app/api/proxy-file/route.ts`](/workspaces/sabapplierBothBackAndWeb_migration/apps/website/src/app/api/proxy-file/route.ts)
  - Server-side proxy for downloads

Route-level sign-in pages exist, but the real auth flow still returns to the app page:

- [`apps/website/src/app/signin/page.tsx`](/workspaces/sabapplierBothBackAndWeb_migration/apps/website/src/app/signin/page.tsx)
- [`apps/website/src/app/signup/page.tsx`](/workspaces/sabapplierBothBackAndWeb_migration/apps/website/src/app/signup/page.tsx)
- [`apps/website/src/app/login/page.tsx`](/workspaces/sabapplierBothBackAndWeb_migration/apps/website/src/app/login/page.tsx)

## 3. Primary User Journey

The active product path works like this:

1. User lands on the website.
2. User signs in with Google from the website flow in `src/app/page.tsx`.
3. Frontend sends Google auth code to backend `/auth/google/code`.
4. Backend verifies Google identity, creates or updates the user, and returns:
   - a custom JWT
   - the latest `UserProfile`
5. Frontend stores the JWT in `localStorage` under `sabapplier_token`.
6. Frontend also syncs auth/profile data to extension-oriented `localStorage` keys prefixed with `sabapplier_extension_`.
7. Frontend fetches `/profile` using the JWT.
8. If `onboardingComplete` is false, the onboarding wizard is shown.
9. Onboarding edits save through profile persistence, and the user reaches the dashboard when onboarding is complete.
10. Inside the vault:
    - browser uploads file to Firebase Storage
    - frontend receives `fileUrl` and `storagePath`
    - frontend posts metadata to backend `/vault/process`
    - backend runs AI extraction and patches the user profile’s `documents`
11. Profile, vault, and dashboard views read from backend-owned `UserProfile` state.

## 4. Public Interfaces In Current Use

### Backend HTTP routes

Implemented in [`apps/backend/src/index.ts`](/workspaces/sabapplierBothBackAndWeb_migration/apps/backend/src/index.ts):

- `GET /health`
- `POST /auth/google`
- `POST /auth/google/code`
- `GET /profile`
- `POST /profile`
- `DELETE /profile`
- `POST /profile/onboard`
- `POST /vault/process`
- `POST /vault/upload`

Notes:

- `POST /vault/upload` exists but is not the primary frontend path; the active website uploads directly to Firebase from the client.
- Authenticated routes expect `Authorization: Bearer <token>`.

### Shared data contract

The active shared shape is represented by:

- Backend: [`apps/backend/src/types.ts`](/workspaces/sabapplierBothBackAndWeb_migration/apps/backend/src/types.ts)
- Frontend: [`apps/website/src/lib/types.ts`](/workspaces/sabapplierBothBackAndWeb_migration/apps/website/src/lib/types.ts)

Core contract details:

- `UserProfile`
  - identity fields
  - onboarding state
  - profession and demographic fields
  - `documents: Record<string, UserDocument>`
- `UserDocument`
  - `fileUrl`
  - `storagePath`
  - `extractedData`
  - `status: 'idle' | 'processing' | 'verified' | 'rejected'`
  - timestamps and optional error

### Browser extension bridge

The website writes extension sync state to browser `localStorage` in [`apps/website/src/app/page.tsx`](/workspaces/sabapplierBothBackAndWeb_migration/apps/website/src/app/page.tsx).

Observed keys:

- `sabapplier_extension_jwt`
- `sabapplier_extension_user`
- `sabapplier_extension_sync_timestamp`
- `sabapplier_extension_logout`
- `sabapplier_extension_logout_timestamp`

This is the current coupling point between the website and the browser extension ecosystem.

## 5. Source Of Truth And Data Ownership

Current ownership is split as follows:

- Backend
  - owns user profile persistence
  - owns auth token issuance and verification
  - owns AI extraction results written into profile documents
- Firebase Storage from frontend
  - owns raw file upload transport in the active website flow
- Firebase Admin from backend
  - owns backend-driven upload route and user-file cleanup
- Legacy Firestore surface
  - present in the frontend repo
  - not part of the active profile read/write flow

The active product source of truth for user state is the backend profile store, not Firestore.

## 6. Important Mismatches, Legacy Paths, And Dead Surface Area

These should be understood before feature work.

### Documentation mismatches

- [`docs/blueprint.md`](/workspaces/sabapplierBothBackAndWeb_migration/docs/blueprint.md)
  - stale
  - describes AWS S3 and Gmail SMTP
  - actual implementation uses Firebase Storage and does not implement SMTP
- [`docs/backend.json`](/workspaces/sabapplierBothBackAndWeb_migration/docs/backend.json)
  - stale or superseded
  - describes Firestore as the persistence layer for `/users/{userId}`
  - actual implementation persists profiles through backend Postgres or JSON fallback

### Frontend legacy or unused paths

- [`apps/website/src/firebase/firestore/user-profile.ts`](/workspaces/sabapplierBothBackAndWeb_migration/apps/website/src/firebase/firestore/user-profile.ts)
  - legacy helper
  - not used by the current authenticated product path
- [`apps/website/src/firebase/auth/use-user.tsx`](/workspaces/sabapplierBothBackAndWeb_migration/apps/website/src/firebase/auth/use-user.tsx)
  - not part of the current Google auth flow through the backend
- [`apps/website/src/components/onboarding/DocumentUpload.tsx`](/workspaces/sabapplierBothBackAndWeb_migration/apps/website/src/components/onboarding/DocumentUpload.tsx)
  - appears unused in the active onboarding flow
- [`apps/website/src/actions/process-document.ts`](/workspaces/sabapplierBothBackAndWeb_migration/apps/website/src/actions/process-document.ts)
  - appears unused
  - points to a Genkit endpoint pattern that is not the main current website path
- `saveOnboardingStep` in [`apps/website/src/lib/api.ts`](/workspaces/sabapplierBothBackAndWeb_migration/apps/website/src/lib/api.ts)
  - exists
  - current onboarding component instead uses the generic profile save path

### Key normalization mismatch in the vault

The vault UI uses human-readable document names such as `Aadhaar Card` and `Passport Photo`, but [`apps/website/src/components/dashboard/Vault.tsx`](/workspaces/sabapplierBothBackAndWeb_migration/apps/website/src/components/dashboard/Vault.tsx) normalizes names before backend processing, for example lowercasing and replacing spaces with underscores.

Result:

- frontend UI keys and backend-processed document keys can differ
- some views work around this by checking multiple possible keys
- future work around document identity should account for this mismatch first

## 7. Operational And Engineering Risks

### Committed sensitive configuration

[`apps/backend/.env`](/workspaces/sabapplierBothBackAndWeb_migration/apps/backend/.env) currently appears to contain real secrets and credentials. This should be treated as exposed secret material and rotated outside regular feature work.

### Weakened build-quality gates

[`apps/website/next.config.ts`](/workspaces/sabapplierBothBackAndWeb_migration/apps/website/next.config.ts) currently contains:

- `typescript.ignoreBuildErrors = true`
- `eslint.ignoreDuringBuilds = true`

That means production builds can succeed while known type or lint issues remain unresolved.

### Split storage and persistence model

The system currently mixes:

- backend-owned profile data
- browser-owned upload initiation to Firebase
- backend-owned cleanup and AI result patching
- legacy Firestore code that is still present

This is workable, but it increases ambiguity for future changes unless ownership boundaries are kept explicit.

### JSON fallback behavior

If Postgres is unavailable or DB env vars are missing, the backend silently falls back to local JSON storage in [`apps/backend/data/users.json`](/workspaces/sabapplierBothBackAndWeb_migration/apps/backend/data/users.json). That is useful for resilience and local development, but it is a meaningful behavioral switch that can mask infrastructure issues if unnoticed.

## 8. Current Health Status

Verification run on March 10, 2026:

- `npm run build --workspace=backend`
  - passes
- `npm run typecheck --workspace=website`
  - fails

Current website typecheck failures:

1. [`apps/website/src/app/blog/[id]/page.tsx`](/workspaces/sabapplierBothBackAndWeb_migration/apps/website/src/app/blog/[id]/page.tsx)
   - dynamic route `params` typing does not match Next.js generated `PageProps`
2. [`apps/website/src/components/ui/calendar.tsx`](/workspaces/sabapplierBothBackAndWeb_migration/apps/website/src/components/ui/calendar.tsx)
   - invalid `react-day-picker` custom component shape for the current version
   - implicit `any` on icon props

This means the backend is currently compilable, but the website is not type-clean.

## 9. Flow Verification Baseline

The following behaviors are implemented by the current code:

- Sign-in returns a backend JWT and user profile.
- Unfinished onboarding blocks dashboard access.
- Profile edits persist through `POST /profile`.
- Vault upload path is:
  - browser upload to Firebase Storage
  - backend `POST /vault/process`
- Account deletion:
  - deletes the profile from the backend store
  - attempts to delete Firebase stored files for the user

## 10. Documentation Verification

Current document status:

- [`README.md`](/workspaces/sabapplierBothBackAndWeb_migration/README.md)
  - mostly accurate but high-level and incomplete
- [`apps/README.md`](/workspaces/sabapplierBothBackAndWeb_migration/apps/README.md)
  - partially accurate
  - useful for route and file map orientation
  - contains stale or overly specific deployment/runtime assumptions
- [`docs/blueprint.md`](/workspaces/sabapplierBothBackAndWeb_migration/docs/blueprint.md)
  - stale
- [`docs/backend.json`](/workspaces/sabapplierBothBackAndWeb_migration/docs/backend.json)
  - superseded by the current backend implementation

For future work, this document should be used as the architecture baseline until the older docs are reconciled or removed.

## 11. Recommended Baseline Verification Commands

Use these to reconfirm the current state before major development changes:

```bash
npm run build --workspace=backend
npm run typecheck --workspace=website
```

Optional runtime checks:

```bash
npm run dev:backend
npm run dev:website
```

Then validate:

- `GET /health`
- Google sign-in from the website
- onboarding gating behavior
- profile save behavior
- vault upload plus backend extraction flow
- account deletion cleanup behavior
