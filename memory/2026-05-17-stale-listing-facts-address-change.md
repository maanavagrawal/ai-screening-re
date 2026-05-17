# DEBUG REPORT: Stale Listing Facts After Address Change

- Symptom: On `/setup/listings`, an agent could select one address, get property facts auto-populated, then type/select a different address while the prior price, neighborhood, beds, baths, sqft, and property type remained visible.
- Root cause: Setup listing lookup previously preserved existing visible fields while applying provider enrichment. The successful lookup path now replaces those fields, but the edit-in-progress state still showed old values until lookup completed. The failed lookup path could also re-save old fields because it patched the original `listings` closure after the clear.
- Fix: `components/setup/setup-wizard.tsx` now clears address-specific visible fields and enrichment as soon as the address changes from the synced listing, replaces provider-controlled facts on lookup success, and keeps the cleared fields in lookup-error patches. `components/dashboard/dashboard-shell.tsx` uses the same replace-not-preserve behavior for dashboard add-listing lookup.
- Evidence: The updated Playwright regression changes from a San Ramon address to an Oakland address and verifies old fields clear immediately, new facts replace them after selection, and Continue stays disabled until the new listing has its own price.
- Regression test: `tests/e2e/agent-phase2.spec.ts` in `setup listing entry starts with address lookup and reveals details`.
- Verification: `npm run typecheck`; focused `npm run e2e -- tests/e2e/agent-phase2.spec.ts --grep "setup listing entry starts"` on desktop/mobile; `./scripts/test.sh`; `./scripts/e2e.sh`; `npm run build`; `git diff --check`.
- Status: DONE.
