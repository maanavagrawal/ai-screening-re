# Tasks

## Priority 1

- [x] Production root should start agent setup, not Maya
  - Goal: make the Railway root domain agent-facing while preserving `/{agentSlug}` as the buyer-facing link agents share.
  - Acceptance:
    - `/` no longer redirects to `/maya`.
    - `/` gives agents a clear setup entry and explains their final link becomes `/{slug}`.
    - `/signup` still works for direct magic-link setup.
    - Unknown slugs do not send users to Maya.
    - Typecheck, lint, and targeted e2e coverage pass.

- [x] Phase 2 agent-facing setup wizard and inbox dashboard
  - Goal: build the agent self-serve setup wizard and inbox-style dashboard without adding CRM/pipeline/billing/custom-domain scope.
  - Acceptance:
    - Magic-link signup and setup draft resume flow work locally with dev fallback and Railway Postgres/Resend production paths.
    - Wizard screens collect basics, voice, 3 listings, neighborhoods, verified phone, link, and first-lead simulation.
    - Setup completion calls `onboardAgent()`; seed and wizard-created agents share one primitive.
    - `agents.voice_notes` feeds Phase 1 agent brief, match-reason, and what's-new prompts.
    - Dashboard is auth-gated and scoped by `agents.user_id`; no cross-agent data is visible.
    - Leads view is inbox-style with priority filters, search, keyboard navigation, detail panel, copy opener, contacted/snooze/junk actions.
    - Listings view supports add/edit/delete using the same listing extraction primitive as setup.
    - Distribution view includes universal links, QR, bio/reply templates, email signature, and simple source breakdown.
    - Settings view supports profile, voice notes, neighborhoods, phone re-verification, accent, slug redirect, notifications, pause/delete controls.
    - Temperature computation is pure, unit-tested, and invoked for lead creation/event ingestion.
    - Email/SMS notification dispatcher has server-only secrets and local-safe fallbacks.
    - `npm run typecheck`, `npm run lint`, `npm run test`, `npm run e2e`, `npm run build`, and live browser QA pass.

- [x] Phase 2 pre-build planning gate
  - Show updated file structure additions.
  - Show updated `AgentSetupPayload` and `onboardAgent()` extension.
  - Show `computeTemperature()` design with 3 realistic example computations.
  - Show Phase 2 AI prompts and Phase 1 voice-notes prompt diffs.
  - Show lead detail panel wireframe.
  - Run gstack design review and engineering review, choosing recommended options autonomously.
  - Proceed directly into implementation after the plan because the user approved that workflow.

- [x] Phase 1 buyer-facing real estate lead-gen platform
  - Goal: build the multi-tenant buyer experience only: landing, adaptive intake, contact gate, matches, showing request, events, seed data, docs, and verification.
  - Acceptance:
    - Next.js 15 App Router app runs with `pnpm dev`.
    - Supabase migrations define all Phase 1 tables, indexes, storage, and RLS policies.
    - Railway migration script defines the production Postgres schema for the Railway-first deployment path.
    - `resolveAgent(request)`, `onboardAgent(payload)`, and `matchScore()` exist with tests.
    - Seed script calls `onboardAgent()` for `maya` and `david`.
    - `/maya` and `/david` are isolated buyer-facing islands with no cross-agent UI.
    - Intake uses one full-screen question at a time, adaptive sequencing, and one free-text extraction moment.
    - Contact gate captures phone/email without SMS verification.
    - Matches feed ranks deterministically, pins qualifying pocket listings, and renders generated match reasons.
    - Showing request defers Twilio verification until scheduling intent.
    - Events are batched client-side and persisted server-side.
    - Returning visitors get personalized landing copy.
    - `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm e2e`, and browser QA pass for both agents.

## Execution Plan

### Phase 2

