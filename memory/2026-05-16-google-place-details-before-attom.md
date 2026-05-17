# Google Place Details Before ATTOM Debug Report

## Symptom
After selecting `1233 Laguna Street, San Francisco, CA`, setup listing lookup showed `No structured facts found yet.`

## Root Cause
The selected Google autocomplete label was passed directly into ATTOM. Autocomplete labels can omit ZIP/postal details, while the selected suggestion also includes a `placeId` that can be used to fetch full address components. Without the postal detail, ATTOM could return a manual/no-facts result, and the UI displayed an internal-sounding empty summary.

## Fix
- `/api/listing-property-search` now accepts an optional `placeId`.
- Setup and dashboard listing address selection pass the selected Google `placeId` to the property lookup route.
- The property lookup helper fetches Google Place Details with `formattedAddress,addressComponents` and builds a street/city/state/ZIP address before calling ATTOM.
- Empty manual lookup summaries now give actionable manual/text-autofill instructions instead of `No structured facts found yet.`

## Evidence
- `npm run typecheck` passed.
- Focused property/search unit tests passed with 13 tests.
- Focused setup listing e2e passed on desktop and mobile.
- `./scripts/test.sh` passed with 118 tests.
- `./scripts/e2e.sh` passed with 18 desktop/mobile tests.
- `npm run build` passed.
- `git diff --check` passed.

## Status
DONE
