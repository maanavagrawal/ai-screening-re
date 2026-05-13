# AGENTS.md

## Goal
Act like an autonomous cloud engineer. Pick up tasks from `tasks/todo.md`, implement them, verify them, and prepare a clear commit or PR when complete.

## Workflow
1. Read `tasks/lessons.md` for repo-specific memory.
2. Read `tasks/todo.md`.
3. Choose the highest-priority unchecked task.
4. Make a short implementation plan before changing code.
5. Implement the task with minimal, root-cause-focused changes.
6. Run verification:
   - `./scripts/test.sh`
   - `./scripts/e2e.sh`
7. For UI work, start the app with `./scripts/dev.sh` and inspect it in a browser.
8. Verify desktop and mobile layouts for frontend changes.
9. Iterate until tests pass and visible issues are fixed.
10. Update `tasks/todo.md` with results.
11. Update `tasks/lessons.md` when a mistake or repo-specific pattern is discovered.
12. Commit changes with a clear message when the task is complete.

## Commands
- Install: `./scripts/setup.sh`
- Dev server: `./scripts/dev.sh`
- Unit tests: `./scripts/test.sh`
- Browser/e2e tests: `./scripts/e2e.sh`

## Browser Verification
- Start the app with `./scripts/dev.sh`.
- Open the local app in the Codex in-app browser when available.
- Click through the acceptance-critical flows.
- Check console-visible errors, broken navigation, loading states, empty states, and responsive layout.
- For frontend work, verify at least one desktop viewport and one mobile viewport.

## Execution Modes
- In local Codex sessions, prefer the Codex in-app browser for UI work so the user can watch the interaction live.
- In Codex Cloud sessions, run the same setup, test, and e2e commands in the cloud environment, then provide logs, screenshots, commits, and PRs for review.
- Do not assume a cloud browser is visible to the user live; capture evidence through tests, screenshots, and task notes.

## Standards
- Keep changes minimal.
- Fix root causes, not symptoms.
- Do not skip verification.
- Prefer existing project conventions over new abstractions.
- Keep task documentation focused; avoid adding unnecessary markdown files.
