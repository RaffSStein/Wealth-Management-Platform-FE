# Guidelines for GitHub Copilot (Repo: Wealth-Management-Platform-FE)

These guidelines help Copilot generate suggestions consistent with this project.

## Context and stack
- Framework: Angular 20 (standalone components, signals, inject).
- Routing: lazy `loadComponent`, routes defined in `src/app/app.routes.ts`.
- HTTP: `provideHttpClient(withFetch(), withInterceptors([authInterceptor]))` in `app.config.ts`.
- API: OpenAPI-generated clients under `src/app/api/*-service`, configured via `provideApi('/<service-name>')`.
- Session state: `AuthService` (token in `sessionStorage`), `UserSessionService` (user profile), `ToastService` (notifications). Toast host in `app/app.html`.
- Styles: SCSS with variables and partials in `src/styles` and `src/app/styles`.
- SSR present: avoid direct DOM access in constructors; use `isPlatformBrowser` when needed.

## Language policy (important)
- Always write code, identifiers (class/function/variable names), comments, and inline developer-facing documentation in English, regardless of the user prompt language.
- End-user UI copy/messages should follow product requirements; if unspecified, default to Italian. However, keep code and comments strictly in English.

## Project conventions
- Prefer standalone components with local `imports`; avoid NgModules.
- Use Signals for local UI state; use RxJS mainly for HTTP/service calls.
- Avoid nested `subscribe` in components; for one-shot flows prefer `firstValueFrom` with `async/await`.
- Keep routing paths consistent with existing ones (e.g., `/auth/*`, `/app/*`, `/onboarding/*`).
- Authentication:
  - Attach Bearer token via `authInterceptor` (do not manually set headers per call).
  - Save token with `AuthService.setToken()` then load the profile with `UserSessionService.ensureLoaded(true)`.
- UI/UX:
  - Reuse shared components (e.g., `PasswordStrengthFieldComponent`).
  - Use `ToastService` for user feedback.
  - Use global color tokens/variables defined in the styles (CSS variables like `--color-primary`, `--color-text`, etc., and SCSS variables in `src/styles/_variables.scss`); avoid hardcoded hex/rgb values.
- Code style:
  - Keep imports minimal and ordered; avoid dead code and leftover TODOs.
  - Avoid large-scale reformatting; follow the existing style.

## OpenAPI client integration
- Import from service barrels: `import { AuthService as ApiAuthService } from 'src/app/api/user-service';`.
- Base paths are provided in `app.config.ts` via `provideApi('/user-service')`, etc.
- APIs return typed Observables; in components prefer `firstValueFrom` for one-shot actions.

## Security and privacy
- Do not include PII or secrets in code or logs.
- Do not keep tokens in persistent URLs. If a token is read from query string (e.g., one-time link), remove it immediately from the URL (replaceUrl) after reading.
- Validate inputs client-side (basic) and delegate security-critical checks to the backend.

## Recommended patterns
- One-time link (set password/activation):
  1) Public route (e.g., `/auth/set-password?token=...`).
  2) Read `token` from query params, clean the URL via `replaceUrl`, call backend `validate`.
  3) If valid, show password + confirm form with strength indicator; post `{ token, password }` to backend.
  4) On success: show toast, then redirect to `/auth/sign-in` (or auto-login if backend returns a session).
  5) If token invalid/expired: show message with CTAs (resend email/back to login).
- Login:
  - `ApiAuthService.loginUser(...)` → `AuthService.setToken(...)` → `UserSessionService.ensureLoaded(true)` → `router.navigateByUrl('/app/home')`.
- Forms:
  - Use `ReactiveFormsModule`; provide clear synchronous validators (minLength, uppercase, number, symbol, password match).

## Libraries and practices
- Prefer `async/await` + `firstValueFrom` for one-shot Observables.
- For route guards (onboarding), follow `core/guards/onboarding-step.guard`.
- For notifications, avoid `console.log` in features; use `ToastService`.

## Build & Dev
- Commands (Windows PowerShell):
  - Dev: `npm start`
  - Build: `npm run build`
  - Regenerate OpenAPI clients: `npm run openapi:gen:all`
- Proxy: paths `/user-service`, `/customer-service`, `/document-service`, `/bank-service` are handled by the dev server/proxy.

## What to avoid
- Creating unnecessary NgModules.
- Using `localStorage` for the token (use `sessionStorage` via `AuthService`).
- Adding non-essential dependencies without updating `package.json`.
- Writing non-English code, identifiers, or comments (must be English at all times).

## Relevant folders
- `src/app/pages/*`: pages and feature UI.
- `src/app/core/services/*`: core services (auth, session, notifications, etc.).
- `src/app/api/*-service`: generated OpenAPI clients.
- `src/app/shared/*`: shared components and services.

## Tips for Copilot
- Before proposing changes, check this file and look for similar existing patterns.
- For new features:
  - Add a lazy route in `app.routes.ts`.
  - Create a standalone component with inline template and minimal styles.
  - Create a service when API calls or encapsulated logic are needed; type all methods.
  - Use `ToastService` for user-visible messages.
- Keep answers concise. When generating any code, identifiers, comments, or inline documentation, always use English regardless of the prompt language.
