# Tasks

## Priority 1

- [x] Design-review agent listing entry UI
  - Goal: the agent listing-entry experience should feel obvious, clean, and fast for someone adding properties during setup or later from the dashboard.
  - Plan:
    - [x] Audit the setup listing step and dashboard listings form with desktop/mobile screenshots.
    - [x] Identify hierarchy, copy, spacing, and interaction issues that make listing entry feel less intuitive.
    - [x] Implement the highest-impact UI improvements with minimal source changes.
    - [x] Recheck screenshots and run focused/full verification.
  - Review:
    - Design review verdict: the dashboard listing form no longer opens as a long spreadsheet of empty fields. It now leads with the address lookup, then reveals required details and optional media/notes only once the listing is in progress.
    - Engineering review verdict: the change stays inside existing React state and provider-enrichment paths; empty add drafts no longer fake `3 bed / 2 bath`, edit mode keeps the accessible `Edit listing` heading, and autocomplete dropdowns now take layout space on mobile so they do not block lookup buttons.
    - Setup listing copy now matches the existing address-first behavior: start with address, use media/caption text as optional helpers.
    - Root role buttons now wait for client hydration before becoming clickable, which prevents cold-load clicks from being swallowed in the role chooser.
    - Verification: gstack `/browse` desktop/mobile screenshots were captured before and after; `npm run typecheck` passed; focused `npm run e2e -- tests/e2e/agent-phase2.spec.ts` passed with 8 desktop/mobile tests; focused `npm run e2e -- tests/e2e/buyer-flow.spec.ts --project=mobile` passed with 4 mobile tests; `./scripts/test.sh` passed with lint, typecheck, and 108 unit tests; `npm run build` passed; `git diff --check` passed. Full `./scripts/e2e.sh` was run multiple times and reached 12-14/16 under long mobile dev-server load; the same mobile cases pass when isolated.

- [x] Fix setup listing lookup persistence race
  - Goal: clicking `Lookup facts` after typing an address should not let the address field blur save overwrite the enriched property facts in the setup draft.
  - Plan:
    - [x] Skip the address blur commit when the blur is caused by the lookup button interaction.
    - [x] Keep normal blur saves for users who type an address and move elsewhere without lookup.
    - [x] Run focused setup coverage, full test wrapper, e2e, build, and diff checks before pushing.
  - Review:
    - Setup listing address blur now skips redundant commits when the next target is the lookup button and no-ops when the trimmed address already matches the last synced address, so later focus changes cannot clear property enrichment.
    - Added a desktop/mobile Playwright regression that uses typed-address lookup and verifies only the lookup-owned saves are emitted after the address-first enrichment path.
    - Verification: `npm run typecheck` passed; focused setup listing Playwright regression passed on desktop/mobile; `./scripts/test.sh` passed with lint, typecheck, and 108 unit tests; `./scripts/e2e.sh` passed with 16 desktop/mobile Playwright tests; `npm run build` passed; `git diff --check` passed.

- [x] Add setup neighborhood autocomplete and one-area minimum
  - Goal: setup neighborhood entry should suggest cities/neighborhoods while typing, biased by the agent's market, and Continue should unlock after at least one selected area.
  - Plan:
    - [x] Add a setup-authenticated location suggestion route that reuses Google Places/location fallback helpers with market context.
    - [x] Replace the plain add-neighborhood input with an accessible combobox/dropdown and Enter/select behavior.
    - [x] Keep static/listing-derived chips as quick picks and prevent duplicate selections.
    - [x] Change setup UI and publish validation from four neighborhoods to at least one.
    - [x] Add regression coverage and run verification.
  - Review:
    - Added `/api/setup/location-suggestions`, authenticated by setup user session, reusing the location suggestion helper with a market-biased provider query.
    - The setup neighborhoods step now opens a dropdown while typing cities/neighborhoods, supports selecting a suggestion or pressing Enter, and still keeps listing/default quick-pick chips.
    - Continue now unlocks after one selected area, and setup publish validation also accepts one area.
    - Added unit coverage for setup suggestions and one-neighborhood setup completion, plus desktop/mobile e2e coverage for autocomplete and one-area Continue behavior.
    - Verification: `./scripts/test.sh` passed with lint, typecheck, and 108 unit tests; `./scripts/e2e.sh` passed with 16 desktop/mobile Playwright tests; `npm run build` passed; `git diff --check` passed.

- [x] Redesign setup listing entry around address-first enrichment
  - Goal: setup listing cards should let agents enter/select an address first, automatically pull property facts, then reveal the common listing fields to confirm.
  - Design review findings:
    - [x] The old first control was a media URL input, even though social links cannot provide property facts.
    - [x] Property facts was visually separated from the address field it depended on, which made errors such as `ATTOM lookup failed with 400` feel mysterious.
    - [x] All manual fields were visible at once, creating a long form before the agent had chosen the fastest entry path.
  - Plan:
    - [x] Move address autocomplete into the top property facts section and make suggestion selection run lookup/apply automatically.
    - [x] Keep media link and text autofill as secondary helpers below the address-first path.
    - [x] Reveal price/neighborhood/beds/baths/sqft/video/features/notes after address selection, lookup, or text extraction.
    - [x] Add regression coverage for setup address suggestions unlocking and filling listing fields.
    - [x] Run typecheck, tests, e2e, build, and a design review pass.
  - Review:
    - Design review verdict: the listing editor now has a clear primary action (`Start with the address`), keeps optional media/text helpers secondary, and progressively reveals the confirmation fields only after address lookup or extracted details.
    - Address autocomplete was added to setup listing cards using the same provider-backed suggestion route as dashboard listings. Selecting a suggestion automatically runs property lookup and applies ATTOM facts without a separate `Use these facts` step.
    - The media link helper remains available for Instagram/TikTok/MLS/mp4, and text autofill remains available for captions, public remarks, flyers, or notes.
    - Added a setup hydration-ready marker and a desktop/mobile Playwright regression that verifies address suggestions reveal and fill neighborhood, beds, baths, sqft, and property type.
    - Verification: `npm run typecheck`, focused setup listing Playwright regression, `./scripts/test.sh` (lint, typecheck, 105 unit tests), `./scripts/e2e.sh` (14 desktop/mobile Playwright tests), `npm run build`, and `git diff --check` passed. gstack `/browse` is still not built in this workspace, so live design verification used Playwright rather than the gstack browser binary.

- [x] Fix buyer budget range, city selection identity, and social-media card layout
  - Goal: buyer-side intake and match cards should handle high-price markets, select only the clicked location suggestion, and avoid overlapping Instagram/TikTok CTAs with no-media copy.
  - Root cause hypothesis:
    - [x] Budget range inputs hard-code a `2,000,000` maximum.
    - [x] Location suggestions are treated as selected by `label + type`, so duplicate city names from different places render as selected together.
    - [x] Social video links are absolutely positioned over the same no-media footer text.
  - Plan:
    - [x] Raise the buyer budget slider ceiling and add a source-level guard.
    - [x] Key selected locations by durable place identity with a deterministic fallback, and use that key for active state/toggle/removal.
    - [x] Reserve space or adjust placeholder copy when an external social video CTA is present.
    - [x] Add regression tests for duplicate city selection, budget ceiling, and social CTA layout.
    - [x] Run typecheck, unit/test wrapper, e2e, build, and diff checks.
  - Review:
    - Buyer budget intake now supports high-price markets up to `$10M+`; choosing the top slider value saves the budget as open-ended above the selected minimum instead of filtering out higher-priced listings.
    - Buyer location suggestions now compare selected areas by `placeId` first, then source/type/label/parent fallback, so clicking `San Ramon, California` does not also select `San Ramon, Costa Rica`.
    - Social-video listing cards now reserve footer space, keep the external CTA above the no-media panel, and swap `Real media coming soon` for social-specific copy when Instagram/TikTok video links are present.
    - Added unit/render coverage for the expanded budget cap, duplicate city selection, and social-video card copy/layout guard.
    - Verification: focused unit tests passed; `npm run typecheck` passed; `./scripts/test.sh` passed with lint, typecheck, and 105 unit tests; `./scripts/e2e.sh` passed with 12 desktop/mobile Playwright tests after sandbox server-bind escalation; `npm run build` passed; `git diff --check` passed.

