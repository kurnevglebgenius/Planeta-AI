# Planeta AI — Phase 1 UI prototype

Isolated, mock-only React prototype for design approval. It does not connect to Supabase, FastAPI, PostgreSQL, Auth, OpenAI, or production data.

## Run

```powershell
cd prototypes/phase-1-ui
npm install
npm run dev
```

Open the local URL printed by Vite (normally `http://localhost:5173`).

Demo login: use any email to enter as SELLER; `owner` in the email opens the OWNER MFA step with code `000000`; `invalid` displays invalid credentials.

The developer-only role switcher in the sidebar demonstrates SELLER, OWNER + SELLER, and PRODUCTION presentations. All changes are in-memory mock interactions.
