# Listing, Location, Dashboard Implementation Plan

Generated: 2026-05-16
Source task: the listing/location/dashboard Priority 1 item in `tasks/todo.md`
Reviews included: `/plan-ceo-review`, formal `/plan-design-review`, formal `/plan-eng-review`, and Codex outside voice

## Scope

Build the listing/location/dashboard task only. The separate WebP demo task in `tasks/todo.md` is not covered by this plan.

- ATTOM-backed property facts for listing entry.
- Typed location search for agent listing/neighborhood setup and buyer area intake.
- Listing enrichment fields used consistently by setup, dashboard, buyer-safe APIs, and match cards.
- Buyer media behavior that keeps direct MP4 previews, treats social links as official external links in v1, and never scrapes/downloads social or listing-site media.
- Dashboard preference summaries and human activity labels.
- Anonymous intake drop-off analytics from existing event data without creating anonymous lead rows.

Not in scope:

- Browser geolocation.
- Public agent marketplace or cross-agent search.
- Stealth scraping, downloading, proxying, or anti-bot work for Instagram, TikTok, Zillow, Redfin, MLS, or listing portals.
- MLS/IDX/RESO feed integration.
- Seller valuation, CMA generation, seller dashboard, or seller analytics.
- Heavy charting library or full analytics product.
- Anonymous visitor records in `leads` before contact capture.
- Full provider-agnostic property intelligence platform.

## Source Links