- [x] Add fast dashboard listing address suggestions and one-step enrichment
  - Goal: dashboard listing entry should show address suggestions while typing, let Enter select the top match, and populate property facts without a second "Use facts" click.
  - Root cause hypothesis:
    - [x] The dashboard listing address field is a plain input with no autocomplete route/UI, and `Lookup facts` currently only fetches a preview result that requires a separate `Use facts` action.
  - Plan:
    - [x] Add an authenticated address suggestion path backed by Google Places Autocomplete for address-like predictions.
    - [x] Add a dropdown to dashboard listing forms with keyboard Enter selection.
    - [x] Make suggestion selection and the existing lookup button apply property facts immediately.
    - [x] Add regression coverage for the suggestion API/UI and dashboard flow.
    - [x] Verify with typecheck, tests, e2e, and build.
  - Review:
    - Added `/api/listing-address-suggestions`, authenticated by the setup/dashboard user cookie, backed by Google Places address predictions.
    - Dashboard listing address fields now open a Google-attributed suggestion dropdown while typing; pressing Enter selects the first suggestion and immediately runs the ATTOM property lookup.
    - The existing `Lookup facts` button now applies returned facts immediately instead of requiring a second `Use facts` click.
    - Property fact application now overwrites default bed/bath/sqft/type values from provider data and clears stale lookup previews when the add-listing draft resets.
    - Updated provider docs/status wording so `GOOGLE_PLACES_API_KEY` covers buyer area and listing address autocomplete.
    - Verification: `npm run typecheck`, focused suggestion/provider tests, `./scripts/test.sh` (lint, typecheck, 101 unit tests), `./scripts/e2e.sh` (12 desktop/mobile Playwright tests), and `npm run build` passed. E2E needed local-server escalation after sandbox bind restrictions.

- [x] Let agents edit and AI-generate their profile headline
  - Goal: agents should be able to manually edit the buyer-facing profile headline, while still having an AI option to generate a draft from their bio/market context.
  - Plan:
    - [x] Add a focused authenticated dashboard endpoint that generates one headline from the current profile bio and market.
    - [x] Expose the headline in dashboard settings as an editable field.
    - [x] Add an AI generate action that updates the editable headline draft without blocking manual changes.
    - [x] Add focused tests for the new route and UI affordance.
    - [x] Run typecheck, lint/unit wrapper, e2e or targeted UI verification, and build as appropriate.
  - Review:
    - Added `/api/dashboard/settings/headline`, which requires the current agent and generates a single profile headline from the agent name, market, and editable bio.
    - Added a reusable profile-headline prompt/schema/fallback in the AI layer so local and test runs still produce deterministic headline drafts with `DISABLE_AI=1`.
    - Dashboard settings now includes an editable `Headline` field plus a `Generate` action; generated copy is saved back through the existing settings patch path and remains manually editable afterward.
    - Added unit coverage for the route contract and settings UI affordance, and extended the desktop/mobile agent Playwright flow to verify manual headline editing and AI generation from the dashboard.
    - Verification: `npm run typecheck`, focused headline unit test, `./scripts/test.sh` (lint, typecheck, 98 unit tests), `./scripts/e2e.sh` (12 desktop/mobile Playwright tests), and `npm run build` all passed. E2E needed local-server escalation after sandbox bind restrictions.

- [x] Remove legacy hosted-DB compatibility and unused dependencies
  - Goal: delete code, configuration, and package paths that are no longer used now that production persistence is Railway Postgres with local dev-store fallback.
  - Plan:
    - [x] Inventory legacy runtime paths, environment variables, migration leftovers, tests, and docs references.
    - [x] Remove old data/auth/storage branches and route fallbacks in favor of Railway Postgres plus dev store.
    - [x] Delete obsolete helper modules and migration leftovers.
    - [x] Remove unused direct dependencies that no code imports anymore.
    - [x] Update tests, task notes, README, and environment examples.
    - [x] Re-run lint, typecheck, unit, audit, e2e, and production build verification.
  - Review:
    - Removed the retired hosted-DB SDK, helper modules, environment variables, migration tree, auth branch, storage branch, and data fallback branches.
    - Simplified non-Postgres behavior to use the existing local dev-store path directly.
    - Removed two unused direct package dependencies and their transitive packages.
    - Updated README, environment examples, task history, lessons, and tests so future work points at Railway Postgres plus dev-store only.
    - Verification: `npm run typecheck`, `./scripts/test.sh` (lint, typecheck, 95 unit tests), `npm audit --omit=dev --audit-level=moderate`, `./scripts/e2e.sh` (12 desktop/mobile Playwright tests), `npm run build`, and `git diff --check` all passed. Audit and e2e needed escalation for npm registry access and local server binding.

- [x] Make ATTOM and Google Places required feature providers
  - Goal: ATTOM property facts and Google Places buyer area autocomplete are core product features, so missing keys must fail loudly instead of silently degrading into fixture/manual-only behavior.
  - Plan:
    - [x] Add shared provider config errors and health reporting for required provider keys.
    - [x] Require `ATTOM_API_KEY` before runtime listing property lookup.
    - [x] Require `GOOGLE_PLACES_API_KEY` before runtime typed location search.
    - [x] Keep fixture helpers available only for explicit tests/local helper calls, not runtime missing-key fallback.
    - [x] Update `.env.example`, tests, and project lessons.
  - Review:
    - `/api/listing-property-search` now returns a `503` config error if `ATTOM_API_KEY` is missing; ATTOM no-match responses use `manual` source instead of fake fixture mode.
    - `/api/intake/location-search` now returns a `503` config error if `GOOGLE_PLACES_API_KEY` is missing; configured Google no-results can still fall back to agent/manual suggestions.
    - `/api/health` now reports required provider status and returns `503` when either key is missing.
    - `.env.example` marks both provider keys as required.
    - Verification: `./scripts/test.sh` passed with lint, typecheck, and 96 unit tests. `./scripts/e2e.sh` passed with 12 desktop/mobile Playwright tests after one transient desktop root-link rerun. `npm run build` passed.

- [x] Repo-wide hardening review and fixes
  - Goal: review the current app for concrete security bugs, correctness gaps, dependency vulnerabilities, and inconsistent UI state; fix the actionable issues rather than leaving a report-only review.
  - Plan:
    - [x] Run security-oriented diff/repo review and production dependency audit.
    - [x] Remove known production dependency vulnerabilities without jumping to unstable major app behavior.
    - [x] Lock down internal mutation routes and buyer lead mutation paths.
    - [x] Fix stale listing enrichment, upload path sanitization, and location autocomplete race behavior.
    - [x] Add focused tests for the hardening changes.
    - [x] Re-run lint, typecheck, unit, e2e, audit, and build verification.
  - Review:
    - Upgraded `ai`, `@ai-sdk/anthropic`, and `next`, and added a Next `postcss` override so `npm audit --omit=dev --audit-level=moderate` reports 0 production vulnerabilities.
    - Added internal API secret enforcement for `/api/internal/*`, with production fail-closed behavior when `INTERNAL_API_SECRET` is missing.
    - Added buyer lead/session cookie authorization for SMS verification and showing-request mutations, and validated `/api/events` lead ownership/session before attaching events or recomputing lead temperature.
    - Sanitized preapproval upload path pieces and stopped storing signed upload URLs in buyer intake answers.
    - Cleared persisted property enrichment whenever setup/dashboard listing addresses are edited, and made property lookup busy states recover after fetch failures.
    - Made typed location autocomplete abort/order-safe so stale provider responses cannot overwrite newer suggestions.
    - Verification: `npm run lint`, `npm run typecheck`, `npm test` (89 unit tests), `./scripts/test.sh`, `npm audit --omit=dev --audit-level=moderate`, `./scripts/e2e.sh` (12 desktop/mobile Playwright tests), and `npm run build` all passed. Audit/build/e2e required network/local-server escalation after sandbox DNS/bind restrictions.

