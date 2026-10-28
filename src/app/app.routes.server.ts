import { RenderMode, ServerRoute } from '@angular/ssr';

/**
 * Render-mode policy
 * - Public pages are prerendered (fast first paint, SEO).
 * - Authenticated areas render on the client: they depend on sessionStorage-based session state and guards,
 *   so prerendering them would only produce empty shells. This also avoids a PrimeNG 21 hydration bug where
 *   <p-motion> (stepper/accordion panels) keeps the server-rendered `display: none`.
 */
export const serverRoutes: ServerRoute[] = [
  {path: 'app/**', renderMode: RenderMode.Client},
  {path: 'onboarding/**', renderMode: RenderMode.Client},
  {path: 'dev/**', renderMode: RenderMode.Client},
  {
    path: '**',
    renderMode: RenderMode.Prerender
  }
];
