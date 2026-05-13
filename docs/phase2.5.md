# Phase 2.5 Notes

Phase 2.5 is the distribution and automation layer that should not block the Phase 2 setup wizard or dashboard.

## Gmail Auto-Reply

- Connect Gmail with OAuth.
- Let an agent choose which inbox labels or sender patterns trigger replies.
- Generate replies from `agents.voice_notes`, listing inventory, and the agent's share link.
- Keep every generated reply reviewable by the agent before enabling automation.
- Log each generated reply as an event for later attribution.

## Advanced Distribution

- Short links for each channel and campaign.
- Social bio template versioning.
- QR code variants for signs, open houses, and print flyers.
- Source-level conversion recommendations, still as simple lists rather than full analytics dashboards.

## Notification Polish

- Digest emails for weekly lead quality.
- Per-agent quiet hours.
- Agent-level alert thresholds for hot leads and showing requests.

## Guardrails

- No buyer outreach automation without explicit opt-in.
- No Gmail sending from the dashboard during Phase 2.
- No analytics chart dashboard until Phase 3.