- [x] 0. Planning gate: architecture artifacts, gstack design review, gstack eng review, implementation go-ahead.
- [x] 1. Migrations and types: agent auth ownership, setup drafts, invites, lead temperature/action fields, storage buckets, RLS lockdown.
- [x] 2. Extend `onboardAgent()` for `userId`, `voiceNotes`, headlines, notifications, and wizard metadata; update seed payloads.
- [x] 3. Add `computeTemperature()` pure function and unit tests; integrate with lead creation and event ingestion.
- [x] 4. Refactor Phase 1 prompts to consume `agent.voice_notes`.
- [x] 5. Add auth/session helpers and magic-link signup/setup access model.
- [x] 6. Build setup wizard shell, autosave draft APIs, live preview, and screens welcome/basics.
- [x] 7. Build voice generation screen and setup voice APIs.
- [x] 8. Build listing extraction/manual listing screens and neighborhoods screen.
- [x] 9. Build phone verification, link/slug/QR, setup completion, and first-lead simulation.
- [x] 10. Build dashboard shell, top bar, left rail, command palette, and keyboard shortcuts.
- [x] 11. Build Leads inbox, lead detail panel, opener regeneration, contacted/snooze/junk actions, and timeline.
- [x] 12. Build Listings CRUD and Distribution surfaces.
- [x] 13. Build Settings and notification dispatcher/email templates.
- [x] 14. Add e2e: setup new agent, create lead, dashboard review, copy opener, mark contacted.
- [x] 15. Browser QA desktop/mobile for wizard, dashboard, and both pilot agents.

- [x] 0. Confirm pre-build plan artifacts with user before implementation.
- [x] 1. Scaffold Next.js 15, Tailwind, shadcn-style primitives, fonts, package scripts, and env examples.
- [x] 2. Add Supabase schema, indexes, storage bucket migration, RLS policies, and typed DB helpers.
- [x] 3. Build `resolveAgent(request)` and `onboardAgent(payload)` multi-tenant primitives.
- [x] 4. Build `matchScore()` and unit tests.
- [x] 5. Add seed script for Maya and David through `onboardAgent()`.
- [x] 6. Build landing and returning-visitor branch.
- [x] 7. Build intake shell, structured questions, free-text extraction/review, and adaptive next-question API.
- [x] 8. Build contact gate and lead creation side effects.
- [x] 9. Build matches feed, match reasons, pocket-listing pinning, and listing cards.
- [x] 10. Build showing request sheet with deferred Twilio Verify.
- [x] 11. Build events system and `useTrackEvent()`.
- [x] 12. Add README, onboarding checklist, Phase 2 stub, and Phase 3 stub.
- [x] 13. Run full automated and browser verification for both seeded agents.

## Review

- 2026-05-12: Initialized autonomous Codex repo scaffolding with task tracking and command wrappers.
- 2026-05-12: Verified `./scripts/setup.sh`, `./scripts/test.sh`, and `./scripts/e2e.sh` handle the current empty repo state cleanly.
- 2026-05-12: Clarified local live-browser work versus Codex Cloud autonomous test/PR work in `AGENTS.md`.
- 2026-05-13: Added Phase 1 buyer-facing platform execution plan; implementation is blocked pending user greenlight on pre-build artifacts.
- 2026-05-13: User greenlit implementation directly. Built Phase 1 buyer-facing platform and verified `npm run typecheck`, `npm run lint`, `npm run test`, `npm run e2e`, and `npm run build`.
- 2026-05-13: Browser QA covered `/maya`, `/david`, intake-to-gate, matches, deferred verification, desktop/mobile e2e, and visual screenshots for landing/matches. Fixed stale e2e server reuse, intake double-submit races, Twilio/AI deterministic test fallbacks, LAN session ID fallback, and blank listing media placeholders.
- 2026-05-13: Started Phase 2 planning gate per user request. User then approved moving into implementation after the plan; do not commit or push until tests pass and browser QA is clean.
- 2026-05-13: Completed Phase 2 implementation: setup wizard, auth/session draft flow, voice/listing setup APIs, dashboard leads/listings/distribution/settings, temperature computation, notifications, docs, host-aware share links, and RLS migration updates. Verified `npm run typecheck`, `npm run lint`, `npm run test`, `npm run e2e`, `npm run build`, plus live in-app browser QA on `/dashboard/leads` and `/dashboard/distribution`. No commit or push was made.
- 2026-05-13: Switched deployment preference to Railway-first after Supabase setup friction. Added Railway web-service config, Railway Postgres migration script, health check, direct Postgres persistence paths, and Resend-backed magic-link auth for production.
- 2026-05-13: Fixed production root routing so `/` starts agent setup instead of redirecting to `/maya`; `/{agentSlug}` remains the buyer-facing share URL. Verified typecheck, lint, targeted desktop/mobile Playwright routing coverage, and production build.
