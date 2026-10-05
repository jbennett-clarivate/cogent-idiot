# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

Angular v20 (standalone components, no NgModules) front end, migrated from a
legacy HTML/JS site. **It ships as a pure static site with no backend.**

`APP_CONFIG.apiServerUrl` is `""`, so `useMockBackend()` returns `true` and
`MockBackendInterceptor` (registered globally in `src/main.ts`) answers every
`/api/*` call in the browser before it reaches the network. Nothing in the
running app contacts a server. `npm run build:prod` output can be dropped on
any static host.

`server.js` is a complete Express/MySQL backend and still works, but it is
**not part of the normal setup**: the shared host kept killing the long-running
Node process, and when it was down nobody could log in. Rather than depend on a
process that would not stay up, the app moved to the in-browser mock. Treat
`server.js`, `.env`, `proxy.conf.json` and the `/api/*` contract below as the
reference implementation the mock mirrors — not as a live dependency.

**If you are debugging a login or `/api/*` problem, it is in
`src/app/interceptors/mock-backend.interceptor.ts`, not in `server.js`.**

## Commands

- `ng serve` — the normal way to run this app locally (frontend on 4200). The
  mock interceptor supplies `/api/*`, so **no backend is needed**.
- `npm run build:dev` — Angular dev build, output to `public_html/`.
- `npm run build:prod` — Angular production build, output to `public_html/`. This
  is the deployable artifact: static files, no Node process required.

Legacy backend commands, kept for working on `server.js` itself. None of these
are needed to run, build, test or deploy the app:

- `npm run dev` — `server.js` + `ng serve` concurrently, with `/api/*` proxied to
  :3000 by `proxy.conf.json`. **The proxy is inert** while the mock is active,
  because the interceptor answers first.
- `npm run server` — the Express backend alone.
- `npm start` — `node server.js`, serving whatever is in `public_html/`.
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

- **App: ng serve + Firefox** (compound) — the normal way to run this app.
- **App: ng serve (:4200)** — dev server alone; no backend involved.
- **Browser: Firefox (attach to running :4200)** — **attach-only.** It does not
  start a dev server; it connects to one that is already running, so breakpoints
  in `src/**/*.ts` hit in the browser. Run on its own with nothing on :4200 it
  fails in about two seconds with a message telling you to use the compound.
  That is expected, not a bug.
- **Tests: Unit (headless, single run)** — `ng test --watch=false`; breakpoints in `*.spec.ts`.
- **Tests: Unit (watch)** — same, re-runs on change.
- **Legacy: Express (:3000)** / **Legacy: Express + ng serve** / **Legacy: full
  stack** — only for working on `server.js`. Not needed to run the app.

Two traps in the Firefox debug config, both of which present as the launch
failing rather than as a config error:

- `reloadOnChange` must be a glob/array/object, never a boolean. The extension
  normalizes any non-string, non-array value by reading `.watch` off it, so
  `true` fails with "Cannot read properties of undefined (reading 'map')".
- `profileDir` must point at `.vscode/firefox-profile`, which ships
  `devtools.debugger.remote-enabled`. Firefox only starts its remote debugger
  server when that pref is set, and the extension's own profile preparation does
  not reach the browser through `scripts/firefox-flatpak.sh`'s `exec`. Without
  it Firefox launches, refuses the connection, and the adapter times out — which
  looks like "Firefox never opens and dies after a delay". Do not add
  `keepProfileChanges`; the prefs survive the extension's per-run profile copy,
  and setting it makes Firefox write 60+ files of state into the repo.

The Legacy configs set `envFile` to `.env` so `HOSTING_PROVIDER` etc. reach
`server.js`; the app configs need no env at all. Browser configs set
`firefoxExecutable` to `scripts/firefox-flatpak.sh`, because VSCodium runs inside
a Flatpak sandbox with no browser on `PATH`; a `chrome`-type config would look
for a Chrome that is not installed. The `firefox` debug type requires the
`firefox-devtools.vscode-firefox-debug` extension.

Linting and formatting are split, deliberately:

- `npm run lint` / `npm run lint:fix` runs ESLint v9 **flat config** at
  `eslint.config.js` (the old `.eslintrc.json` is gone; v9 cannot read it).
  Correctness and Angular rules only: `@angular-eslint` selector prefixes,
  `prefer-inject`, unused vars, `no-explicit-any` as a warning.
- `npm run format` / `npm run format:check` runs Prettier, configured in
  `.prettierrc`: **tabs, double quotes, semicolons**, `printWidth: 120`,
  `trailingComma: all`, `arrowParens: avoid`. HTML/JSON/Markdown override to
  2 spaces.

`eslint-config-prettier` is applied last in every flat-config block, so ESLint
holds no stylistic opinion that could fight the formatter. Do not add `quotes`,
`semi` or `indent` rules back to `eslint.config.js`; that is what the two
tools fighting looks like.

`dist/` and `coverage/` are in ESLint's `ignores`. Without them a lint run
reports ~1,990 `no-undef` errors against webpack's generated bundles and buries
the ~26 real findings.

The editor is wired for this in `.vscode/settings.json`: format-on-save via
`rvest.vs-code-prettier-eslint` (Prettier, then ESLint `--fix`), with
`eslint.useFlatConfig: true`, which the v9 extension needs.

