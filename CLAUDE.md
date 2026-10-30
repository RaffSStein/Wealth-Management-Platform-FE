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

### Public & onboarding screens (Phase 2)
- Layouts: `shared/components/auth-layout` (public/auth pages) and `shared/components/onboarding-layout` (step rail +
  header + content, with `[aside]` and `[actions]` slots). Form utilities live in `src/styles/_ui.scss` (`.wmp-form`,
  `.wmp-form-grid`, `.wmp-field`, `.wmp-actions`, `.wmp-panel`). `shared/components/brand` is the WMP wordmark.
- **Submit buttons outside their `<form>`** (e.g. in `[actions]`) must be native `<button pButton type="submit" form="id">`:
  `p-button` doesn't forward the `form` attribute, so it silently never submits.
- PrimeNG DatePicker uses `dataType="string" dateFormat="yy-mm-dd"` (BE format). It only parses typed text that follows a
  keydown, which matters for E2E scripts.
- BE onboarding step names map to FE steps via `OnboardingProgressService.stepFromBackend()`. Never `parseInt` them.
  BE step status is `DONE` / `REJECTED` (not `COMPLETED`, which is only the MiFID filling status).
- Save & exit: every onboarding step has "Exit" (layout header) and the form steps have "Save & exit"
  (`WorkspaceContextService.exitOnboarding()`: advisors go back to their workspace, customers to their profile list).
  Steps pre-fill from `GET /customer/{id}` and **send row `id`s back**. Personal details uses `initCustomer` only
  for a new customer, then `POST /customer/{id}/personal-details`. Unsaved typing is a per-customer sessionStorage
  draft (`OnboardingFormStateService`), cleared after a successful save.
- Financials/goals POST **replaces** the customer's set (BE b9438eb): rows with an id are updated, rows without one
  inserted, rows left out deleted; an unknown or foreign id gives 400 and nothing is written. Always send the full
  list. An empty array is unsupported (the steps always send at least one row). The BE ignores a type change on an
  update, so a saved row whose type changed is sent without its id (`savedTypeName` / `savedGoalTypeName`).
  Unknown customer ids return 404 OBJECT_NOT_FOUND (BE da77c50). No per-step drafts on the BE except MiFID.
- The generated clients in `src/app/api` are not committed and can lag the spec: regenerate after pulling spec changes
  (`npm run openapi:gen:<x>`) before concluding a field is missing.
- Step flags are stored per browser (`wm.onboarding.progress`), not per customer: `syncFromBackend(active.steps)`
  rebuilds them, and runs on customer open and after a full reload (guard). Otherwise stale flags show as completed.
- Goals: `core/services/goals-form.ts` (`toCustomerGoals`). MiFID: `core/services/mifid-questionnaire.service.ts`
  (config load, answers, draft id per customer in localStorage, `toMifidFilling`, submit → `customerRiskProfile`).
  Risk bands and profile codes come from the questionnaire config. Never hard-code them.
- Public routes `/onboarding/start` and `/onboarding/setup-password` are top-level (no shell). `/auth/set-password` is
  client-rendered and redirects with a function that keeps `?token` (a prerendered redirect drops query params, and a
  relative `redirectTo` is resolved against `/auth/` on the SSR server).
- MiFID flow (agreed with the BE, 2026-10-28): POST `/mifid/save` creates the filling. Status is **server-derived**
  (COMPLETED once every question is answered); never send it. PATCH `/mifid/filling/{id}` edits a DRAFT (send response
  `id`s to update rather than add). POST `/mifid/submit` only when COMPLETED (else 409 INVALID_STATE_TRANSITION).
- Onboarded customers see their MiFID read-only at `/app/investor-profile` (`GET /customer/{id}/mifid/current`, the
  latest SUBMITTED filling; 404 = none), never the onboarding step. A MiFID update (`/app/investor-profile/update`)
  is a **new filling** that supersedes the old one (ESMA suitability guidelines: keep client info current and
  recorded), never an in-place edit. It is pre-filled client-side from the submitted answers that still fit the
  current questionnaire (`prefillAnswers`, no response ids), so the first save POSTs a new filling. The BE (2026-10-30)
  deprecates the previous SUBMITTED filling on submit and skips the onboarding step and AML event for ACTIVE customers.
- MiFID storage: POST `/mifid/save` always creates a new filling; PATCH works on DRAFT **and** COMPLETED (status
  recalculated each time); SUBMITTED/DEPRECATED give 409. A PATCH can't clear an answer (answer_option_id NOT NULL),
  so always send an answerOption per response. `GET /mifid/{fillingId}` returns exactly that filling.
  Question rendering is shared: `shared/components/mifid-section`.