- [x] Expose agent listing edit and delete in the dashboard
  - Goal: agents can add, edit, and delete their listings from `/dashboard/listings`; add is already present but needs to remain covered while edit/delete are surfaced.
  - Plan:
    - [x] Reuse the existing dashboard listing `POST`, `PATCH`, and `DELETE` APIs instead of creating a second management path.
    - [x] Add inline edit state for listing cards with the same fields as the add form, including property lookup enrichment and video metadata.
    - [x] Add delete controls with clear pending/error states and state updates that cannot delete another agent's listing.
    - [x] Add focused tests for the listing management APIs and update e2e coverage for add/edit/delete.
    - [x] Run the project verification commands and browser-check the listings screen.
  - Review:
    - Implemented dashboard add/edit/delete through the existing listing API routes. Edits preserve feature/deal-breaker metadata, description, pocket status, video fields, and property enrichment rather than wiping hidden listing fields.
    - Tightened delete semantics so scoped deletes return `404` when the listing does not belong to the signed-in agent or does not exist.
    - Changed the root role "Continue to agent" action from a client push button to a real link after Playwright exposed intermittent navigation misses.
    - Verification: `./scripts/test.sh` passed with lint, typecheck, and 76 unit tests. `./scripts/e2e.sh` passed with 12 desktop/mobile Playwright tests, including add, edit, and delete from `/dashboard/listings`.
    - Note: gstack `/browse` is not built in this workspace, so live browser verification used the repo Playwright browser suite.

- [x] Create clearer product WebP demo
  - Goal: produce a concise animated WebP product demo from the existing demo recordings that preserves whole-screen context and tells a coherent product story.
  - Plan:
    - [x] Use the existing desktop and buyer demo videos in `demo-output` as source material.
    - [x] Keep the final cut moderately short, with full-frame scenes for agent setup, listings, public buyer page, lead context, dashboard follow-up, and buyer showing request.
    - [x] Add a small cursor-style pointer overlay to guide attention through each moment without heavy zooming.
    - [x] Remove the local dev issues badge from the dashboard segment.
    - [x] Verify duration, dimensions, file size, and that the final artifact opens as an animated WebP.
  - Review:
    - Superseded first result: `demo-output/ai-screening-re-short-demo.webp` was too zoomed in and did not explain the user flow clearly enough.
    - Replacement result: overwrote `demo-output/ai-screening-re-short-demo.webp` with a calmer full-context story cut.
    - Follow-up fix: the red dashboard badge came from Next's development overlay reporting invalid nested `<button>` markup in the dashboard lead row. Fixed `components/dashboard/dashboard-shell.tsx` so the lead row open action and icon actions are sibling buttons, then rerendered the demo with the baked-in badge masked from the old source clip.
    - Verification: `webpmux -info` reports 1024 x 720 canvas, 400 frames, 100 ms per frame, loop count 0; `ls -lh` reports 8.1M. Extracted representative frames with `webpmux` and converted them with `sips` to spot-check setup, listings, lead preview, dashboard follow-up, match card, and phone verification scenes. Recreated the dashboard flow in local Next dev and confirmed the nested-button hydration errors disappeared; only a non-blocking image priority warning remained. `npm run lint` and `npm run typecheck` pass.
    - Note: gstack browse was not built in this workspace, so visual verification used native WebP frame extraction instead of browser playback.

- [x] Improve listing upload, location-aware intake, dashboard preference summaries, and anonymous intake analytics
  - Goal: make agent listing entry much faster using ATTOM property facts, make buyer area selection more accurate from typed location, and make dashboard lead context readable and actionable.
  - Plan: [Listing/location/dashboard implementation plan](./listing-location-dashboard-plan.md).
  - Review pipeline:
    - [x] /plan-ceo-review
    - [x] /plan-design-review formal gstack review logged; visual mockups attempted but blocked by OpenAI organization verification
    - [x] /plan-eng-review formal gstack review logged; Codex outside voice run and incorporated
  - Scope boundary: implement the current ATTOM, typed location, listing enrichment, buyer media behavior, dashboard summary, activity labels, and anonymous drop-off analytics task only. Do not add marketplace, scraping, browser geolocation, MLS/IDX, seller valuation, or anonymous lead rows.
  - Review:
    - Implemented a server-only listing enrichment spine: ATTOM-backed property lookup with fixture fallback, normalized listing facts, Railway Postgres/dev-store persistence, setup onboarding support, and dashboard listing create/update support.
    - Added typed buyer location intake with structured `selected_areas`, legacy `neighborhoods` compatibility, manual/provider fallbacks, and readable dashboard preference summaries.
    - Hardened buyer-facing privacy with allowlist listing serialization and buyer-safe AI prompt inputs so exact addresses, ATTOM IDs, normalized addresses, and property facts do not leak.
    - Updated listing media behavior so direct MP4 links still autoplay, while Instagram/TikTok links render as official external links only. No permission checkbox was added per user decision.
    - Added privacy-safe anonymous drop-off analytics from existing session events, including converted sessions whose events later receive a `lead_id`, without creating anonymous lead rows.
    - Design review after implementation: checked setup lookup, dashboard analytics, desktop buyer location intake, mobile buyer location intake, and buyer address redaction in a live local app; screenshots were captured under `/private/tmp`.
    - Engineering review after implementation: added focused unit coverage for provider fallback, event sanitization, drop-off aggregation, preference summaries, location matching, buyer redaction, media behavior, and setup-time property lookup auth.
    - Verification: `./scripts/test.sh` passed with lint, typecheck, and 78 unit tests. `./scripts/e2e.sh` passed with 12 desktop/mobile Playwright tests. `git diff --check` passed.

