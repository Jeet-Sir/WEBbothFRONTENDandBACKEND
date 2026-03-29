

# run 

npm run dev --workspace=backend
npm run dev --workspace=website







# Sabapplier Apps (Backend + Website)

This `apps` folder contains two Node.js projects:
- `backend`: HTTP API server (TypeScript -> Node)
- `website`: Next.js frontend

## 1) Folder and file map (what each file does)

### Backend (`apps/backend`)
- `src/index.ts`
  - Main HTTP server.
  - Handles routes: `/health`, `/auth/google`, `/auth/google/code`, `/profile`, `/profile/onboard`, `/vault/process`, `/vault/upload`.
  - Applies CORS, security headers, auth, and rate limit.
- `src/config.ts`
  - Loads `backend/.env` and exposes runtime config (PORT, DB, JWT, Firebase bucket, CORS, rate limits).
- `src/db.ts`
  - PostgreSQL connection pool init.
- `src/store.ts`
  - DB operations for user profile read/write (`getUser`, `patchUser`, `upsertUser`, etc.).
- `src/auth.ts`
  - JWT issue/verify helpers.
- `src/google.ts`
  - Google auth token verification / auth code exchange.
- `src/validation.ts`
  - Zod schemas for request payload validation.
- `src/storage.ts`
  - Firebase Admin Storage upload helper for backend-driven uploads.
- `src/ai/flows/extract-data-from-document.ts`
  - AI extraction flow used by `/vault/process`.
- `package.json`
  - Scripts: `dev`, `build`, `start`.

### Website (`apps/website`)
- `src/app/page.tsx`
  - Main app screen flow.
- `src/lib/api.ts`
  - Frontend API client for backend endpoints (`/auth/*`, `/profile*`, `/vault/process`).
- `src/components/onboarding/DocumentUpload.tsx`
  - Onboarding document upload UI + upload trigger.
- `src/components/dashboard/Vault.tsx`
  - Dashboard vault upload/view/remove flow.
- `src/firebase/storage.ts`
  - Client-side Firebase Storage upload (`uploadUserDocument`).
- `src/firebase/config.ts`
  - Reads `NEXT_PUBLIC_FIREBASE_*` values and validates Firebase config presence.
- `package.json`
  - Scripts: `dev`, `build`, `start`, `lint`, `typecheck`.

## 2) Environment files

### Backend env: `apps/backend/.env`
Important keys:
- `PORT` (default `4000`)
- `CORS_ORIGINS` (comma-separated allowed origins, example `https://sabapplier.com,chrome-extension://<EXTENSION_ID>`)
  - Backward-compatible: `CORS_ORIGIN` also works for a single origin.
- `JWT_SECRET`
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_SSL_CA_PATH`, `DB_REJECT_UNAUTHORIZED`
- `MONGODB_URI`
- `MONGODB_DB_NAME` or `MONGO_DB_NAME` (defaults to `formAutofill`)
- Optional backend upload route keys:
  - `FIREBASE_STORAGE_BUCKET`
  - `FIREBASE_SERVICE_ACCOUNT_PATH`
  - `FIREBASE_SERVICE_ACCOUNT_JSON`
  - or `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`

### Website env: `apps/website/.env.local`
Important keys:
- `NEXT_PUBLIC_API_BASE_URL` (example `http://localhost:4000`)
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`

## 3) Run locally (development, OS-independent recommended)

Use Docker Compose so all teammates run the same stack on Windows, Ubuntu, or macOS.

### Prerequisites
- Docker Engine + Docker Compose plugin (Linux)
- OR Docker Desktop (Windows/macOS)

### Start everything from `apps/`
```bash
# Linux/macOS/Git-Bash
cp .env.example .env

# Windows CMD
copy .env.example .env

# Windows PowerShell
Copy-Item .env.example .env

docker compose up --build
```

Services:
- Website: `http://localhost:3000`
- Backend: `http://localhost:4000`
- PostgreSQL: `localhost:5432`

### Stop and clean
```bash
docker compose down
```

To also remove DB data volume:
```bash
docker compose down -v
```

## 4) Run locally (native npm, optional)

Use this only if you do not want Docker. This depends on local Node/PostgreSQL setup.

### Terminal 1: backend
```bash
cd backend
npm install
npm run dev
```
Backend runs on `http://localhost:4000` (from `backend/.env`).

