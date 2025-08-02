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
- Update `README.md`, `USERSCRIPT-README.md`, or other docs when behavior or usage changes.
- Keep `AGENTS.md` accurate; future contributors rely on it. Extend this file when new conventions arise.

## Miscellaneous
- Prefer small, well-named components over large monoliths.
- Reuse existing utilities and types rather than duplicating code.
- Be mindful of accessibility and responsive design in UI components.
- Additional nested `AGENTS.md` files can override these rules for their subdirectories.

Happy hacking!
