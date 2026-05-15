# Phase 3 Notes

Phase 3 expands the platform layer after Phase 2 proves that agents can self-onboard and work leads from the inbox dashboard.

## Subdomain Support

Extend `resolveAgent(request)` to inspect the request host. If the host is `{slug}.yourapp.com`, resolve the slug before falling back to path-based routing.

## Custom Domains

Use the `domains` table for verified custom domains and map them through Railway's custom-domain flow. `resolveAgent(request)` should check exact host matches against `domains.domain`.

## Authorized Listing Media

Add real listing photos/video through an authorized MLS/IDX/RESO data path rather than scraping Zillow, Redfin, or MLS pages from an address. The dashboard/setup flow should let agents connect a licensed feed or paste/upload media they have rights to use. Buyer cards should keep exact addresses redacted until showing intent, even when media comes from MLS.

## Billing

- Add subscription plans after the setup wizard and dashboard prove retention.
- Gate paid features at the agent/account level, not by buyer page route.
- Keep buyer pages fast and public even when billing state is checked server-side.

## Analytics Surface Area

Build analytics from `events`, `leads.tier`, `showing_requests`, and `lead_match_reasons`. Important signals include abandoned verification, dismissed listings, returning visits, and showing requests.

Phase 3 analytics should answer:

- Which channel creates hot leads?
- Which listings create showing intent?
- Which buyer questions predict high temperature?
- Which agent follow-up copy gets copied or regenerated?

Use simple event-derived aggregates first. Avoid heavy chart UI until the underlying signals are reliable.

## SMS-to-Buyer Expansion

Twilio Verify is Phase 1's only SMS use. Phase 3 can add buyer nurture texts, listing alerts, showing reminders, and agent handoff sequences.

## Platform Operations

- Railway custom-domain setup and domain verification workflow.
- Background jobs if request-time side effects become unreliable.
- Audit logs for agent account changes.
- Data export and deletion workflows for compliance.
