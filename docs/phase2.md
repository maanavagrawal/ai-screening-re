# Phase 2 Notes

Phase 2 adds the agent side. Do not build it in Phase 1.

## Dashboard API Contracts

- Read leads by `agent_id`, including `tier`, `brief`, contact info, and preferences.
- Read events by `lead_id` and `agent_id` for timeline and abandonment signals.
- Read showing requests by `agent_id`, joined through leads and listings.
- Read listings by `agent_id` for agent-owned inventory management.

## Dashboard Tables

- `agents`
- `listings`
- `leads`
- `lead_match_reasons`
- `showing_requests`
- `events`

## Setup Wizard Architecture

The setup wizard should collect the same fields as `docs/onboarding-checklist.md`, validate them client-side, then call a server action or API route that invokes `onboardAgent(payload)`.

## Shared Onboarding Primitive

The wizard must call `onboardAgent()` exactly like `scripts/seed.ts`. No alternate insert path, no dashboard-only agent creation logic.
