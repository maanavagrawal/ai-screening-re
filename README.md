# AI Screening Real Estate

Buyer-facing Phase 1 of an AI-native, multi-tenant real estate lead-gen platform.

## Stack

- Next.js 15 App Router + TypeScript
- Tailwind CSS with restyled shadcn-style primitives
- Supabase Postgres, RLS, and Storage
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

3. Configure Supabase:

   - Create a Supabase project.
   - Run the SQL files in `supabase/migrations`.
   - Add `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`.

4. Configure Anthropic:

   - Add `ANTHROPIC_API_KEY`.
   - Without it, local development uses deterministic fallback extraction and match reasons.

5. Configure Twilio Verify:

   - Add `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, and `TWILIO_VERIFY_SERVICE_SID`.
   - Without them, local development accepts code `123456`.

6. Seed pilot agents:

   ```bash
   pnpm seed
   ```

7. Run the app:

   ```bash
   ./scripts/dev.sh
   ```

## Onboard a New Agent

1. Fill out `docs/onboarding-checklist.md`.
2. Add the payload to `lib/pilot-agents.ts` or call `onboardAgent(payload)` from the Phase 2 wizard.
3. Run `pnpm seed` for local/pilot seeding.

All agent creation goes through `onboardAgent(payload)`, which validates the payload and calls the same transaction-backed primitive used by the seed script.

## Verification

```bash
./scripts/test.sh
./scripts/e2e.sh
pnpm build
```

For UI work, run `./scripts/dev.sh` and verify `/maya` and `/david` in the Codex in-app browser at mobile and desktop widths.

## Decisions I Made

- Deployment target is Vercel for the Next.js app/API routes and Supabase for Postgres/Storage/RLS. Railway is reserved for a future persistent worker if async lead processing outgrows request-safe jobs.
- Local development has deterministic fallbacks when Supabase, Anthropic, or Twilio secrets are missing. Production still uses server-side service integrations.
- Phase 1 uses path-based tenant routing only, but all tenant lookup goes through `resolveAgent(request)` for later subdomain/custom-domain support.
- The AI-generated lead brief and match reasons are idempotent side effects of lead creation. A later queue/outbox can replace this without changing product APIs.