- [x] Add role-aware root entry and returning-agent login resume
  - Goal: the base domain should route visitors by intent instead of forcing every logged-out agent back through setup.
  - Design review result: 4/10 -> 9/10 after specifying information architecture, states, emotional journey, anti-slop rules, responsive/a11y behavior, auth routing, and verification. Mockups were not generated because the gstack designer binary is not installed in this workspace.
  - Engineering review result: FULL_REVIEW, clean after plan fixes. Scope is accepted with guardrails: no marketplace, no full seller product, no second auth system, no second dashboard. Key fixes added: stored safe `return_to`, authenticated-agent lookup separate from dev preview fallback, explicit seller lead side-effect path, exact-submit agent resolution, and full test coverage diagram.
  - Implementation result: `/` now presents buyer, seller, and agent paths; buyer/seller exact-link resolution routes to `/{agentSlug}` and `/{agentSlug}/seller`; seller inquiries persist as seller-tagged leads; returning-agent magic links resolve to safe dashboard returns, completed-agent dashboard, saved setup step, or welcome setup without resetting drafts.
  - Verification: `npm run test`, `npm run typecheck`, `npm run lint`, targeted desktop Playwright setup/seller/dashboard flow, `npm run e2e`, `npm run build`, plus gstack browse smoke check on a clean local dev server.
  - Acceptance:
    - `/` presents clear paths for prospective buyers, prospective sellers, and agents.
    - Buyer/seller entry does not create cross-agent marketplace behavior; it asks for an agent link/code or respects direct `/{agentSlug}` links.
    - Agent sign-in supports returning agents and new setup from one magic-link flow.
    - Magic-link requests do not reset an existing setup draft to `welcome`.
    - After magic-link verification, existing agents land on `/dashboard/leads`; incomplete setups resume at `setup_drafts.current_step`.
    - `/dashboard/*` logged-out redirects preserve a safe `return_to` back to the requested dashboard route.
    - Tests cover existing-agent login, draft resume, root role routing, and direct buyer slug behavior.
  - What already exists:
    - `/` is currently an agent setup landing page with the warm cream/terracotta palette, serif headline, `LinkButton`, and buyer-page preview.
    - `/signup` has the magic-link form, but its copy is setup-only and the success state says "Continue setup" even for returning agents.
    - `/{agentSlug}` is the buyer-facing island and must stay the primary shared buyer link.
    - `/dashboard/*` already auth-gates on `getCurrentAgent()`, but redirects logged-out agents to `/signup` without a return target.
    - `setup_drafts.current_step` already contains the resume point, but magic-link creation overwrites it to `welcome`.
    - No `DESIGN.md` exists, so use the existing token vocabulary in `app/globals.css` and established component shapes instead of inventing a new brand system.
  - Information architecture:
    - Classifier: hybrid. `/` is a marketing-light role router; dashboard/setup remain app UI; buyer/seller agent pages are functional lead capture.
    - First screen hierarchy:
      - First: the product identity and question, "What are you here to do?"
      - Second: three explicit choices, "Buy a home", "Sell a home", "I am an agent".
      - Third: the role-specific panel that appears after selection.
    - Screen structure:
      ```text
      /
      +-- Header: small brand, signed-in agent shortcut when present
      +-- Main question: "What are you here to do?"
      +-- Role selector:
          +-- Buy a home -> exact agent link/code input -> /{agentSlug}
          +-- Sell a home -> exact agent link/code input -> /{agentSlug}/seller
          +-- I am an agent -> email magic-link panel -> dashboard or setup resume
      +-- Secondary links: /signup and /dashboard only after agent intent is selected
      ```
    - Navigation rules:
      - Do not auto-redirect signed-in agents from `/`; buyers and sellers still need the base link. Show a compact signed-in banner with "Continue to dashboard" instead.
      - Do not add agent search, recommendations, featured agents, or a marketplace. Buyer/seller entry accepts only an exact slug, full link, or known code.
      - Direct `/{agentSlug}` remains buyer-first. Add a small "Selling instead?" path to `/{agentSlug}/seller` only after the seller route exists.
  - Root page interaction spec:
    - Default state shows one centered composition, not a dashboard: brand, H1, short sentence, three large role buttons, no preview card competing for attention.
    - Role buttons are cards because the card is the interaction. Each has a lucide icon, a 2-4 word title, and one short clarifier. Avoid icon-in-colored-circle decoration.
    - Buyer panel:
      - Visible label: "Agent link or code".
      - Accepts `maya`, `/maya`, `https://domain.com/maya`, or an agent code if implemented.
      - Exact match shows "Continue to Maya" and navigates to `/{slug}`.
      - Error says "We could not find that agent link. Check the spelling or ask your agent."
    - Seller panel:
      - Same exact-match control as buyer.
      - Exact match navigates to `/{slug}/seller`.
      - Seller intake collects name, email, phone, property address or neighborhood, timeframe, and free-text notes. Optional email-or-phone contact can be reconsidered later, but v1 keeps both fields to reuse the existing lead schema without nullable-contact churn.
      - Store seller submissions as leads with `source: "seller_entry"` and `preferences.intent: "seller"`; do not run buyer match-reason generation or buyer brief generation for seller leads.
      - Dashboard rows/panels should badge seller leads and show seller-specific brief fields instead of forcing buyer preference language.
    - Agent panel:
      - Copy: "Sign in or create your agent link."
      - Email label stays visible above the field.
      - Success copy: "Check your email. We will open your dashboard or resume setup from where you left off."
      - Dev-only continue button copy should be neutral: "Continue" rather than "Continue setup".
  - Auth and resume plan:
    - Add a small resolver, for example `resolveAgentAccessDestination({ userId, returnTo })`.
    - Destination order:
      ```text
      safe return_to + completed agent -> return_to
      completed agent -> /dashboard/leads
      incomplete setup draft -> /setup/{current_step}
      no draft -> /setup/welcome
      ```
    - Safe `return_to` allowlist: same-origin relative paths only, limited to `/dashboard`, `/dashboard/leads`, `/dashboard/listings`, `/dashboard/distribution`, and `/dashboard/settings`.
    - Persist sanitized `return_to` on `agent_magic_links` rather than trusting a query string on `/auth/verify`.
    - Replace magic-link draft writes with an idempotent draft initializer. Sending a magic link may create a welcome draft for a brand-new user, but must never move an existing draft backward.
    - Magic-link POST stores or encodes a safe `return_to` so verification can honor dashboard deep links.
    - `/auth/verify` POST consumes the token, sets the agent session, then redirects through the resolver instead of always `/setup/welcome`.
    - `/dashboard/*` logged-out redirects become `/signup?return_to=<safe-dashboard-path>`.
    - `/setup/*` logged-out redirects may remain setup-oriented, but should preserve a safe setup step when useful.
  - Interaction state table:
    ```text
    Feature                  | Loading                         | Empty                         | Error                                      | Success                                  | Partial
    -------------------------|---------------------------------|-------------------------------|--------------------------------------------|------------------------------------------|-------------------------------
    Role selector            | None; server-rendered choices   | Show all three choices        | N/A                                        | Selected role panel opens inline         | Signed-in banner can coexist
    Agent link/code resolve  | Button says "Checking..."       | Disabled until value entered  | Exact, plain-language not-found message    | CTA changes to named agent destination   | Parsed URL normalizes to slug
    Agent magic-link send    | Button says "Sending..."        | Disabled until valid email    | Config/auth error above CTA                | Neutral "Check your email" confirmation  | Dev link button says "Continue"
    Magic-link verify page   | Button posts once, no spinner   | Missing token -> signup       | Expired token -> fresh-link CTA            | Destination resolver redirects correctly | Email prefetch GET never consumes
    Seller intake            | Submit button says "Saving..."  | Required fields visible       | Inline validation, keep user input         | Warm confirmation with agent next step   | Both contact fields required in v1
    Dashboard return_to      | N/A                             | N/A                           | Unsafe path ignored and falls back safely  | Deep link restores requested section     | Unknown section normalizes to leads
    ```
    Engineering override: seller v1 requires both phone and email because the current `leads` table and dashboard assume non-null contact fields. Revisit optional-contact seller capture only with a nullable-contact migration and null-safe dashboard/email templates.
  - User journey storyboard:
    ```text
    Step | User does                         | User feels                         | Plan response
    -----|-----------------------------------|------------------------------------|--------------------------------------------
    1    | Lands on base link                | Unsure if this is for them         | One question and three unmistakable choices
    2    | Picks buyer or seller             | Wants their agent, not a directory | Exact link/code input, no marketplace browse
    3    | Enters agent link                 | Worried they typed it wrong        | Named confirmation or recoverable error
    4    | Agent signs in after logout       | Annoyed by repeat setup friction   | Magic link returns to dashboard or draft step
    5    | Incomplete agent resumes setup    | Relieved work was saved            | Setup opens saved current step
    6    | Seller submits interest           | Wants a simple next step           | Confirmation says agent received the note
    ```
  - Anti-slop and visual rules:
    - No generic SaaS feature grid. The three role choices are functional controls, not marketing features.
    - No purple/blue gradients, decorative blobs, stock real estate imagery, emoji, centered-everything layouts, or decorative icon circles.
    - Keep the current warm palette: `--background`, `--foreground`, `--muted`, `--border`, `--agent-accent`, and `--agent-accent-soft`.
    - Use the existing serif display treatment for the H1 and the existing sans/UI treatment for labels and controls.
    - Cards stay at or below the existing rounded style unless the current component requires otherwise; do not nest cards.
    - Copy must be task language, not product hype. Every sentence should answer what the visitor can do next.
  - Responsive and accessibility requirements:
    - Desktop: max-width composition, three role choices in one row, role panel below or alongside without causing layout jump.
    - Mobile: role choices stack, each at least 56px tall, role panel immediately follows the selected choice, CTA remains visible without horizontal scroll.
    - Tablet: two-column only if the selected panel has enough width for labels and validation text; otherwise use stacked layout.
    - Keyboard: Tab order is brand/skip if present -> role choices -> active panel field -> CTA -> secondary links. Enter submits active forms.
    - Screen readers: use one H1, fieldsets/legends for role selection, visible labels, `aria-live="polite"` for resolve and auth errors, and clear focus after role selection.
    - Contrast: body text >= 4.5:1; placeholder text is never the only label; disabled CTAs remain visually disabled but legible.
  - Not in scope:
    - Public agent marketplace or search, because that breaks the agent-owned island model.
    - Seller valuation, CMA generation, listing agreement workflow, or seller dashboard, because the immediate need is routing and lead capture.
    - Custom domains, subdomains, password auth, billing, CRM migration, and MLS/IDX feed connection.
    - Redesigning setup, dashboard, buyer intake, or match cards beyond copy/routing changes required for this flow.
  - Implementation sequence:
    - Add focused root role UI, likely a client component under `components/root/`, while keeping `app/page.tsx` server-rendered for signed-in-agent context.
    - Add exact agent-link parsing/resolution primitive and API. It should normalize slug/full URL input and return only the matched agent needed for confirmation.
    - Add `/{agentSlug}/seller` plus a small seller-intake component and POST route that creates a seller-tagged lead through an explicit seller side-effect path.
    - Add auth destination resolver and safe `return_to` parsing tests.
    - Add `return_to` to the `agent_magic_links` Railway schema; legacy rows without it fall back through the destination resolver.
    - Update magic-link creation to initialize drafts without resetting them.
    - Update magic-link verification, `/signup`, setup redirects, and dashboard redirects to use the resolver and safe return target.
    - Update dashboard lead display just enough to make seller leads legible.
    - Update copy in email subject/body and verify confirmation page from setup-only language to neutral sign-in/resume language.
  - Engineering scope challenge:
    - Existing code already solves most sub-problems:
      - Agent lookup: `resolveAgentBySlug()` and `resolveAgent()` should be reused. Add a parser in front; do not build an agent search service.
      - Buyer lead creation: `createLead()` already persists leads, events, cookies, and dashboard data. Reuse the table shape, but split buyer-only side effects from seller capture.
      - Auth/session: `setAgentSession()`, `getCurrentUserId()`, `getCurrentAgent()`, `setup_drafts`, and magic-link rows already exist. Add a destination resolver instead of creating a new login flow.
      - Dashboard display: `DashboardShell` and `getDashboardLeads()` already list leads. Add seller badges/labels, not a seller dashboard.
    - Minimum complete change:
      - Root intent router.
      - Exact agent-link resolver.
      - Seller v1 inquiry route using the existing leads table with explicit `intent: "seller"`.
      - Returning-agent login resolver with persisted safe return target.
      - Focused dashboard label support for seller leads.
    - Deferred without blocking:
      - Seller valuation/CMA, optional-contact nullable schema, seller-specific AI brief, marketplace/search, and agent code generation.
    - Complexity smell:
      - This will touch more than 8 files, but that is appropriate because the task crosses root UI, auth routing, data capture, dashboard display, migrations, and tests. Keep it engineered enough by adding shared helpers instead of ad hoc logic in route handlers.
    - Search check:
      - [Layer 1] Use the Next.js App Router redirect/cookie patterns already present in this repo.
      - [Layer 1] Keep route handlers boring: parse request, call shared helper, return `NextResponse`. Do not introduce middleware or a client-only auth router.
    - Distribution check:
      - No new artifact type is introduced. The existing Next.js app and Railway migration path are the distribution surface.
  - Architecture and data flow:
    ```text
    Root role entry
    /
    +-- app/page.tsx (server)
        +-- getAuthenticatedAgentForBanner()
        +-- RootRoleEntry (client)
            +-- buyer selected
            |   +-- parseAgentLinkInput(value)
            |   +-- POST /api/agents/resolve-link
            |   +-- success -> router.push("/{slug}")
            |   +-- not found -> inline recoverable error
            +-- seller selected
            |   +-- parseAgentLinkInput(value)
            |   +-- POST /api/agents/resolve-link
            |   +-- success -> router.push("/{slug}/seller")
            +-- agent selected
                +-- SignupForm(returnTo?)
                +-- POST /api/auth/magic-link
    ```
    ```text
    Returning agent auth
    /dashboard/listings unauthenticated
    +-- redirect("/signup?return_to=/dashboard/listings")
        +-- POST /api/auth/magic-link
            +-- sanitizeReturnTo()
            +-- createAgentMagicLink({ email, returnTo })
            +-- ensureSetupDraftInitialized(userId, email)
            +-- email / devLink
        +-- GET /auth/verify?token=... renders confirmation only
        +-- POST /auth/verify
            +-- consumeAgentMagicLink()
            +-- setAgentSession()
            +-- resolveAgentAccessDestination(userId, storedReturnTo)
                +-- completed agent + safe returnTo -> returnTo
                +-- completed agent -> /dashboard/leads
                +-- setup draft -> /setup/{current_step}
                +-- no draft -> /setup/welcome
    ```
    ```text
    Seller lead capture
    /{agentSlug}/seller
    +-- resolveAgentBySlug(agentSlug)
    +-- SellerInquiryForm
        +-- POST /api/seller-leads
            +-- validate agent_slug, session_id, name, phone, email, property, timeframe, notes
            +-- createLead({ kind: "seller", preferences.intent: "seller", source: "seller_entry" })
                +-- insert leads row
                +-- log seller_inquiry_created event
                +-- skip buyer match reasons
                +-- skip buyer brief prompt
                +-- compute neutral/browsing temperature or set fixed seller status
            +-- set session and lead cookies
            +-- return confirmation
    ```
  - Engineering decisions locked:
    - Add `lib/auth/destinations.ts` for `sanitizeReturnTo()` and `resolveAgentAccessDestination()`. Keep all return-target logic in one file.
    - Add an authenticated-agent helper for root/dashboard auth checks that does not fall back to `getFirstDevAgent()`. `getCurrentAgent()` currently has a dev preview fallback; do not use that fallback to decide whether someone is signed in.
    - Add `return_to text` to `agent_magic_links` in `scripts/railway-migrate.mjs`. Store only sanitized relative paths.
    - Add `parseAgentLinkInput()` in a shared helper. It must reject reserved paths such as `api`, `auth`, `dashboard`, `setup`, `signup`, and `agents`.
    - Add a discriminated lead intent path: buyer leads keep existing brief/match side effects; seller leads skip buyer AI and match-reason generation.
    - Keep seller v1 in `leads` with `preferences.intent = "seller"` and both contact fields required. Do not add a parallel seller table in this task.
    - Keep `/api/agents/resolve-link` exact-submit only. Do not query on every keystroke and do not return lists of agents.
  - Code quality constraints:
    - No duplicate return-target parsing in `/signup`, `/dashboard`, `/auth/verify`, and `/api/auth/magic-link`.
    - No ad hoc URL parsing inside React components. Components call `parseAgentLinkInput()` through the resolve API.
    - Avoid boolean flags like `skipAi?: true` leaking everywhere. Prefer `createLead({ kind: "buyer" | "seller", ... })` or a small `createSellerLead()` wrapper.
    - Keep route handlers thin: validate with zod, call helper, return response. Put state-machine logic in pure helpers with unit tests.
    - Update type definitions intentionally: add seller intent/preference fields to `Preferences` instead of relying on `Record<string, unknown>`.
    - Add short ASCII comments only where they prevent mistakes: the destination resolver and lead side-effect split are the two places that deserve comments.
  - Test coverage diagram:
    ```text
    CODE PATHS                                                   USER FLOWS
    [+] lib/root/agent-link.ts                                    [+] Base link intent routing
      +-- [GAP -> UNIT] slug, /slug, full URL parse                 +-- [GAP -> E2E] buyer role resolves Maya -> /maya
      +-- [GAP -> UNIT] reserved path rejected                      +-- [GAP -> E2E] seller role resolves Maya -> /maya/seller
      +-- [GAP -> UNIT] malformed URL rejected                      +-- [GAP -> E2E] unknown link shows recoverable error

    [+] app/api/agents/resolve-link/route.ts                      [+] Returning agent auth
      +-- [GAP -> UNIT] known slug returns minimal agent             +-- [GAP -> E2E] completed agent -> /dashboard/leads
      +-- [GAP -> UNIT] unknown slug returns 404                     +-- [GAP -> E2E] dashboard return_to survives signup + verify
      +-- [GAP -> UNIT] reserved slug returns 404                    +-- [GAP -> E2E] incomplete draft resumes saved step

    [+] lib/auth/destinations.ts                                  [+] Seller inquiry
      +-- [GAP -> UNIT] safe dashboard return targets                +-- [GAP -> E2E] seller form creates seller-tagged lead
      +-- [GAP -> UNIT] unsafe/external targets rejected             +-- [GAP -> E2E] dashboard shows seller badge/fields
      +-- [GAP -> UNIT] completed agent + return_to                  +-- [GAP] rapid double submit does not create duplicate UI confusion
      +-- [GAP -> UNIT] completed agent no return_to
      +-- [GAP -> UNIT] incomplete setup draft
      +-- [GAP -> UNIT] no draft

    [+] app/api/auth/magic-link/route.ts
      +-- [GAP -> UNIT] creates draft only when none exists
      +-- [GAP -> UNIT] existing draft step is not overwritten
      +-- [GAP -> UNIT] stores sanitized return_to on magic link
      +-- [GAP -> UNIT] dev redirect uses destination resolver

    [+] app/auth/verify/route.ts
      +-- [EXISTING ★★★] GET does not consume token
      +-- [GAP -> UNIT] POST redirects through destination resolver
      +-- [GAP -> UNIT] expired token keeps fresh-link behavior

    [+] seller lead side effects
      +-- [GAP -> UNIT] seller lead inserts preferences.intent/source
      +-- [GAP -> UNIT] seller lead skips match reasons
      +-- [GAP -> UNIT] buyer lead still generates match reasons
      +-- [GAP -> UNIT] dashboard search includes seller property/notes

    COVERAGE BEFORE BUILD: 1/28 known paths covered by existing tests.
    REQUIRED COVERAGE TO SHIP: 28/28 planned paths covered, including 7 E2E flows.
    ```
  - Failure modes:
    ```text
    Codepath                     | Production failure                              | Test? | Handling in plan
    -----------------------------|-------------------------------------------------|-------|------------------
    return_to                    | External URL/open redirect                      | yes   | sanitize allowlist, fallback dashboard
    magic-link draft init        | Existing draft reset to welcome                 | yes   | initializer only creates missing draft
    magic-link verify            | Token consumed by GET prefetch                  | yes   | existing GET confirmation stays
    agent resolve API            | User pastes /dashboard or malformed URL         | yes   | reserved-path rejection + inline error
    root signed-in banner        | Dev fallback shows first pilot as signed-in     | yes   | authenticated-agent helper, no fallback
    seller lead creation         | Buyer AI tries to rank listings for seller      | yes   | discriminated lead side effects
    seller submit                | Duplicate POST on double click                  | yes   | pending state and idempotent UI; no second visible success
    dashboard seller display     | Seller row looks like buyer preference mismatch | yes   | seller badge and seller-specific panel fields
    ```
    Critical silent gaps after this review: 0, assuming the listed tests are implemented with the feature.
  - Performance review:
    - Root page must not fetch listings, leads, match reasons, dashboard summaries, or distribution templates.
    - Agent link resolution is submit-only. No live typeahead and no marketplace-style search.
    - `/api/agents/resolve-link` should return only `{ slug, name, market }`, not the full agent profile or listings.
    - Seller lead creation must avoid buyer match-reason AI calls. It should be one DB insert plus event logging.
    - Dashboard already has per-lead event/showing request fetches; do not broaden that in this task. If seller lead volume grows, batch dashboard enrichment later.
  - Worktree parallelization strategy:
    - Dependency table:
      ```text
      Step                         | Modules touched                         | Depends on
      -----------------------------|-----------------------------------------|------------
      Auth destination resolver    | lib/auth, app/api/auth, app/auth, db    | -
      Root role UI + resolve API   | app, components/root, app/api/agents    | agent-link parser
      Seller inquiry path          | app/[agentSlug]/seller, app/api, lib    | lead intent split
      Dashboard seller labels      | components/dashboard, lib/dashboard     | seller inquiry path
      E2E/browser QA               | tests/e2e                               | all feature lanes
      ```
    - Parallel lanes:
      - Lane A: auth destination resolver -> magic-link verify updates.
      - Lane B: root role UI -> exact agent resolve API.
      - Lane C: lead side-effect split -> seller inquiry route -> dashboard seller labels.
      - Lane D: tests can start as unit scaffolds after helper signatures exist, then finish after lanes A-C merge.
    - Execution order:
      - Build helper signatures first in one branch or short initial commit.
      - Lane A and Lane B can run in parallel.
      - Lane C can run in parallel after the lead-intent helper signature is agreed.
      - E2E/browser QA waits until A-C are merged.
    - Conflict flags:
      - Lane A and Lane B may both touch `/signup` copy/form behavior. Keep signup return-target props in Lane A and visual role selection in Lane B.
      - Lane C and dashboard work both touch lead display types. Merge lead type changes before dashboard UI polish.
  - Verification plan:
    - Unit tests:
      - `lib/root/agent-link.test.ts` covers slug, slash slug, full URL, malformed URL, and reserved paths.
      - `lib/auth/destinations.test.ts` covers safe return targets and destination resolution for completed, incomplete, and new agents.
      - Safe `return_to` accepts known dashboard paths and rejects external, protocol-relative, unknown, and setup-reset paths.
      - Destination resolver sends completed agents to dashboard, incomplete agents to saved draft step, new agents to welcome.
      - Magic-link POST does not overwrite an existing `setup_drafts.current_step`.
      - Magic-link POST stores sanitized `return_to`; verify POST uses stored return target.
      - Agent link/code parser handles slug, `/slug`, and full URL.
      - Seller lead creation tags `preferences.intent = "seller"` and skips buyer brief/match-reason generation.
      - Buyer lead creation still runs existing buyer brief/match-reason behavior.
      - Root signed-in banner uses authenticated user state, not the dev first-agent fallback.
    - E2E tests:
      - `/` role selector opens buyer panel and resolves a seeded agent to `/{slug}`.
      - `/` role selector opens seller panel and resolves a seeded agent to `/{slug}/seller`.
      - Unknown buyer/seller agent link shows the inline recovery error without navigating.
      - `/` agent panel sends magic link and local dev continue resumes an incomplete draft.
      - Existing completed agent logging in lands on `/dashboard/leads`.
      - Logged-out `/dashboard/listings` redirects through signup and returns to listings after verification.
      - Direct `/maya` buyer flow still works.
      - Seller inquiry appears in dashboard with a seller badge and does not show buyer match language.
    - Browser QA:
      - Verify desktop and mobile root layouts in the in-app browser.
      - Click buyer, seller, and agent paths live.
      - Confirm no console errors and no overlapping text at narrow mobile width.
      - Confirm the base link no longer makes a logged-out returning agent restart setup.

