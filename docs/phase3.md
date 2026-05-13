# Phase 3 Notes

## Subdomain Support

Extend `resolveAgent(request)` to inspect the request host. If the host is `{slug}.yourapp.com`, resolve the slug before falling back to path-based routing.

## Custom Domains

Use the `domains` table for verified custom domains and map them through the Vercel custom domains API. `resolveAgent(request)` should check exact host matches against `domains.domain`.

## Analytics Surface Area

Build analytics from `events`, `leads.tier`, `showing_requests`, and `lead_match_reasons`. Important signals include abandoned verification, dismissed listings, returning visits, and showing requests.

## SMS-to-Buyer Expansion

Twilio Verify is Phase 1's only SMS use. Phase 3 can add buyer nurture texts, listing alerts, showing reminders, and agent handoff sequences.
