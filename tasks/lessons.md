# Lessons

- This repo starts from an empty scaffold. Keep setup files lightweight until the actual application stack is added.
- Use `./scripts/setup.sh`, `./scripts/dev.sh`, `./scripts/test.sh`, and `./scripts/e2e.sh` as the stable entrypoints for Codex Cloud and local Codex work.
- Local Codex can use the in-app browser for live watchable UI iteration; Codex Cloud should leave logs, screenshots, commits, and PRs as evidence.
- Deployment preference changed after setup friction: target Railway for the Next.js frontend/API and Railway Postgres for persistence. Keep Supabase as optional legacy compatibility only.
- The Codex in-app browser reaches this local dev server through the LAN URL `http://10.0.0.37:3001`; `localhost`/`127.0.0.1` can be blocked in that surface.
- LAN preview is not always a secure context, so browser APIs such as `crypto.randomUUID()` need practical fallbacks in client code.
- Keep Playwright e2e deterministic: start a fresh dedicated server port, disable external AI/Twilio calls with env flags, and avoid reusing stale Next dev servers.
- Do not run `next build` at the same time as Playwright or a watched `next dev` server. Next mutates `.next`, and overlapping processes can produce stale chunk/runtime errors that disappear when build and dev are run separately.
- The Codex in-app browser is best for visible navigation, clicks, screenshots, and console checks. If text entry fails because the browser surface lacks clipboard APIs, use Playwright e2e for form-typing proof and keep browser QA focused on live visual/click verification.
- Intake screens must guard pending advancement. Without a pending ref/state, repeated Continue clicks can create overlapping `/api/intake/next` requests and stuck transitions.
- Listing cards should always render an image-backed media preview; remote videos can be slow or blank before they emit loaded data.