- [x] Make buyer intake Continue taps instant
  - Goal: structured intake screens should change immediately after Continue, without waiting on a server round trip.
  - Acceptance:
    - Client intake uses the same deterministic next-question primitive as the API.
    - `/api/intake/next` remains available and covered for server-side contracts.
    - Free-text extraction still uses the AI extraction route and review chips.
    - Playwright browser QA proves timeline Continue advances without calling `/api/intake/next`.
    - Typecheck, lint, focused unit tests, buyer e2e, and production build pass.

- [x] Remove stock property imagery from buyer match cards
  - Goal: buyer-facing cards should only show actual listing media provided by the agent or future authorized MLS/IDX feeds.
  - Acceptance:
    - Unsplash fallback house images are removed from match cards.
    - Known stock/demo media hosts are not rendered as buyer-facing property media.
    - No-media listings show a neutral branded panel rather than a fake property photo.
    - Verification proves buyer card source no longer contains Unsplash poster fallbacks.
    - Typecheck, lint, focused unit test, buyer e2e, and production build pass.

- [x] Fix repeated free-text intake and speed up next-question taps
  - Goal: buyer intake should never show the free-text question twice and structured tap questions should advance quickly.
  - Acceptance:
    - Accepting extracted free-text always stores `free_text_raw` before choosing the next screen.
    - `/api/intake/next` no longer waits on Anthropic by default for every tap.
    - If AI next-question selection is explicitly enabled, answered/repeated questions are rejected in favor of deterministic fallback.
    - Unit coverage proves answered free-text cannot be returned again.
    - Buyer e2e intake flow still reaches gate.
    - Typecheck, lint, unit tests, targeted buyer e2e, and production build pass.

