# AGENTS Guidelines

Welcome to GeoMeta! This repository houses a Next.js application in `app/` along with userscripts and tooling. These guidelines help automated and human contributors work consistently.

## Directory Overview
- `app/`: Next.js frontend and API routes written in TypeScript.
- `geometa-*.user.js`: userscripts for browser enhancements.
- Docs such as `README.md` and `MIGRATION.md` explain setup and deployment; update them when behavior changes.

## Environment
- Node.js 18+ is assumed.
- Install dependencies for the web app with `npm --prefix app install`.
- Use `npm --prefix app run dev` to start the dev server when manual testing is needed.

## Working Tips
- Use `rg` (ripgrep) for file searches; avoid `grep -R` and `ls -R`.
- Follow existing formatting; linting fixes can be done with `npm --prefix app run lint -- --fix` when necessary.
- Stick to async/await; await dynamic route params before property access.
- Keep functions pure and side-effect free when possible.
- Avoid console noise in committed code. Use descriptive variable names and comments sparingly.
- Sanitize user-supplied HTML before rendering (use DOMPurify as in `MemorizerCard.jsx`).

## Testing & Checks
- Run these before every commit:
  - `npm --prefix app run lint`
  - `npm --prefix app test` *(currently missing and may fail)*
- Add or update tests when modifying logic.
- If a command fails, make a best effort to address it or document the failure in the PR.

## Git Workflow
- Work directly on the current branch; do not create new branches.
- Each commit should represent a single logical change.
- Use conventional commit messages (`feat:`, `fix:`, `chore:`, `docs:`, etc.).
- Do not amend or rebase existing commits.

## Pull Requests
- In final PR messages:
  - Summaries must reference files/lines using `F:` citations.
  - Include terminal outputs with chunk IDs for any commands run.
  - Mention any failing commands and why they fail.
- Keep PR descriptions concise and focused on the change.

## Documentation
- Update `README.md`, `USERSCRIPT.md`, or other docs when behavior or usage changes.
- Keep `AGENTS.md` accurate; future contributors rely on it. Extend this file when new conventions arise.

## Miscellaneous
- Prefer small, well-named components over large monoliths.
- Reuse existing utilities and types rather than duplicating code.
- Be mindful of accessibility and responsive design in UI components.
- Additional nested `AGENTS.md` files can override these rules for their subdirectories.

## Memorizer Algorithm
- The spaced-repetition system uses a simplified SM-2 approach.
- **Card selection:** prioritizes due cards (new or scheduled for today/past) and chooses the most overdue; if none are due, shows the least-reviewed cards.
- **Feedback handling:**
  - `Again` (quality 0): marks the card as *lapsed* and schedules it about a week later.
  - `Hard` (quality 2): halves the current interval without counting as a lapse.
  - `Good` (quality 3): increases the interval (e.g., 1 → 6 → 15 days).
  - `Easy` (quality 5): from the second review onward applies a 1.3× bonus (e.g., 1 → 6 → 20 days).
- **Review stats:** the API exposes counts of due new and review cards so the UI can display daily progress.

Happy hacking!