- [ATTOM API docs](https://api.developer.attomdata.com/docs)
- [ATTOM data overview](https://www.attomdata.com/data/)
- [Google Places Autocomplete docs](https://developers.google.com/maps/documentation/places/web-service/place-autocomplete)
- [Google Places Autocomplete REST reference](https://developers.google.com/maps/documentation/places/web-service/reference/rest/v1/places/autocomplete)

## Formal Gstack Review Execution

- `/plan-design-review`: formal gstack design review logged at current HEAD. The gstack designer binary was present, so visual variants were attempted. Generation failed because the OpenAI organization needs verification for image generation, so the review proceeded through the skill's text-only fallback.
- `/plan-eng-review`: formal gstack engineering review logged at current HEAD. Scope reduction was considered because the plan crosses more than eight files, but the recommended option was to keep the full shared-spine implementation and prevent scattered route/component patches.
- Codex outside voice: ran in read-only mode. Its useful findings are incorporated below: provider contracts are now locked before implementation, buyer-safe redaction is allowlist-based, analytics semantics are explicit, and highest-risk tests are prioritized.
- Gstack review artifact: `/Users/maanavagrawal/.gstack/projects/maanavagrawal-ai-screening-re/maanavagrawal-main-eng-review-test-plan-20260515-183446.md`.

## Locked Review Decisions

1. Typed location provider: use Google Places Autocomplete (New) as the production provider.
   - Server route calls `POST https://places.googleapis.com/v1/places:autocomplete`.
   - Store `GOOGLE_PLACES_API_KEY` server-side only.
   - Request a narrow field mask for prediction text, place ID/resource name, structured format, and types.
   - Show required Google attribution when predictions are displayed without a map.
   - Tests and local dev default to a fixture/manual-chip provider, not live Google calls.

2. ATTOM provider contract: use Basic Profile first and Expanded Profile only after a confident selected property.
   - Basic lookup uses ATTOM Property Basic Profile at `/property/basicprofile` by `address` or `address1` plus `address2`.
   - Expanded lookup uses `/property/expandedprofile` by ATTOM ID or selected address only when the UI needs extra assessor facts.
   - Store `ATTOM_API_KEY` server-side only.
   - Fixture contracts must cover success, no match, 401/403, 429/timeout, malformed payload, and missing optional fields.

3. Enrichment data model: store selected normalized facts, not raw provider payloads.
   - Required listing fields: `attom_id`, `property_data_source`, `property_enriched_at`, `property_match_confidence`, `normalized_address`, `property_facts`, and `property_override_fields`.
   - Coordinates, if stored, are agent-only and must be omitted from every buyer-facing serializer and prompt.
   - `property_facts` is an allowlisted object only: beds, baths, sqft/living size, property type, year built, lot size, stories, parking, selected tax/assessment facts if product-approved, and source timestamp.
   - Never store or expose owner names, APN/parcel identifiers, full raw address components, precise geodata, or raw ATTOM payloads in buyer-facing data.

4. Buyer-safe listing serialization becomes allowlist-based.
   - Do not spread `Listing` into buyer payloads and then delete `address`.
   - Buyer payloads may include only ID, price, beds, baths, sqft, neighborhood/location label, property type, features, deal-breaker flags, description, agent note, pocket flag, and approved media fields.
   - Tests must fail if `address`, `attom_id`, coordinates, `normalized_address`, or `property_facts` appear in buyer APIs, buyer prompts, or match cards.

5. Typed area model is explicit and backward compatible.
   - Add `preferences.selected_areas?: SelectedArea[]`.
   - `SelectedArea = { label, placeId?, source, type, parentLabel?, bounds?, coarseCenter? }`.
   - `source` is `google_places`, `manual`, or `agent_suggestion`.
   - `type` is `city`, `neighborhood`, `postal_code`, `school_district`, `region`, or `custom`.
   - Continue mirroring display labels into `preferences.neighborhoods` for existing matching, prompts, and dashboard code.

6. Matching semantics stay honest in v1.
   - Typed location improves intake accuracy and dashboard context first.
   - Matching may use selected-area labels, aliases, parent city/region, listing neighborhood, and `open_to_suggestions`.
   - Do not claim geospatial matching unless the implementation adds tested coarse-boundary logic and buyer-safe listing location data.

7. Anonymous drop-off analytics are inferred, not lead rows.
   - Count sessions by `agent_id + session_id` from events, regardless of whether `lead_id` was later backfilled during lead creation.
   - A session is abandoned when it has intake activity but no `lead_created` after the configured inactivity window, default 30 minutes.
   - Analytics use aggregate event types and question IDs only; stop sending raw answer values in event metadata where analytics do not need them.
   - Dashboard analytics route must derive the agent from the authenticated session, not from arbitrary query params.

8. Social media behavior is link-first in v1.
   - Direct `.mp4` remains the only inline autoplay media.
   - Instagram/TikTok URLs render as official external links with clear copy, not fake video previews.
   - Do not add a separate media-permission checkbox in v1; agent-provided direct/uploaded media is treated as intentional listing media.
   - Iframes/oEmbed are deferred until CSP, cookie/tracking behavior, provider errors, and mobile layout are explicitly designed.

9. Caching policy is intentionally boring.
   - Persist normalized facts only after the agent accepts them.
   - Debounce search requests and use fixture/local provider in tests.
   - No background refresh or shared provider cache in this task; a manual refresh can be considered later.

10. Highest-risk tests are mandatory first.
   - Buyer-safe redaction for all new enrichment fields.
   - Dual persistence across Railway Postgres, Supabase fallback, setup drafts, and dev store.
   - Provider fixture/failure fallback.
   - Converted-session analytics where `lead_id` is backfilled.
   - Typed area compatibility with existing match scoring and dashboard summaries.

## CEO Review

Mode: Selective Expansion.

Decision: use the Balanced Product Spine approach.

Why: this is an existing-product enhancement, not a greenfield platform. The right move is to add a real shared spine for provider clients, normalization, listing enrichment, summaries, and analytics without turning this into a full property intelligence platform.

12-month trajectory:

```text
CURRENT
Manual listing entry + generic neighborhood taps + raw dashboard JSON

THIS PLAN
Property facts + typed locations + readable lead context + drop-off metrics

12-MONTH IDEAL
Agent-owned listing intelligence: property facts, media rights, buyer geography,
dashboard summaries, and funnel analytics all share one privacy-safe data model.
```

Accepted scope:

- Server-only ATTOM client and property normalizer.
- Normalized listing enrichment fields.
- Typed location search with legacy `neighborhoods` compatibility.
- Dashboard summary helpers for preferences and events.
- Event-derived anonymous funnel metrics.
- Focused UI updates in setup, dashboard listings, buyer intake, match cards, and dashboard lead detail.

Deferred:

- Provider abstraction beyond ATTOM/location search.
- MLS/IDX/RESO media/data integration.
- Browser geolocation.
- Full analytics charts.

## Design Review

Status: formal `/plan-design-review` completed and logged. Visual mockups were attempted with the installed gstack designer, but image generation failed because OpenAI organization verification is required; this review therefore used the skill's text-only fallback.

Initial design completeness: 5/10.
Final design completeness after plan fixes: 8/10.

The plan now specifies what each user sees, interaction states, responsive behavior, and accessibility expectations. It still needs live `/design-review` after implementation because address autocomplete, dashboard density, and mobile analytics layout are hard to prove from text without approved mockups.

Completion summary:

```text
System Audit         | No DESIGN.md; UI scope confirmed
Step 0               | 5/10 initial; biggest gaps were provider states, privacy-safe analytics, and mobile autocomplete behavior
Pass 1 Info Arch     | 7/10 -> 9/10 after screen-specific hierarchy
Pass 2 States        | 7/10 -> 9/10 after loading/empty/error/success/partial states
Pass 3 Journey       | 6/10 -> 8/10 after agent/buyer/dashboard emotional arc
Pass 4 AI Slop       | 7/10 -> 9/10 after app-UI hard rules and link-first media behavior
Pass 5 Design System | 6/10 -> 8/10 using existing tokens; DESIGN.md remains optional
Pass 6 Responsive    | 6/10 -> 9/10 after keyboard, aria-live, touch target, and mobile density requirements
Pass 7 Decisions     | 8 resolved, 0 deferred
Overall              | 5/10 -> 8/10
```

### Design System

No `DESIGN.md` exists. Use the existing product vocabulary:

- Warm neutral background from `app/globals.css`.
- Serif headings already used in setup, intake, dashboard, and match cards.
- `--agent-accent` and `--agent-accent-soft` for selected states and accents.
- Task-first copy. Avoid hype and explanation blocks.
- Cards only when the card is the interaction or a repeated item.

### UI Scope

- Setup listing step: address search becomes the first affordance, with text autofill and manual fields still visible.
- Dashboard listings: same search/enrichment pattern optimized for fast add/edit.
- Buyer intake area step: typed location search plus existing agent/listing-derived suggestions.
- Match cards: direct MP4 preview, official social external-link treatment, then neutral no-media state.
- Dashboard lead detail: readable preference summary, raw JSON behind disclosure, activity labels in human language.
- Dashboard analytics: compact privacy-safe funnel summary, not a chart-heavy page.

### Information Architecture

```text
Setup listings
+-- Address search / selected property fact preview
+-- Agent-owned media URL
+-- Text autofill fallback
+-- Manual override fields
+-- Agent take and pocket listing flag

Buyer intake area step
+-- Typed area search
+-- Agent/listing-derived suggestions
+-- Selected areas
+-- Open to suggestions

Dashboard lead detail
+-- Lead headline and contact actions
+-- Preference summary
+-- Suggested opener
+-- Why serious / watch-outs
+-- Activity timeline
+-- Raw preferences details

Dashboard analytics
+-- Funnel summary
+-- Step drop-off rows
+-- Privacy note / zero state
```

### Interaction States

```text
Feature                 | Loading              | Empty                  | Error                         | Success
------------------------|----------------------|------------------------|-------------------------------|----------------------------
Address search          | "Searching..."       | Manual fields remain   | Provider error, manual path   | Facts preview + fill CTA
ATTOM lookup            | Field-level shimmer  | No facts available     | Named provider failure        | Agent can accept/override
Social media URL        | Validate on blur     | No media panel         | Link stays as external link   | MP4 preview or external link
Buyer location search   | "Finding areas..."   | Existing suggestions   | Typed fallback chip           | Structured area selected
Preference summary      | Existing lead shell  | "No answers yet"       | Raw details still accessible  | Grouped readable facts
Activity labels         | Timeline shell       | No activity yet        | Raw event type fallback       | Human-readable labels
Anonymous analytics     | Dashboard skeleton   | Zero-state guidance    | Metrics unavailable message   | Funnel counts and rates
```

### Responsive And Accessibility Requirements

- Setup and dashboard listing forms use one column on mobile and two columns only when labels, helper text, and errors fit.
- Address and location autocomplete have visible labels, keyboard selection, escape/blur behavior, `aria-live` result messaging, and recoverable error text.
- Dashboard lead summaries scan before raw data appears.
- Analytics cards stay compact on mobile with no horizontal scroll.
- Body text stays at least 16px and 4.5:1 contrast.
- Placeholder text is never the only label.

### Design Findings

1. Address search can easily become a black box.
   Fix: show a small fact preview before filling fields, then keep manual override fields visible.

2. Buyer location search can confuse areas, neighborhoods, cities, and exact addresses.
   Fix: label selected chips by type where possible and store normalized source/type metadata.

3. Dashboard analytics can become noisy.
   Fix: show a compact funnel, step rows, and zero state. No heavy charts in this pass.

4. Social media cards can imply playable video when embeds fail.
   Fix: separate MP4 preview from social external-link state. Social URLs should never masquerade as guaranteed autoplay video.

## Engineering Review

Status: formal `/plan-eng-review` completed and logged. No blockers remain after accepting the recommended review fixes, but implementation must keep the shared spine intact. The main risk is doing this as scattered route/component patches.

Mode: FULL_REVIEW.

Scope challenge result: accepted as-is with guardrails. The task touches more than eight files, but that is appropriate because the behavior crosses provider clients, migrations, setup, dashboard, intake, match cards, events, and tests. Keep the diff right-sized by adding shared helpers instead of ad hoc component logic.

Outside voice integration: accepted. The plan now resolves provider choices up front, adds explicit ATTOM/Google contracts, makes buyer-safe listing serialization allowlist-based, defines the typed area model, clarifies anonymous-session analytics after lead backfill, and prioritizes the riskiest tests.

Completion summary:

```text
Step 0 Scope Challenge | Scope accepted as-is with shared-spine guardrails
Architecture Review    | 6 issues found and folded into locked decisions
Code Quality Review    | 4 issues found; shared helpers required
Test Review            | Coverage diagram produced; high-risk gaps prioritized
Performance Review     | 3 issues found; provider calls bounded and aggregate queries required
NOT in scope           | Written
What already exists    | Written
TODO updates           | 0 added; review fixes are in this plan, not deferred
Failure modes          | 0 critical silent gaps after plan fixes
Outside voice          | Ran via Codex; useful findings accepted
Parallelization        | 6 lanes, A+B+C parallel then UI/QA
Lake Score             | 8/8 recommendations chose the complete option
```

### What Already Exists

- `lib/listings.ts` already centralizes listing CRUD across Railway Postgres, Supabase, and dev store. Reuse it by extending one insert/update mapper rather than adding provider-specific persistence in UI routes.
- `components/setup/setup-wizard.tsx` already supports three listing drafts, manual fields, text-based detail extraction, media URL entry, and neighborhood carry-forward. Add address lookup before those controls instead of replacing the working fallback.
- `app/api/dashboard/listings/route.ts` and `components/dashboard/dashboard-shell.tsx` already provide listing add/edit and dashboard display. The plan should add enrichment to those paths without a dashboard rewrite.
- `Preferences.neighborhoods` and `rankListings()` already drive matching. `selected_areas` must mirror labels back into `neighborhoods` until matching is explicitly upgraded.
- `hooks/use-track-event.ts`, `app/api/events/route.ts`, and `lib/events.ts` already support anonymous session events with nullable `lead_id`; analytics should aggregate this data instead of creating anonymous leads.
- `createLead()` backfills anonymous session events with the new lead ID. Drop-off analytics must count sessions across both null and backfilled `lead_id` states.
- `lib/listing-privacy.ts` already protects exact addresses, but it currently spreads listing fields before deletion. This task must convert buyer serializers to explicit allowlists before adding enrichment fields.
- `lib/dashboard/client-utils.ts` already contains human event labels, but labels are client-side and can append exact listing addresses. Move the mapping to shared code and use buyer-safe location labels where buyer-visible.

### Architecture

```text
UI surfaces
  setup listings
  dashboard listings
  buyer intake
  match cards
  dashboard leads/analytics
        |
        v
Route handlers
  /api/setup/listing-property-search
  /api/dashboard/listings
  /api/intake/location-search
  /api/dashboard/analytics/dropoff
        |
        v
Shared services
  lib/property/attom-client.ts
  lib/property/normalize.ts
  lib/location/search.ts
  lib/listing-enrichment.ts
  lib/dashboard/preference-summary.ts
  lib/dashboard/activity-labels.ts
  lib/dashboard/dropoff.ts
        |
        v
Persistence
  listings enrichment columns
  leads.preferences structured areas
  events session/agent/lead records
```

### Data Flow

```text
Listing autofill
address input
  -> search route
  -> ATTOM client
  -> property normalizer
  -> selected facts
  -> draft listing patch
  -> manual override
  -> listing create/update
  -> buyer-safe redaction

Buyer typed location
typed query
  -> location search
  -> normalized area choice
  -> preferences.selected_areas + legacy neighborhoods
  -> matching and dashboard summary

Anonymous funnel
client event
  -> /api/events
  -> events table keyed by agent_id + session_id
  -> lead creation may backfill lead_id
  -> drop-off aggregate by session state and inactivity window
  -> dashboard privacy-safe metrics
```

### Error And Rescue Registry

```text
Codepath                  | Failure mode                  | Rescue action
--------------------------|-------------------------------|-------------------------------
ATTOM client              | missing API key               | 503 with manual-entry fallback
ATTOM client              | 401/403                       | log provider/auth context, no browser key leak
ATTOM client              | 404/no property match         | return empty suggestions, keep manual fields
ATTOM client              | timeout/429                   | bounded retry/backoff, then fallback
ATTOM normalizer          | malformed provider payload    | typed parse failure, no raw payload exposed
Location search           | provider unavailable          | typed chip/manual area fallback
Listing persistence       | migration column missing      | fail loudly in tests/deploy
Social media handling     | unsupported URL               | store link, do not autoplay/scrape
Preference summary        | unknown preference shape      | safe fallback labels + raw details
Activity labels           | unknown event type            | show raw event type, no crash
Drop-off analytics        | no events                     | zero-state metrics
Event ingest              | sendBeacon/fetch failure      | client queue retry already exists
```

### Security And Privacy

- `ATTOM_API_KEY` stays server-only and must never appear in client bundles or JSON responses.
- `GOOGLE_PLACES_API_KEY` stays server-only and must never appear in client bundles or JSON responses.
- Provider responses are normalized before storage; raw ATTOM/Google payloads are not persisted.
- Buyer-facing listing serializers must be allowlist-based, not "spread then delete address."
- Buyer-facing serializers and prompts must omit exact address, normalized address, ATTOM ID, APN/parcel identifiers, coordinates, owner-ish data, and raw/expanded `property_facts`.
- Location provider payloads are reduced to labels, place IDs, source, type, bounds, and optional coarse centers only when needed.
- Drop-off analytics aggregate sessions and never show anonymous visitors as leads.
- Intake analytics should stop logging raw answer values into event metadata unless a product surface explicitly needs that event-level value.

### Performance

- Persist provider facts only after agent acceptance; do not add background refresh in this task.
- Debounce provider searches and keep test/local routes on fixture providers by default.
- Index new lookup fields only if queried server-side: `attom_id`, `agent_id`, and event aggregate columns.
- Avoid per-lead N+1 analytics queries on dashboard load. Aggregate events once per agent.
- Count anonymous and converted sessions from `agent_id + session_id`, not `lead_id is null`, because lead creation backfills event lead IDs.
- Route handlers should stay boring: parse request, call shared helper, return `NextResponse`.

### Code Quality Findings

1. Risk: provider logic leaks into UI components.
   Fix: all ATTOM/location parsing lives in `lib/property/*` and `lib/location/*`; components consume normalized results.

2. Risk: listing schema mapping becomes duplicated across create/update/onboarding/dev store.
   Fix: introduce a shared enrichment mapping helper and update every persistence path in one step.

3. Risk: dashboard summaries get built as JSX-only formatting.
   Fix: create tested formatting helpers that return structured summary sections.

4. Risk: activity labels stay client-only.
   Fix: move label mapping out of `components/dashboard/dashboard-shell.tsx` into tested shared code.

### Test Coverage Diagram

```text
CODE PATHS                                             USER FLOWS
[+] ATTOM client                                       [+] Setup listing autofill
  ├── [GAP] success/basic profile                        ├── [GAP] address lookup fills facts
  ├── [GAP] expanded profile                             ├── [GAP] manual override survives
  ├── [GAP] missing API key                              └── [GAP] provider failure keeps manual entry
  ├── [GAP] 401/403/429/timeout
  └── [GAP] malformed payload                          [+] Dashboard listing add/edit
                                                          ├── [GAP] lookup creates enriched listing
[+] Listing enrichment persistence                        └── [GAP] edit preserves enrichment/media
  ├── [GAP] migration columns
  ├── [GAP] create/update mapping                       [+] Buyer intake location
  ├── [GAP] onboarding insert                             ├── [GAP] typed search selects area
  └── [GAP] dev store                                     └── [GAP] legacy neighborhoods still populated

[+] Dashboard summary helpers                           [+] Dashboard lead detail
  ├── [GAP] buyer full preferences                        ├── [GAP] summary visible
  ├── [GAP] partial/empty preferences                     └── [GAP] raw JSON behind details
  ├── [GAP] seller/unknown preference shape
  └── [GAP] activity labels                             [+] Anonymous analytics
                                                          ├── [GAP] sessions counted before lead
[+] Drop-off analytics                                    └── [GAP] no anonymous lead rows
  ├── [GAP] anonymous sessions
  ├── [GAP] converted leads                             [+] Buyer match cards
  ├── [GAP] no events                                     ├── [GAP] address redacted after enrichment
  └── [GAP] aggregate query                               └── [GAP] media fallback order
```

Coverage target before implementation: 0/28 new paths tested.
Coverage target after implementation: all listed paths covered by unit, E2E, or browser QA.

Priority test order from engineering review:

1. Buyer-safe redaction for new enrichment fields in buyer APIs, buyer prompts, match cards, and event labels.
2. Listing enrichment propagation through Railway Postgres, Supabase fallback, setup drafts, onboarding insert, and dev store.
3. Provider fixture mode and fallback UX for missing keys, no match, auth failure, rate limit, timeout, and malformed payload.
4. Anonymous analytics across converted sessions where `createLead()` backfills `lead_id`.
5. Typed selected-area compatibility with legacy `neighborhoods`, match scoring, and dashboard summaries.

### Failure Modes Registry

```text
Codepath               | Failure mode         | Rescued? | Test? | User sees?                 | Logged?
-----------------------|----------------------|----------|-------|----------------------------|--------
ATTOM lookup           | missing API key      | Yes      | Yes   | Manual entry fallback      | Yes
ATTOM lookup           | rate limit/timeout   | Yes      | Yes   | Try again/manual fallback  | Yes
Property normalizer    | malformed payload    | Yes      | Yes   | No facts available         | Yes
Location search        | provider down        | Yes      | Yes   | Typed fallback chip        | Yes
Listing create/update  | enrichment mismatch  | Yes      | Yes   | Save error                 | Yes
Buyer API serialization| exact address leak   | Yes      | Yes   | Never leaks                | N/A
Buyer API serialization| enrichment field leak | Yes      | Yes   | Never leaks                | N/A
Analytics aggregation  | lead_id backfilled    | Yes      | Yes   | Accurate counts            | No
Preference summary     | unknown shape        | Yes      | Yes   | Fallback labels            | No
Drop-off analytics     | no events            | Yes      | Yes   | Zero state                 | No
```

Critical gaps before implementation: all rows need tests.

## Implementation Steps

1. Lock environment/config.
   - Add `ATTOM_API_KEY` and `GOOGLE_PLACES_API_KEY` docs to `.env.example`.
   - Add server-only config helpers.
   - Default local/test providers to fixtures and manual entry; never require live ATTOM/Google for CI.

2. Migrate listing and preference data shape.
   - Add listing enrichment fields: `attom_id`, `property_data_source`, `property_enriched_at`, `property_match_confidence`, `normalized_address`, `property_facts`, and `property_override_fields`.
   - Store coordinates only if the buyer-safe serializers and prompts omit them by allowlist.
   - Extend `Listing`, `ListingPayload`, setup draft data, dev store, Supabase/Railway migrations, and onboarding insert paths.
   - Add `preferences.selected_areas` while preserving `preferences.neighborhoods`.

3. Build provider clients and normalization.
   - Add server-only ATTOM low-level client with typed request/response handling and named errors.
   - Add property normalizer that maps ATTOM output into local fields and excludes raw provider payload noise.
   - Add typed location normalizer for buyer/agent location choices.

4. Add API routes.
   - Add listing property/address lookup routes for setup and dashboard.
   - Add location search route for buyer intake.
   - Validate inputs with Zod, cap query length, handle nil/empty/provider errors explicitly.

5. Update setup listing UI.
   - Make address search the first control.
   - Show selected fact preview with accept/override behavior.
   - Preserve text autofill, manual fields, video URL, and pocket listing flag.
   - Keep three-listing requirement unchanged.

6. Update dashboard listing UI and APIs.
   - Reuse the same listing editor/search component where practical.
   - Support enriched listing create/update.
   - Keep add/edit recoverable when provider lookup fails.

7. Update buyer intake location flow.
   - Replace static-only neighborhood choices with typed search plus agent/listing-derived suggestions.
   - Store structured selected areas and mirror compatible labels into `neighborhoods`.
   - Keep "open to suggestions" available.

8. Update buyer media behavior.
   - Keep direct MP4 autoplay preview.
   - Treat Instagram/TikTok as external links only in v1.
   - Keep neutral no-media panel when media is absent or unsupported.

9. Add dashboard preference and activity summary helpers.
   - Format timeline, budget, beds/baths, areas, must-haves, deal-breakers, financing, drop-off step, and seller/buyer intent.
   - Replace visible raw JSON with grouped summary and keep raw JSON in a details/debug section.
   - Move human event labels into tested shared helper.

10. Add anonymous drop-off analytics.
    - Aggregate events by `agent_id + session_id`, including sessions whose events were later backfilled with a `lead_id`.
    - Count started intake, completed each question, reached contact gate, created lead, and inferred abandoned sessions after a 30-minute inactivity window.
    - Stop relying on `intake_abandoned` being emitted; infer abandonment from event sequences.
    - Add compact dashboard metrics panel with privacy-safe zero/error states.

11. Harden privacy and prompts.
    - Convert buyer listing serializers to allowlists before adding enrichment fields.
    - Audit buyer APIs and AI prompts so exact listing addresses, normalized addresses, ATTOM IDs, coordinates, APNs, and property facts remain redacted unless explicitly buyer-safe.
    - Add tests that fail if restricted enrichment fields appear in buyer-facing payloads after enrichment.

12. Verify and fix issues.
    - `./scripts/test.sh`
    - `./scripts/e2e.sh`
    - `npm run typecheck`
    - `npm run lint`
    - `npm run build`
    - Browser QA desktop/mobile for setup listing entry, buyer intake location step, matches media cards, dashboard listings, dashboard lead detail, and dashboard analytics.

## Test Plan

Unit tests:

- ATTOM client error mapping: missing key, 401/403, 404/no match, timeout/429, malformed JSON.
- ATTOM response normalization for basic/expanded profiles and missing optional fields.
- Listing enrichment persistence and update patch mapping.
- Google Places fixture normalization, attribution metadata, selected-area shape, and legacy `neighborhoods` compatibility.
- Preference summary formatting for buyer, seller, partial, empty, and unknown preference shapes.
- Activity label formatting for known and unknown events.
- Drop-off aggregation with anonymous sessions, converted leads after event backfill, inferred abandonment, and no events.
- Buyer-safe listing redaction after enrichment, including coordinates, normalized addresses, ATTOM IDs, APNs, and property facts.

E2E tests:

- Setup listing address lookup fills facts, then manual override survives publish.
- Dashboard listing add/edit uses address lookup and saves enrichment.
- Buyer typed area intake stores structured area and reaches contact gate.
- Dashboard lead detail shows readable summaries and raw details behind disclosure.
- Anonymous drop-off metrics count anonymous and converted sessions without creating anonymous lead rows.
- Match cards preserve exact-address redaction and media fallback order.

Browser QA:

- Desktop and mobile setup listing entry.
- Desktop and mobile buyer intake location step.
- Desktop and mobile dashboard lead detail and analytics panel.

## Worktree Parallelization

```text
Step                         | Modules touched                         | Depends on
-----------------------------|-----------------------------------------|-----------------------------
Provider clients/normalizers  | lib/property, lib/location, tests/unit  | env/config
Data model/migrations         | supabase, scripts, lib/types, dev-store | none
Setup/dashboard listing UI    | components/setup, dashboard, api        | provider + data model
Buyer intake location UI      | components/intake, api/intake           | location normalizer
Dashboard summaries/analytics | lib/dashboard, components/dashboard     | events + data model
Privacy/media hardening       | lib/listing-privacy, matches, tests     | data model
E2E/QA                        | tests/e2e, scripts                      | all feature lanes
```

Parallel lanes:

- Lane A: provider clients/normalizers plus unit tests.
- Lane B: migrations/types/dev-store.
- Lane C: dashboard summaries/activity/drop-off helpers.
- Lane D: UI integration after A+B, split into setup/dashboard listings and buyer intake if needed.
- Lane E: privacy/media hardening after B.
- Lane F: E2E/browser QA after D+E.

Execution order:

- Launch A+B+C in parallel if using separate worktrees.
- Merge A+B before UI work.
- Run D and E in parallel with careful shared type coordination.
- Run F last.

Conflict flags:

- `lib/types.ts`, `components/dashboard/dashboard-shell.tsx`, and `tasks/todo.md` are shared coordination points. Keep those edits sequential or merge early.

## GSTACK REVIEW REPORT

| Review | Trigger | Why | Runs | Status | Findings |
|--------|---------|-----|------|--------|----------|
| CEO Review | `/plan-ceo-review` | Scope & strategy | 1 | CLEAR | Balanced Product Spine selected; no expansions accepted beyond current task scope |
| Codex Review | `codex exec` outside voice | Independent 2nd opinion | 1 | ISSUES FOUND, INCORPORATED | Provider contract, privacy, analytics, caching, and test-priority gaps accepted into this plan |
| Eng Review | `/plan-eng-review` | Architecture & tests (required) | 2 | CLEAR | Current run: 20 issues reviewed, 0 unresolved, 0 critical gaps after plan fixes |
| Design Review | `/plan-design-review` | UI/UX gaps | 2 | CLEAR | Current run: 5/10 -> 8/10, 8 decisions made, 0 unresolved; mockup generation blocked by OpenAI org verification |
| DX Review | `/plan-devex-review` | Developer experience gaps | 0 | NOT RUN | Not required for this user-facing feature plan |

- **UNRESOLVED:** 0 for the formal design/eng review pass. Provider and `property_facts` decisions are now locked above.
- **VERDICT:** IMPLEMENTED + VERIFIED. The task shipped locally with the scoped listing enrichment, typed location intake, privacy-safe media/redaction, dashboard summaries, and anonymous analytics changes described below.

## Implementation Review

- Listing enrichment: added server-only ATTOM lookup with fixture fallback, normalized fact storage, Railway/Supabase/dev-store persistence, setup onboarding support, dashboard listing add/update support, and explicit environment docs for `ATTOM_API_KEY`.
- Location intake: added server-only Google Places Autocomplete integration with local/manual fallback, structured `selected_areas`, legacy `neighborhoods` mirroring, and dashboard preference summaries that read like lead context instead of raw JSON.
- Buyer privacy: converted listing redaction to an allowlist and updated buyer AI prompts so exact addresses, ATTOM IDs, normalized addresses, coordinates, and property facts stay agent-only.
- Media behavior: kept direct MP4 autoplay for agent-provided links and changed Instagram/TikTok to official external-link cards only. The permission checkbox was intentionally omitted per user decision.
- Analytics: added authenticated drop-off metrics from existing event sessions, including sessions converted to leads after `lead_id` backfill, without creating anonymous lead records.
- Dashboard usability: moved activity labels into shared code, replaced exact listing addresses in activity context with buyer-safe location labels, and added compact drop-off metrics plus grouped preference sections.

## Verification Review

- Automated: `./scripts/test.sh` passed with lint, typecheck, and 78 unit tests.
- E2E: `./scripts/e2e.sh` passed with 12 desktop/mobile Playwright tests after the setup-time lookup authorization fix.
- Visual/browser QA: a live local Next app was checked for setup property lookup, dashboard analytics, desktop buyer location intake, mobile buyer location intake, and buyer exact-address redaction. Screenshots were captured in `/private/tmp`.
- Diff hygiene: `git diff --check` passed.
- Design review outcome: the implemented UI matches the reviewed scope: search controls stay labeled, provider failure has manual fallback, dashboard analytics stay compact, and mobile location intake has no horizontal overflow.
- Engineering review outcome: the risky edges are covered by focused tests for provider fallback, event sanitization, drop-off aggregation, preference summaries, selected-area matching, buyer redaction, media handling, and setup-user property lookup auth.