- `exitOnboarding()` sends an ACTIVE customer's steps (opened from the dashboard) back to `/app/home` and keeps the
  client selected; only customers still onboarding leave the client (advisor) or go to the profile list (customer).
- BE fixes pending a customer-service restart: Gender `NOT_SPECIFIED` accepted again; goal `targetDate` nullable;
  MiFID PATCH orphan-removal 500. CustomerType: INDIVIDUAL, LEGAL_ENTITY, SOLE_PROPRIETOR, JOINT_ACCOUNT, OTHER.
  CustomerStatus adds CLOSED and DELETED. Invalid bodies return 400 REQUEST_VALIDATION_ERROR.

### Dashboards (Phase 3)
- Data: `core/services/portfolio-data.ts` defines `PortfolioDataSource` + the `PORTFOLIO_DATA` token. The BE has no
  portfolio/market services yet, so the token defaults to `MockPortfolioDataService` (deterministic per customer id,
  `isSample`). Swap the token's provider for a BE-backed implementation later; the pages don't change.
- **Sample-data rule:** every card fed by the mock shows `<app-sample-badge/>`. Real customer data (goals, financials,
  risk profile, client list) never carries it. Pure helpers live in `core/services/dashboard-stats.ts`.
- **Coming-soon cards:** a planned home card with no BE endpoint yet (corporate actions, communications, latest news)
  shows `<app-coming-soon-badge/>`, a dashed border and a one-line description, with **no data** (not even sample).
  The canvas (`project/CHANGELOG.md`, note `nHome`) holds their target layout and API.
- The design canvas follows the built FE for anything that exists (names, routes, cards). When it drifts, update the
  canvas, not the code, unless we decide otherwise.
- Charts: `lightweight-charts` 5 (v5 API `chart.addSeries(AreaSeries, …)`), wrapped in
  `shared/components/dashboard/value-chart`. Canvas colours are read from `--wmp-*` tokens at runtime and re-applied
  on theme change. Keep the TradingView attribution logo (license). The locale is fixed to `en-GB`.
- Categorical series use `--wmp-chart-1..4` **in a stable entity order** (colour follows the entity, never its rank),
  validated with the dataviz palette checker. Re-run it if the colours change.
- `CustomerSelectionService.open(id)` is the single way to switch the working customer (it resumes onboarding for
  DRAFT customers). Used by customer selection and the advisor workspace.
- Onboarding lifecycle (BE, 2026-10-28): MiFID submit sets PENDING_VERIFICATION, then an async AML check (Kafka) sets ACTIVE
  (onboarding DONE) or REJECTED (FAILED). There is no "finish" call and no push channel
  (BE notification-service is an empty skeleton): `VerificationWatcherService` polls GET /customer/{id} in the
  background (1.5 s, then 5 s after 20 s, then 30 s after 2 min; gives up after 30 min) for as long as the app is open,
  resumes for a selected PENDING_VERIFICATION customer, and reports the outcome as toast + notification. The risk
  step reads its state from it; a REJECTED onboarding can't be finished (Exit instead). `riskProfile.profile` is the configured **label**, so match bands with `findBand` / `profileDisplay`
  (code or label). `onboarding/active` returns ordered steps (DONE/REJECTED).
- Unbuilt sections (investments, markets, account sub-pages, advisor clients/reviews/proposals/orders) use the shared
  work-in-progress page (`wip()` in app.routes.ts). **No sample data there.** Their concepts and data/API needs live
  in the design canvas row "Future sections": https://claude.ai/artifact/RAG8XaL8fkESVMKvt1F2AA

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
- Loading feedback: `<app-loading-bar>` (in `app.html`) shows a top bar while a navigation is pending or a foreground
  request is in flight (`LoadingIndicatorService` + `loadingInterceptor`, 150 ms show delay, 300 ms minimum).
  Polling and other background calls must pass `HttpContext` with `BACKGROUND_REQUEST`, or the bar never hides.
  CTAs that start async work use `busyAction()` (`core/services/busy-action.ts`): `[loading]="x.pending()"`.
  It also blocks double submits. Don't add `loading = signal(false)` with try/finally by hand.
- Header dropdowns (notification bell): render the panel inside the header element, not with `p-popover`. Popover
  positions in page coordinates and only closes on scroll of scrollable parents, so under the sticky header it
  detaches when the page scrolls. Overlay badges in the header use `.wmp-header-badge` (`_ui.scss`) to stay in view.
- Finishing an onboarding as an advisor exits the client (`exitClient()` → `/app/advisor`): advisors pick clients
  themselves and never stay "acting as" the customer they just onboarded.
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
Commit messages and PRs carry no AI attribution: no `Co-Authored-By` trailers and no mention of Claude or AI tools.
