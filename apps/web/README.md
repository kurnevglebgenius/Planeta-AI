# Web foundation

Next.js App Router, React and strict TypeScript. The root page is a neutral foundation placeholder, not a Phase 1 business screen. No Auth or Supabase client is installed.

From the repository root: `npm ci`, then `npm run lint`, `npm run typecheck`, `npm run build`. For local development run `npm run dev -w @planeta/web`.

`.env.example` documents a public placeholder only. Never put a secret in a `NEXT_PUBLIC_` variable; those values are bundled for browsers. No environment variable is required to build this foundation.
