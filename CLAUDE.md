# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

Angular v20 (standalone components, no NgModules) front end with an Express/Node.js backend, migrated from a legacy HTML/JS site. The backend serves the built Angular app statically and exposes a small `/api/*` surface, primarily for a custom SRP-like (salt/pepper) login flow backed by MySQL in production.

## Commands

- `npm run dev` — run backend (`server.js`) and `ng serve` concurrently for local development (frontend on 4200, proxied to backend on 3000 via `proxy.conf.json`).
- `npm run server` — run only the Express backend (`node --no-deprecation server.js`).
- `npm run build:dev` — Angular dev build, output to `public_html/`.
- `npm run build:prod` — Angular production build, output to `public_html/`.
- `npm start` — run `node server.js` directly (serves whatever is currently in `public_html/`).
- `npm test` — run Karma/Jasmine unit tests (`ng test`, headless Firefox via `karma.conf.js`).
- `npm run test:ci` — same, single run, no watch.
- `npm run test:flatpak` — run tests from inside the VSCodium Flatpak sandbox, where
  no browser is on `PATH`. Uses `scripts/firefox-flatpak.sh`, which execs the host's
  Firefox at `/run/host/usr/lib64/firefox/firefox` and bridges `/run/host/usr/lib64`
  onto `LD_LIBRARY_PATH` (the Flatpak runtime has no `libevent-2.1.so.7`). Note that
  `npx playwright install` cannot work in that sandbox — it has no writable
  `~/.cache` and the runtime lacks gtk-4/enchant/libevent.
- `./build.sh` — CI-style build: `npm ci`, wipe and recreate `public_html/`, then `npm run build:prod`.
- Restart `npm run dev` after adding or removing `.ts` files — the Angular watcher caches deletions and will throw "missing from TypeScript compilation" otherwise.

A custom Karma launcher must never be named after its own `base` (a
`Firefox: { base: "Firefox" }` entry makes Karma's injector recurse until it dies
with `RangeError: Maximum call stack size exceeded`). `tsconfig.spec.json` must keep
`@webgpu/types` in `types`, or `three`'s `ExternalTexture.d.ts` fails to resolve
`GPUTexture` and the test build aborts.

Review intent and conventions for tests live in `.github/code-review.instructions.md`
(note: `/.github/` is gitignored in this repo, so that file is local-only).

### Debugging from the IDE (`.vscode/launch.json`)

Prefer the Run and Debug panel over the terminal. Configurations:

- **Server: Express (:3000)** — backend alone, breakpoints in `server.js`.
- **Tests: Unit (headless, single run)** — `ng test --watch=false`; breakpoints in `*.spec.ts`.
- **Tests: Unit (watch)** — same, re-runs on change.
- **Browser: Firefox on :4200** — attaches to the dev server; breakpoints in `src/**/*.ts`.
- **Dev: server + ng serve** — the `npm run dev` equivalent.
- **Dev: full stack** (compound) — the previous two plus Firefox, in one click.

Every config sets `envFile` to `.env`, so `HOSTING_PROVIDER` etc. apply under the
debugger exactly as they do from the shell. Browser configs set
`firefoxExecutable` to `scripts/firefox-flatpak.sh`, because VSCodium runs inside
a Flatpak sandbox with no browser on `PATH`; a `chrome`-type config would look
for a Chrome that is not installed. The `firefox` debug type requires the
`firefox-devtools.vscode-firefox-debug` extension.

There is no separate lint script in `package.json`; ESLint config exists at `.eslintrc.json` (run via `npx eslint` if needed). Tabs for indentation, double quotes, semicolons required — enforced by ESLint.

## Architecture