Known pre-existing findings, not yet addressed: 20 `prefer-inject` errors
(constructor injection in `auth.service.ts`, `environment.ts`, `tool-wrapper.ts`),
and `quadrant-anchor.directive.ts` uses the selector `[quadrantAnchor]` without
the `app` prefix its own rule requires, and renaming it touches eight templates.

## Architecture

### Frontend structure (`src/app/`)

- `app.routes.ts` — all routing. Standalone, lazy-loaded (`loadComponent`) routes. Most routes live under `/tools/*` inside `ToolWrapperComponent` and are gated by `AuthGuard`.
- `components/` — one directory per route/feature (`bayes`, `listcomparator`, `listrandom`, `pwned`, `safecron`, `taxes`, `ice`, `home`, `login`, `exit`).
- `services/` — `auth.service.ts` (login/session state as `BehaviorSubject`s), `environment.ts` (API base URL), `app-utils.ts`, `quadrant-anchor-positioner.ts`.
- `guards/auth.guard.ts` — blocks `/tools/*` and `/home` until `AuthService.isAuthenticated$` resolves non-null.
- `interceptors/mock-backend.interceptor.ts` — intercepts all `/api/*` HTTP calls and fakes the backend entirely in-browser (see Mock backend below).
- `config/app.config.ts` — `APP_CONFIG.apiServerUrl`; `useMockBackend()` returns `true` when it's empty, which is how the mock interceptor decides to activate.
- Path aliases (see `tsconfig.json`): `@/*` → `src/*`, `@app/*` → `src/app/*`, `@services/*` → `src/app/services/*`, `@components/*` → `src/app/components/*`.

### Mock backend — the live `/api` implementation

`MockBackendInterceptor` is active whenever `APP_CONFIG.apiServerUrl` is empty,
which is the committed default. **This is the app's real backend today.**

It serves all nine endpoints in-browser — `/api/health`, `/api/auth/pepper`,
`/api/auth/salt`, `/api/login`, `/api/auth/status`, `/api/auth/refresh`,
`/api/logout`, `/api/tools` — and faithfully mirrors the salt/pepper protocol
below, including the deterministic fake salt for unknown users (anti-enumeration)
and constant-time hash comparison.

Session state is a single `sessionStorage` key (`mock_session_login`), so a
login lasts until the tab closes. There is no server-side expiry.

The seed user is hardcoded in the interceptor and its credentials are printed on
the login page: `GLaDOS@brightmatter.tools` / `ABCDGH`
(`sha256("salt123" + "ABCDGH")` is the stored DHP). It is a public demo account
for a public demo site — not a secret.

Setting `APP_CONFIG.apiServerUrl` to a non-empty URL disables the interceptor and
sends `/api/*` to that origin, which is what `server.js` implements. Keep the two
in sync if the auth flow ever changes.

### Login flow (salt + pepper hashing, both real and mock backend)

1. Client requests a per-session `pepper` (`GET /api/auth/pepper`), stored server-side in the session.
2. Client requests the user's `salt` (`POST /api/auth/salt` with `username`); server looks up or deterministically fakes a salt (to avoid username enumeration) and stores `username`/`salt` in the session.
3. Client hashes the password with salt and pepper client-side and posts `hashedPepperedPassword` to `POST /api/login`; server recomputes the expected hash from the stored password hash + pepper and compares with `crypto.timingSafeEqual`.
4. On success the session records `login`; `AuthService` tracks auth state via `/api/auth/status` and `/api/auth/refresh`.

### Backend (`server.js`) — reference implementation, not in the live path

Single-file Express app, retained for reference and for the self-hosted case.
The deployed site does not run it. Key behaviors:

- `isLocalhost` (`HOSTING_PROVIDER !== "godaddy"`) toggles between a real MySQL pool (`mysql2/promise`) and an in-memory `mockDatabase` for `queryDatabase()`.
- Sessions: `express-session`, with `session-file-store` (`./sessions/`) when not on localhost, MemoryStore otherwise.
- `helmet` CSP is configured to allow `api.pwnedpasswords.com` (used by the `pwned` tool) and Google Analytics domains.
- Serves `public_html/` as static assets with per-extension `Cache-Control` headers.
- `DEBUG_AUTH=true` env var enables verbose session logging on every request — noisy, dev-only.

### Ice emblem 3D component (`src/app/components/ice/`)

A Three.js-rendered 3D crystal emblem derived from `src/assets/images/3d-image.svg` (LibreOffice Draw export, viewBox `0 0 21590 27940`, symmetry axis `x = 10777`). See `AGENTS.md` for full details on the SVG source-of-truth convention, per-object file layout under `shapes/`, and known gotchas (e.g. `mergeGeometries` silently returns null on mismatched/mixed indexed geometry — always `.toNonIndexed()` before merging; blades must stay flat bevel-extruded outlines, not swept tubes).

## Environment / secrets

`.env` (not committed) configures `server.js` only: `HOSTING_PROVIDER`, `PORT`,
`API_URL`, `ALLOWED_ORIGIN`, `DB_HOST`/`DB_USER`/`DB_PASSWORD`/`DB_NAME`,
`SESSION_SECRET`, `DEBUG_AUTH`.

**The Angular app reads none of these.** With the mock interceptor active there
are no runtime secrets at all — which is part of why a static deploy is viable.
