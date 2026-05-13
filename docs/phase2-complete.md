# Phase 2 Completion Plan

This document is the acceptance and QA checklist for Phase 2. It should be updated from "planned" to "shipped" once the implementation and verification pass.

## What Ships

Phase 2 adds the agent-facing product without turning the app into a CRM.

- Agent magic-link signup at `/signup`
- Setup wizard at `/setup/[step]`
- Agent-owned setup drafts with resume support
- Setup completion through the same `onboardAgent(payload)` primitive used by seed data
- Agent dashboard at `/dashboard`
- Inbox-style lead triage, lead detail panel, suggested opener copy, contacted and snooze actions
- Listings management with the same URL/manual listing primitive used by setup
- Distribution tools: share link, QR, UTM links, bio copy, reply templates, email signature
- Settings for profile, voice, neighborhoods, phone, accent, slug, notifications, pause, and soft delete
- Server-side lead temperature computation and notification dispatch hooks

Phase 2 explicitly does not ship billing, custom domains, advanced analytics, Gmail auto-reply, or a pipeline/Kanban CRM.

## Voice Notes Feedback Loop

`agents.voice_notes` is the Phase 2 field that improves Phase 1 quality.

- Setup voice generation produces `bio`, `headline`, `sub_headline`, and `voice_notes`.
- `onboardAgent(payload)` stores `voice_notes` for seeded and wizard-created agents.
- Phase 1 prompts for agent briefs, listing match reasons, and returning-visitor copy must read `agent.voice_notes`.
- If `voice_notes` is missing, prompts should fall back to the existing concise agent voice.

This keeps the buyer experience agent-specific without adding visible AI branding or chat UI.

## Required E2E Coverage

Add these Playwright flows once the Phase 2 routes land. Run them in desktop and mobile projects unless noted.

1. Signup and resume
   - Submit an email on `/signup`.
   - In local fallback mode, land on `/setup/welcome`.
   - Save basics, reload the browser, and verify the draft resumes with values intact.

2. Setup wizard happy path
   - Complete welcome, basics, voice generation fallback, three manual listings, neighborhoods, phone verification with code `123456`, link setup, and simulation.
   - Assert `/api/setup/complete` creates an agent reachable at `/{slug}`.
   - Assert the completed buyer page shows the wizard-provided name, market, accent, headshot, neighborhoods, and listings.

3. Setup validation
   - Basics cannot advance without name, market, and headshot.
   - Listings cannot advance with fewer than three valid listings.
   - Neighborhoods requires at least four selections.
   - Slug availability rejects an existing slug such as `maya`.

4. Dashboard lead inbox
   - Create or seed a lead for the signed-in agent.
   - Visit `/dashboard/leads`.
   - Verify filters for All, Hot, Warm, Browsing, and Showings.
   - Verify search can match email, phone, free text, and brief summary.
   - Open a lead, copy the suggested opener, mark contacted, snooze one day, and verify the row updates.

5. Lead detail panel
   - Verify contact fields, verified-phone badge, tier badge, brief, temperature reasons, collapsed preferences, raw free text, preapproval link when present, and grouped activity timeline.
   - Verify listing timeline links open the buyer-visible listing context without crossing tenants.

6. Listings dashboard
   - Add a manual listing, edit price/features/agent note, toggle pocket listing, and delete it.
   - Paste Instagram/TikTok/direct MP4 URLs and assert only media metadata is extracted.
   - Paste Zillow/Redfin/MLS-style URLs and assert the app asks for manual details without scraping.

7. Distribution dashboard
   - Copy the universal URL and each UTM link.
   - Generate/download QR.
   - Generate and copy bio templates and reply templates.
   - Verify attribution source rows render without chart UI.

8. Settings
   - Update profile fields, voice notes, neighborhoods, accent color, notification preferences, and paused state.
   - Change slug and verify the old slug is preserved in `domains` as a redirect path.
   - Re-verify phone with the local `123456` fallback.

9. Multi-tenant isolation
   - Sign in as or simulate two different agent users.
   - Verify each dashboard only reads its own leads, listings, events, showing requests, and setup draft.
   - Verify no dashboard route leaks Maya data into David's session or vice versa.

10. Phase 1 regression
   - Re-run the existing buyer flow for both seeded agents after Phase 2 schema changes.
   - Verify buyer pages still avoid visible AI branding and cross-agent UI.

## Unit And Integration Coverage

- `computeTemperature()` realistic sequences:
  - verified showing request maps to hot
  - returning buyer with long views and video replays maps to warm
  - stale browsing lead maps to browsing
  - abandoned showing request contributes a high-priority reason
- `onboardAgent()`:
  - accepts seed and wizard payloads
  - remains idempotent by slug
  - writes `domains`, listings, voice fields, notification defaults, and `user_id`
- Setup APIs:
  - draft save/load auth scoping
  - slug availability
  - listing extraction URL classification without scraping
- Dashboard APIs:
  - auth scoping by `agents.user_id`
  - contacted, snooze, notes, junk, listing CRUD, and settings updates

## Known Limitations To Preserve

- Local development may use deterministic AI/Twilio/email fallbacks.
- Browser e2e should run with `DISABLE_AI=1` and `DISABLE_TWILIO=1`.
- Email/SMS dispatch can be request-safe in Phase 2; a queue can replace it later.
- The temperature debounce can be simplified locally, but the pure computation must stay deterministic and tested.