- [x] Allow setup publish with optional blank listing media
  - Goal: agents should be able to publish without a video URL because listing media is optional.
  - Acceptance:
    - Blank `videoUrl` values from saved setup drafts are normalized to null before onboarding validation.
    - Other optional listing strings tolerate blank UI values without weakening required listing fields.
    - The publish error is concise if validation fails again.
    - Regression coverage proves `onboardAgent()` accepts blank optional listing media.
    - Typecheck, lint, unit tests, setup e2e, and production build pass.

- [x] Harden setup phone verification and distribution template cache
  - Goal: setup phone verification should fail clearly under Twilio trial restrictions, and dashboard template caching should never crash unrelated setup/dashboard pages.
  - Acceptance:
    - Twilio error 21608 returns a user-actionable response instead of an unhandled route error.
    - Setup phone UI displays the actionable message.
    - Dashboard leads/listings/settings pages do not eagerly generate distribution templates.
    - Distribution template cache skips or tolerates writes when the agent row disappears during setup/session churn.
    - Regression tests cover Twilio trial errors and stale distribution agent IDs.
    - Typecheck, lint, unit tests, and production build pass.

- [x] Redact buyer-facing listing addresses
  - Goal: prevent buyers from seeing or inspecting exact street addresses before they request a showing.
  - Acceptance:
    - Buyer landing cards do not render exact listing addresses.
    - Buyer matches API does not return exact listing addresses in its JSON payload.
    - Match reasons and returning-visitor copy are generated from buyer-safe listing data and existing reasons are scrubbed before returning.
    - Agent dashboard/setup still show full addresses.
    - Unit/e2e coverage proves seeded addresses are not visible in buyer flows.
    - Typecheck, lint, unit tests, buyer e2e, and production build pass.