### Terminal 2: website
```bash
cd website
npm install
npm run dev
```
Website runs on `http://localhost:3000`.

## 5) Run locally (production mode)

### Backend
```bash
cd backend
npm install
npm run build
node dist/index.js
```

### Website
```bash
cd website
npm install
npm run build
next start -p 3000
```
Or use script:
```bash
npm run start
```

## 6) Deploy to remote EC2 Ubuntu using PEM + PM2

Assumption: you already have EC2 access, PEM key, and PM2 installed.

### A. Connect to EC2
From your local machine:
```bash
ssh -i /path/to/your-key.pem ubuntu@<EC2_PUBLIC_IP>
```

### B. Put code on server
Option 1 (recommended): clone repo on EC2.
Option 2: copy with PEM:
```bash
scp -i /path/to/your-key.pem -r /local/path/to/apps ubuntu@<EC2_PUBLIC_IP>:/home/ubuntu/
```

### C. Install dependencies
```bash
cd /home/ubuntu/apps/backend && npm install
cd /home/ubuntu/apps/website && npm install
```

### D. Set environment files on EC2
Create/update:
- `/home/ubuntu/apps/backend/.env`
- `/home/ubuntu/apps/website/.env.local`

Important for remote:
- backend `CORS_ORIGINS` should include your website domain and extension origin.
- website `NEXT_PUBLIC_API_BASE_URL` should point to backend public URL (or Nginx path).
- use a strong `JWT_SECRET`.

### E. Build projects
```bash
cd /home/ubuntu/apps/backend && npm run build
cd /home/ubuntu/apps/website && npm run build
```

### F. Start with PM2 (use unique names/ports)
Because you already run 2 Node servers, avoid conflicts.

Check used ports:
```bash
ss -ltnp | grep -E ':3000|:3001|:4000|:4001|:5000'
```

If needed, set different ports in env first (example backend `PORT=4100`, website start on `3100`).

Start backend:
```bash
cd /home/ubuntu/apps/backend
pm2 start dist/index.js --name sabapplier-backend
```

Start website (Next standalone server):
```bash
cd /home/ubuntu/apps/website
pm2 start "npm run start -- -p 3000" --name sabapplier-website
```

### G. Persist PM2 processes
```bash
pm2 save
pm2 startup
```
Run the command shown by `pm2 startup` once, then run `pm2 save` again.

### H. Useful PM2 commands
```bash
pm2 list
pm2 logs sabapplier-backend --lines 200
pm2 logs sabapplier-website --lines 200
pm2 restart sabapplier-backend
pm2 restart sabapplier-website
pm2 stop sabapplier-backend
pm2 delete sabapplier-website
```

## 7) Optional: Nginx reverse proxy (recommended)

Use Nginx in front of PM2 apps:
- route `/` to website (port 3000)
- route `/api` (or dedicated subdomain) to backend (port 4000)

Then set:
- `NEXT_PUBLIC_API_BASE_URL` to your backend public URL.
- backend `CORS_ORIGINS` to your website public URL and extension origin.

## 8) Quick health checks

Backend:
```bash
curl http://127.0.0.1:4000/health
```
Expected:
```json
{"ok":true}
```

Website local response check:
```bash
curl -I http://127.0.0.1:3000
```

## 9) Common issues

- Docker Desktop on Windows is required for the Docker flow.
- If file changes are not picked up inside containers, restart with:
  - `docker compose down && docker compose up --build`

- `Upload failed` from `/vault/upload`:
  - Backend route needs `FIREBASE_STORAGE_BUCKET` plus Firebase Admin credentials.
  - Provide either `FIREBASE_SERVICE_ACCOUNT_PATH`, `FIREBASE_SERVICE_ACCOUNT_JSON`, or the triplet `FIREBASE_PROJECT_ID` / `FIREBASE_CLIENT_EMAIL` / `FIREBASE_PRIVATE_KEY`.
- CORS errors:
  - Fix backend `CORS_ORIGINS` to include exact frontend and extension origins.
- 401 token errors:
  - Ensure frontend sends `Authorization: Bearer <token>` and JWT secret is consistent.
- PM2 app starts then exits:
  - Check `pm2 logs <name>` for missing env or build artifacts.
