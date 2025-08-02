# AGENTS Guidelines

Welcome to GeoMeta! This repository contains a Next.js application under `app/` and supporting scripts.

## Development
- Use `rg` (ripgrep) for searching; avoid `grep -R` and `ls -R`.
- Run checks before committing:
  - `npm --prefix app run lint`
  - `npm --prefix app test` (even if it fails or is missing)
- Follow existing TypeScript and ESLint conventions.
- Prefer async/await; await dynamic route params before accessing their properties.

## Git
- Commit directly to the main branch; do not create new branches.
- Write conventional commit messages (e.g., `feat:`, `fix:`, `chore:`).

## PRs
- Summaries should cite files and lines.
- Record terminal outputs for tests using chunk IDs in the final message.

More nested `AGENTS.md` files may override these guidelines.