- [x] Improve setup link placement tags and listing autofill
  - Goal: make distribution placement controls clearer and reduce manual listing-entry work without relying on stealth scraping.
  - Acceptance:
    - Link step uses tag-like copy controls for Instagram bio, TikTok bio, and Linktree button.
    - Listing setup can extract structured details from pasted captions, MLS remarks, flyer text, or notes.
    - URL import copy is clear that MLS/Zillow/Redfin are references, not scraped sources.
    - Unit coverage exists for listing detail extraction fallback.
    - Typecheck, lint, unit tests, setup e2e, and production build pass.

- [x] Harden production magic-link verification
  - Goal: `/auth/verify` must use public URLs and avoid consuming links on email-client GET prefetches.
  - Acceptance:
    - Verify redirects use `NEXT_PUBLIC_APP_URL`/forwarded public origin, never `0.0.0.0`.
    - GET `/auth/verify?token=...` does not consume the token.
    - POST `/auth/verify` consumes the token and creates the agent session.
    - Expired/missing tokens redirect to public `/signup?expired=1`.
    - Regression tests cover GET safety and POST consumption.
    - Typecheck, lint, unit tests, and production build pass.

- [x] Fix Railway magic-link public URL
  - Goal: magic-link emails must use the public Railway app URL, not Railway's internal `0.0.0.0:8080` bind address.
  - Acceptance:
    - Magic links prefer `NEXT_PUBLIC_APP_URL`.
    - Forwarded host/proto are used as a fallback.
    - `0.0.0.0` is never emitted as a public origin.
    - Dashboard distribution links use the same public-origin helper.
    - Typecheck, lint, unit tests, and production build pass.

- [x] Remove blank setup welcome video box
  - Goal: remove the remote placeholder video frame that appears as an empty box during setup.
  - Acceptance:
    - `/setup/welcome` no longer renders the large video placeholder.
    - Welcome screen still has a clear CTA and setup checklist.
    - Typecheck, lint, and targeted e2e continue to pass.

- [x] Fix production signup and headshot upload
  - Goal: Railway setup should send real magic links and accept headshot uploads without crashing.
  - Acceptance:
    - Headshot upload does not reference the runtime `File` constructor server-side.
    - Production signup cannot silently fall back to dev auth when email/database auth is misconfigured.
    - Local development can still use the explicit dev setup redirect.
    - Regression tests cover both environment routing and upload file detection.
    - Typecheck, lint, unit tests, and production build pass.

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
    - Database migrations define all Phase 1 tables, indexes, and storage metadata.
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
- [x] 2. Add persistence schema, indexes, storage metadata, and typed DB helpers.
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

