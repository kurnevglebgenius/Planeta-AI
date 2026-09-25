# Phase 1 web

Next.js App Router, React and strict TypeScript. The production app has Supabase email/password login, OWNER TOTP verification, role-aware navigation, a workforce home, and an OWNER employee administration screen backed by FastAPI. Future business sections are navigation placeholders.

From the repository root: `npm ci`, then `npm run lint`, `npm run typecheck`, `npm run build`. For local development run `npm run dev -w @planeta/web`.

Copy `.env.example` to ignored `.env.local` for development. Only the Supabase URL, publishable key, and API base URL belong in `NEXT_PUBLIC_` values; they are bundled for browsers. Keep the Supabase secret key and database URL only in `services/api/.env` or a server-side secret manager. Never commit either local environment file.
