# AI Screening Real Estate

AI-native, multi-tenant real estate lead-gen platform for agent setup and buyer qualification.

## Stack

- Next.js 15 App Router + TypeScript
- Tailwind CSS with restyled shadcn-style primitives
- Railway-hosted Next.js app/API routes
- Railway Postgres for production persistence
- Optional legacy Supabase support for older deployments
- Vercel AI SDK with Anthropic
- Twilio Verify
- Playwright + Vitest

## Setup

1. Install dependencies:

   ```bash
   ./scripts/setup.sh
   ```

2. Copy environment variables:

   ```bash
   cp .env.example .env.local
   ```

3. Configure local persistence:

   - For Railway-style local persistence, set `DATABASE_URL` and run `npm run db:migrate`.
   - If `DATABASE_URL` is blank, local development uses deterministic in-memory seed data.
   - Supabase env vars are now optional legacy compatibility only.

4. Configure Anthropic:

   - Add `ANTHROPIC_API_KEY`.
   - Without it, local development uses deterministic fallback extraction and match reasons.

5. Configure Twilio Verify:

   - Add `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, and `TWILIO_VERIFY_SERVICE_SID`.
   - Without them, local development accepts code `123456`.

6. Seed pilot agents:

   ```bash
   npm run seed
   ```

7. Run the app:

   ```bash
   ./scripts/dev.sh
   ```

## Onboard a New Agent

1. Fill out `docs/onboarding-checklist.md`.
2. Add the payload to `lib/pilot-agents.ts` or call `onboardAgent(payload)` from the Phase 2 wizard.
3. Run `npm run seed` for local/pilot seeding.

All agent creation goes through `onboardAgent(payload)`, which validates the payload and calls the same transaction-backed primitive used by the seed script.

Production routing is split intentionally:

- `/` is the agent-facing setup entry.
- `/signup` starts magic-link setup directly.
- `/{agentSlug}` is the buyer-facing link an agent shares after setup, for example `https://your-app.up.railway.app/maya`.

## Verification

```bash
./scripts/test.sh
./scripts/e2e.sh
npm run build
```

For UI work, run `./scripts/dev.sh` and verify `/`, `/signup`, `/maya`, and `/david` in the Codex in-app browser at mobile and desktop widths.

## Production Deploy: Railway

This app is now Railway-first: one Railway web service runs the Next.js frontend and API routes, and one Railway Postgres service stores agents, listings, leads, events, setup drafts, sessions, and magic links.

1. Create a Railway project from the GitHub repo.
2. Add a Railway Postgres service. Railway provides `DATABASE_URL`.
3. Deploy the web service from `main`.
4. Railway will use:

   ```bash
   npm run build
   npm run start
   ```

   `npm run start` runs `scripts/railway-migrate.mjs` before `next start`, so the Postgres schema is created automatically.

5. Set production env vars:

   ```env
   DATABASE_URL=${{Postgres.DATABASE_URL}}
   NEXT_PUBLIC_APP_URL=https://your-app.up.railway.app
   ANTHROPIC_API_KEY=
   RESEND_API_KEY=
   EMAIL_FROM=Your Product <noreply@yourdomain.com>
   TWILIO_ACCOUNT_SID=
   TWILIO_AUTH_TOKEN=
   TWILIO_VERIFY_SERVICE_SID=
   ```

   `RESEND_API_KEY` is required for production agent signup. Without it, the app refuses to create a setup session instead of silently using the local development bypass.

6. Leave these unset in production:

   ```env
   DISABLE_AI=
   DISABLE_TWILIO=
   ALLOW_DEV_AGENT_AUTH=
   NEXT_PUBLIC_SUPABASE_URL=
   NEXT_PUBLIC_SUPABASE_ANON_KEY=
   SUPABASE_SERVICE_ROLE_KEY=
   ```

7. Seed pilots, if desired, from a shell with production env vars:

   ```bash
   npm run seed
   ```

Health check:

```text
GET /api/health
```

## Decisions I Made

- Deployment target is Railway for the Next.js app/API routes and Railway Postgres for persistence. Supabase remains optional legacy compatibility, not the default production path.
- Local development has deterministic fallbacks when Railway Postgres, Anthropic, or Twilio secrets are missing. Production still uses server-side service integrations.
- Phase 1 uses path-based tenant routing only, but all tenant lookup goes through `resolveAgent(request)` for later subdomain/custom-domain support.
- The AI-generated lead brief and match reasons are idempotent side effects of lead creation. A later queue/outbox can replace this without changing product APIs.