### Frontend structure (`src/app/`)
- `app.routes.ts` — all routing. Standalone, lazy-loaded (`loadComponent`) routes. Most routes live under `/tools/*` inside `ToolWrapperComponent` and are gated by `AuthGuard`.
- `components/` — one directory per route/feature (`bayes`, `listcomparator`, `listrandom`, `pwned`, `safecron`, `taxes`, `ice`, `home`, `login`, `exit`).
- `services/` — `auth.service.ts` (login/session state as `BehaviorSubject`s), `environment.ts` (API base URL), `app-utils.ts`, `quadrant-anchor-positioner.ts`.
- `guards/auth.guard.ts` — blocks `/tools/*` and `/home` until `AuthService.isAuthenticated$` resolves non-null.
- `interceptors/mock-backend.interceptor.ts` — intercepts all `/api/*` HTTP calls and fakes the backend entirely in-browser (see Mock backend below).
- `config/app.config.ts` — `APP_CONFIG.apiServerUrl`; `useMockBackend()` returns `true` when it's empty, which is how the mock interceptor decides to activate.
- Path aliases (see `tsconfig.json`): `@/*` → `src/*`, `@app/*` → `src/app/*`, `@services/*` → `src/app/services/*`, `@components/*` → `src/app/components/*`.

### Mock backend mode
When `APP_CONFIG.apiServerUrl` is empty, `MockBackendInterceptor` fully emulates `/api/health`, `/api/auth/pepper`, `/api/auth/salt`, `/api/login`, `/api/auth/status`, `/api/auth/refresh`, `/api/logout`, and `/api/tools` in-browser using `sessionStorage`, with a hardcoded seed user. This is how the app can run as a static demo with no real Express backend. It mirrors the real server's salt/pepper login protocol (see below) exactly, including timing-safe comparison — keep both in sync if the auth flow changes.

### Login flow (salt + pepper hashing, both real and mock backend)
1. Client requests a per-session `pepper` (`GET /api/auth/pepper`), stored server-side in the session.
2. Client requests the user's `salt` (`POST /api/auth/salt` with `username`); server looks up or deterministically fakes a salt (to avoid username enumeration) and stores `username`/`salt` in the session.
3. Client hashes the password with salt and pepper client-side and posts `hashedPepperedPassword` to `POST /api/login`; server recomputes the expected hash from the stored password hash + pepper and compares with `crypto.timingSafeEqual`.
4. On success the session records `login`; `AuthService` tracks auth state via `/api/auth/status` and `/api/auth/refresh`.

### Backend (`server.js`)
Single-file Express app. Key behaviors:
- `isLocalhost` (`HOSTING_PROVIDER !== "godaddy"`) toggles between a real MySQL pool (`mysql2/promise`) and an in-memory `mockDatabase` for `queryDatabase()`.
- Sessions: `express-session`, with `session-file-store` (`./sessions/`) when not on localhost, MemoryStore otherwise.
- `helmet` CSP is configured to allow `api.pwnedpasswords.com` (used by the `pwned` tool) and Google Analytics domains.
- Serves `public_html/` as static assets with per-extension `Cache-Control` headers.
- `DEBUG_AUTH=true` env var enables verbose session logging on every request — noisy, dev-only.

### Ice emblem 3D component (`src/app/components/ice/`)
A Three.js-rendered 3D crystal emblem derived from `src/assets/images/3d-image.svg` (LibreOffice Draw export, viewBox `0 0 21590 27940`, symmetry axis `x = 10777`). See `AGENTS.md` for full details on the SVG source-of-truth convention, per-object file layout under `shapes/`, and known gotchas (e.g. `mergeGeometries` silently returns null on mismatched/mixed indexed geometry — always `.toNonIndexed()` before merging; blades must stay flat bevel-extruded outlines, not swept tubes).

## Environment / secrets

Backend config comes from `.env` (not committed): `HOSTING_PROVIDER`, `PORT`, `API_URL`, `ALLOWED_ORIGIN`, `DB_HOST`/`DB_USER`/`DB_PASSWORD`/`DB_NAME`, `SESSION_SECRET`, `DEBUG_AUTH`.
