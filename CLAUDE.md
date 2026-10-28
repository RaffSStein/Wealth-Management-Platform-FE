# CLAUDE.md

Context for Claude Code when working in this repository. Longer-form references: `README.md`,
`.github/copilot-instructions.md` (coding conventions, auth/login patterns), `openapi/README.md`, `docs/`.
Keep this file current: when we learn something non-obvious about the repo, the BE or a decision we made, add it here.

## Project

Front end of **WMP** (Wealth Management Platform; working name, no final brand yet). Used by two main roles:
**customer** and **advisor** (BE also has `ADMIN`). Work in progress; also meant as a personal portfolio piece.

- Angular 21: standalone components, signals, `inject()`, lazy `loadComponent` routes, SSR (`@angular/ssr` + Express).
  Zone-based change detection is kept explicitly (`provideZoneChangeDetection`, added by the v21 migration).
- UI library: **PrimeNG 21** (MIT) + `@primeuix/themes` 2.x, styled mode with our own preset. SCSS for app styles.
  Material Symbols icon font loaded in `src/index.html`; IBM Plex via `@fontsource` (registered in `angular.json` styles).
- Tests: Karma + Jasmine (`ng test`).
- **No deprecated APIs** (user requirement): check `@deprecated` in typings before using a library API. E.g. no
  `@angular/animations`/`provideAnimationsAsync`, no `label`/`icon` inputs on the `pButton` directive (use `p-button`
  or `pButtonLabel`), `class` instead of `styleClass`, no PrimeNG `*TransitionOptions` (use `motionOptions`).
- Don't upgrade to PrimeNG 22+: it moved to the commercial PrimeUI license.

## Commands

```bash
npm start                 # ng serve on :4200 (uses proxy.conf.js for /<service> paths)
npm run build             # production build (SSR output in dist/)
npm test                  # Karma unit tests
npm run openapi:gen:all   # regenerate API clients from openapi/*.yaml
```

- `package-lock.json` is committed (lockfile v3, generated with npm 11): use `npm ci` for reproducible installs.
- npm 10.9 crashes (`Cannot read properties of null (reading 'edgesOut')`) resolving `@angular/build` 21's optional
  vitest peers when it has to build the tree from scratch (no lockfile); `npx npm@11 install` works.
- Node 22.19 is fine for Angular 21; the Angular 22 CLI needs Node ≥ 22.22, so `ng update` may try to fetch it. Run the
  local CLI with `NG_DISABLE_VERSION_CHECK=true node node_modules/@angular/cli/bin/ng.js ...`.
- No Chrome on this machine: run tests headless with Edge via
  `CHROME_BIN="C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" npx ng test --watch=false --browsers=ChromeHeadless`.

## Repository layout

```
openapi/<x>-api-data.yaml   copies of BE specs -> generated clients in src/app/api/<x>-service (not committed)
src/app/core/               services (auth, user-session, onboarding state), guards, interceptors
src/app/layout/             AppShell (header + side nav + drawer), navigation.ts (nav model), acting-as banner
src/app/pages/              one folder per route area (auth, login, onboarding, home, investments, markets, advisor...)
src/app/shared/             reusable components (notification-bell, page-placeholder, stepper, password-strength, ...)
src/styles/                 global SCSS partials: _variables (tokens), _base, _forms, _icons, _surfaces
docs/                       functional docs (process + diagrams), mirrored from the BE repo style
```

- Routes: public `/`, `/auth/*`, `/terms`, `/onboarding/start` (sign-up) and `/onboarding/setup-password` (one-time
  email link). Every other `/onboarding/*` step uses `authGuard` + `onboardingStepGuard` (`data.step`). `/app/*` uses
  `authGuard` (token present, else `/auth/sign-in?returnUrl=`). `/app/advisor/**` uses `roleGuard('ADVISOR')`.
- Render modes (`app.routes.server.ts`): public routes are prerendered; `app/**`, `onboarding/**`, `dev/**` render on the
  client (session lives in sessionStorage; also avoids the PrimeNG p-motion hydration bug below).
- Components currently carry **inline templates and styles** in the `.ts` file; many pages under `/app` are placeholders.
  Inline `styles` are backtick template literals: never put backticks inside them (e.g. in CSS comments), because that
  breaks compilation.
- Legacy global element rules (`_forms.scss`: `button { height: 38px; font-weight: 600 … }`) still apply to plain
  `<button>`s in new components. Reset `height`/`font-weight` on custom buttons, or use PrimeNG buttons.

### Roles, workspace and shell
- Roles: `UserSessionService.roles()` / `isAdvisor()` come from `/me` → `userBranchRoles[].role` (BE `WmpRole`:
  `CUSTOMER`, `ADVISOR`; no roles means CUSTOMER, like the BE).
- `WorkspaceContextService`: `actingAsClient()` (an advisor with a selected customer in `CustomerSessionService`),
  `clientName()`, `homePath()`, `exitClient()`. Customer selection (`/onboarding/disambiguation`) sets the customer.
- Login routing: advisors go to `returnUrl` or `/app/advisor`. Customers go to customer selection unless a customer is
  already selected (then `returnUrl` or `/app/home`).
