# ATTOM Lookup Fallback Debug Report

## Symptom
Agents saw `ATTOM lookup failed with 400` on setup listing entry, including after choosing an address-looking option from the dropdown.

## Root Cause
The setup listing flow passed Google address labels directly into ATTOM. Some labels include country text or full state names, which do not match ATTOM's documented `address1` plus `address2` request shape. Also, when Google returned no address predictions, the listing autocomplete invented a manual dropdown option from the typed text, making partial input look like a selectable provider result.

## Fix
- Listing address suggestions now return no dropdown option when Google has no predictions instead of adding a manual pseudo-suggestion.
- ATTOM requests now strip trailing country text and normalize full US state names before setting `address1` and `address2`.
- Clearly incomplete addresses skip the ATTOM network call and return a manual fallback result.
- ATTOM `400` responses return a manual fallback result with actionable copy instead of surfacing the raw provider error.
- Setup listing cards open `Autofill from text` when lookup returns a manual fallback.

## Evidence
- `npm run typecheck` passed.
- Focused unit tests passed: `tests/unit/property-lookup.test.ts` and `tests/unit/listing-property-search-route.test.ts`, 11 tests.
- Focused setup listing e2e passed on desktop and mobile.
- `./scripts/test.sh` passed with 116 tests.
- `./scripts/e2e.sh` passed with 18 desktop/mobile tests.
- `npm run build` passed after network escalation for Next font fetches.
- `git diff --check` passed.
- Live browser smoke on `/setup/listings` showed the new incomplete-address message and text fallback, then the temporary listing card was removed.

## Status
DONE
