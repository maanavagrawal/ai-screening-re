# Tasks

## Priority 1

- [x] Phase 1 buyer-facing real estate lead-gen platform
  - Goal: build the multi-tenant buyer experience only: landing, adaptive intake, contact gate, matches, showing request, events, seed data, docs, and verification.
  - Acceptance:
    - Next.js 15 App Router app runs with `pnpm dev`.
    - Supabase migrations define all Phase 1 tables, indexes, storage, and RLS policies.
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