- Navigation model: `layout/navigation.ts` (`navigationFor({isAdvisor, actingAsClient})`, `activeSection(url)`). Add
  pages there, not in the shell. The advisor workspace pages are placeholders (`shared/components/page-placeholder` via
  route `data`) until advisor-service exists.
- Toasts: keep using `ToastService` (`success/error/info/warning`). It is a facade over PrimeNG `MessageService`
  (root-provided in `app.config.ts`), rendered by a deferred `<p-toast>` in `app.html`.

## Back end

- Repo: `C:\Users\Raffaele\Desktop\Dev\proposal` (has its own `CLAUDE.md` — read it for BE details).
- Java 21 / Spring Boot microservices, Kafka events, Postgres per service, `docker compose up -d` for local infra.
- API-first: specs live in BE `business-modules/<x>-service/<x>-api-data/`. When a spec changes there, copy it into
  `openapi/` here and run `npm run openapi:gen:<x>`.
- Dev proxy (`proxy.conf.js`): user-service :8083, order-service :8082, document-service :8091,
  customer-service :8090, bank-service :8089. Each service is served under context path `/<service-name>`.
- Auth: JWT bearer, attached by `authInterceptor`. Roles are checked with `@PreAuthorize("hasRole('ADVISOR')")` etc.;
  in user-service roles are branch-scoped strings (`UserBranchRoleDTO.role`).
- `UserSettingsDTO` (user-service) has `language` and `theme` → use `theme` to persist dark/light preference.

## UI / visual identity

Chosen direction: **"Ledger Pro"** (dark-first, data-dense). Mockups: https://claude.ai/artifact/RAG8XaL8fkESVMKvt1F2AA
(row C). Palette may be refined later.

| Token | Value | Use |
|---|---|---|
| bg | `#0D1117` | page background |
| surface | `#161B22` | panels, cards, inputs |
| surface-raised | `#1F2630` | hover, secondary buttons |
| border | `#2A323D` | dividers, control borders |
| text / muted | `#E6EAF0` / `#8B95A3` | body / secondary text |
| primary | `#2DD4BF` (on-primary `#04221E`) | CTAs, focus, active nav |
| gain / loss | `#6EE7A8` / `#FB923C` | P/L (green/orange, colour-blind friendly) |

- Type: IBM Plex Sans (UI) + IBM Plex Mono (prices, quantities, ISINs, KPIs). Radius 6px (cards 8px).
- Use tokens, never hardcoded hex values, in components. Utilities: `.num` (mono, tabular figures), `.gain`, `.loss`.
  Chart series colours: `--wmp-chart-1..4`.

### Theme architecture
- `src/styles/_tokens.scss`: `--wmp-*` CSS variables, dark on `:root.wmp-dark`, light on `:root:not(.wmp-dark)`.
- `src/app/theme/ledger.preset.ts`: PrimeNG preset (Aura base) with the **same hex values**. Keep the two in sync.
- `src/styles/_variables.scss`: legacy `--color-*` names aliased to `--wmp-*` so pre-redesign screens reskin for free.
  Delete them once every screen is migrated.
- Cascade layers (`styles.scss` + `cssLayer` in `app.config.ts`): `wmp-reset < wmp-legacy < primeng < unlayered`.
  Global element rules (`_forms.scss` `button {}`, `input {}`) live in `wmp-legacy`, so they never override PrimeNG.
  Component styles are unlayered and can still customise PrimeNG.
- Dark is the default: `index.html` ships `<html class="wmp-dark">`, and an inline script removes it before paint when
  `localStorage['wmp.theme'] === 'light'`. `ThemeService` (`core/services/theme.service.ts`) toggles and persists it.
  The toggle UI comes in Phase 1 (shell header). Later, sync with user-service `UserSettingsDTO.theme`.
- `/dev/ui-kit` (`pages/dev/ui-kit.component.ts`): living style guide of tokens + PrimeNG components in both themes.
- **PrimeNG 21 + SSR bug:** `<p-motion>` (used by Stepper/Accordion panels) keeps the server-rendered `display: none`
  after hydration, so initially-expanded panels stay hidden. All app/onboarding/dev routes are client-rendered, so this
  only matters if a prerendered public page ever uses such a panel.

## Decisions log

- 2026-10-28 — Visual identity C "Ledger Pro" chosen; product name **WMP** for now.
- 2026-10-28 — UI library: **PrimeNG 21** (styled mode, custom design-token preset for Ledger Pro, dark default).
  Angular upgraded 20 → 21 for it (PrimeNG 20 needs the deprecated `@angular/animations`; 22 is commercially licensed).
- 2026-10-28 — Initial bundle budget raised to 700 kB warning / 1.2 MB error (PrimeNG theme engine + preset load at startup).
- Redesign is phased: 0 foundation (library, tokens, fonts, brand) → 1 app shell (role-aware nav) →
  2 auth + onboarding → 3 dashboard → 4 remaining pages.

## Conventions

See `.github/copilot-instructions.md` (English-only code/comments; signals for UI state; `firstValueFrom` for one-shot
HTTP; `ToastService` for feedback; no PII/tokens in logs or URLs). Commit only when asked; branch off `main` first.