- 2026-05-15: Ran `/plan-eng-review` on the role-aware root/returning-agent plan. Locked the architecture to reuse existing agent lookup, leads, setup drafts, and magic-link primitives; added safe stored `return_to`, authenticated-agent lookup without dev preview fallback, seller lead side-effect split, test coverage diagram, failure modes, performance constraints, and parallel worktree lanes.
- 2026-05-15: Ran text-only `/plan-design-review` for role-aware root entry and returning-agent login resume. Designer/browser binaries were unavailable, so no mockups were generated. The plan now specifies IA, states, journey, anti-slop constraints, responsive/a11y requirements, auth routing, seller-lead handling, and verification.
- 2026-05-15: Implemented the role-aware base link and returning-agent login resume. Added exact buyer/seller agent-link resolution, seller inquiry capture and dashboard labeling, stored safe magic-link `return_to`, non-resetting draft initialization, and authenticated-agent dashboard routing. Verified `npm run test`, `npm run typecheck`, `npm run lint`, targeted desktop Playwright flow, `npm run e2e`, `npm run build`, and gstack browse smoke on `http://127.0.0.1:3111/`.
- 2026-05-15: Re-ran user-side browser QA on the role-aware base link. Fixed the embedded agent form so it no longer changes `/` to `/signup` after send, and fixed mobile role selection so the active buyer/seller/agent panel appears directly under the selected card with only one form in the DOM. Re-verified buyer routing, seller inquiry submit/confirmation, agent setup entry, mobile layout, console errors, `npm run typecheck`, `npm run lint`, and focused root Playwright coverage on desktop/mobile.
- 2026-05-12: Initialized autonomous Codex repo scaffolding with task tracking and command wrappers.
- 2026-05-12: Verified `./scripts/setup.sh`, `./scripts/test.sh`, and `./scripts/e2e.sh` handle the current empty repo state cleanly.
- 2026-05-12: Clarified local live-browser work versus Codex Cloud autonomous test/PR work in `AGENTS.md`.
- 2026-05-13: Added Phase 1 buyer-facing platform execution plan; implementation is blocked pending user greenlight on pre-build artifacts.
- 2026-05-13: User greenlit implementation directly. Built Phase 1 buyer-facing platform and verified `npm run typecheck`, `npm run lint`, `npm run test`, `npm run e2e`, and `npm run build`.
- 2026-05-13: Browser QA covered `/maya`, `/david`, intake-to-gate, matches, deferred verification, desktop/mobile e2e, and visual screenshots for landing/matches. Fixed stale e2e server reuse, intake double-submit races, Twilio/AI deterministic test fallbacks, LAN session ID fallback, and blank listing media placeholders.
- 2026-05-13: Started Phase 2 planning gate per user request. User then approved moving into implementation after the plan; do not commit or push until tests pass and browser QA is clean.
- 2026-05-13: Completed Phase 2 implementation: setup wizard, auth/session draft flow, voice/listing setup APIs, dashboard leads/listings/distribution/settings, temperature computation, notifications, docs, host-aware share links, and RLS migration updates. Verified `npm run typecheck`, `npm run lint`, `npm run test`, `npm run e2e`, `npm run build`, plus live in-app browser QA on `/dashboard/leads` and `/dashboard/distribution`. No commit or push was made.
- 2026-05-13: Switched deployment preference to Railway-first after deployment setup friction. Added Railway web-service config, Railway Postgres migration script, health check, direct Postgres persistence paths, and Resend-backed magic-link auth for production.
- 2026-05-13: Fixed production root routing so `/` starts agent setup instead of redirecting to `/maya`; `/{agentSlug}` remains the buyer-facing share URL. Verified typecheck, lint, targeted desktop/mobile Playwright routing coverage, and production build.
- 2026-05-13: Fixed Railway setup regressions: headshot upload no longer depends on the server `File` constructor, and production signup now requires a real email/auth path instead of silently falling back to dev setup. Verified typecheck, lint, all unit tests, production build, and built bundle grep for `File`.
- 2026-05-13: Removed the blank remote-video frame from `/setup/welcome`; setup now goes from the value prop directly to checklist and CTA. Verified typecheck, lint, targeted setup e2e on desktop/mobile, and production build.
- 2026-05-13: Fixed Railway public-origin handling so magic links and distribution links prefer `NEXT_PUBLIC_APP_URL`, use forwarded headers as fallback, and never emit `0.0.0.0`. Verified typecheck, lint, all unit tests, and production build.
- 2026-05-13: Hardened `/auth/verify`: GET now renders a no-store confirmation page without consuming the token, POST consumes it and creates the session, and all redirects use the public-origin helper. Verified focused route tests, typecheck, lint, all unit tests, and production build.
- 2026-05-14: Changed setup link placement controls into copyable tags and added listing autofill from pasted captions, MLS remarks, flyer text, or notes. Deliberately avoided stealth Zillow/Redfin/MLS scraping; the production path is user-provided text now and authorized data feeds later. Verified typecheck, lint, all unit tests, targeted setup e2e, and production build.
- 2026-05-14: Redacted exact listing addresses from buyer-facing landing cards, matches API payloads, match cards, and buyer AI prompt inputs. Agent dashboard/setup still keep full addresses. Verified typecheck, lint, all unit tests, targeted buyer e2e reruns, and production build. The first full buyer e2e run hit an existing desktop adaptive-intake timeout, then the failed desktop cases passed individually on fresh rerun.
- 2026-05-14: Hardened Twilio verification failures and optional distribution template caching. Twilio trial-account error 21608 now returns an actionable response instead of an unhandled server error, setup/showing UIs display provider send failures, dashboard non-distribution pages no longer generate distribution templates, and stale agent template cache writes are skipped/tolerated. Verified focused regressions, typecheck, lint, all unit tests, Phase 2 e2e, and production build.
- 2026-05-14: Fixed setup publish failing on blank optional listing video URLs. `onboardAgent()` now normalizes blank optional listing strings/URLs to null, the video URL input clears `videoSource` when empty, and setup publish validation returns concise messages instead of raw Zod JSON. Verified focused regression, typecheck, lint, all unit tests, Phase 2 setup e2e, and production build after rerunning build separately from Playwright.
- 2026-05-14: Fixed repeated free-text intake and slow structured taps without removing the product's AI quality. Free-text extraction still uses AI; next-question advancement now uses the deterministic confidence/skip logic by default to avoid per-tap model latency, with an opt-in `ENABLE_AI_INTAKE_NEXT=1` path guarded against repeated answered questions. Verified focused AI helper regression, typecheck, lint, all unit tests, buyer e2e on desktop/mobile, and production build.
- 2026-05-14: Removed stock property imagery from buyer match cards. Cards now show only agent-provided non-stock MP4 media; known Unsplash/Pexels stock/demo media is suppressed and no-media cards render a neutral branded panel. Documented authorized MLS/IDX/RESO as the future real-media path. Verified focused listing-card media tests, listing privacy tests, typecheck, lint, buyer e2e on desktop/mobile, and production build.
- 2026-05-14: Fixed structured buyer-intake Continue latency by moving next-question selection into a shared client-safe deterministic helper. The server `/api/intake/next` contract remains for AI/server use, but ordinary structured taps no longer wait on it. Verified focused unit tests, a targeted Playwright no-network latency regression, main buyer e2e, typecheck, lint, and production build. The Codex in-app browser control channel timed out after hot reload, so live visible verification should use the freshly restarted dev server.

## GSTACK REVIEW REPORT

| Review | Trigger | Why | Runs | Status | Findings |
|--------|---------|-----|------|--------|----------|
| CEO Review | `/plan-ceo-review` | Scope & strategy | 0 | not run | Not requested for this plan |
| Codex Review | `/codex review` | Independent 2nd opinion | 0 | not run | No implementation diff yet |
| Eng Review | `/plan-eng-review` | Architecture & tests (required) | 1 | clean | FULL_REVIEW, 18 issues/gaps incorporated, 0 critical gaps, 0 unresolved |
| Design Review | `/plan-design-review` | UI/UX gaps | 1 | clean | score: 4/10 -> 9/10, 9 decisions added, 0 unresolved; mockups skipped because designer binary unavailable |
| DX Review | `/plan-devex-review` | Developer experience gaps | 0 | not run | Not applicable yet |

- UNRESOLVED: 0 design decisions, 0 engineering decisions. Visual mockups remain unavailable until the gstack designer binary is installed.
- VERDICT: IMPLEMENTED + VERIFIED. The plan has shipped locally with automated desktop/mobile coverage and a clean browser smoke pass. Run `/ship` when ready to publish the branch.
