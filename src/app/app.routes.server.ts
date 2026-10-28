import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  // PrimeNG 21 <p-motion> (stepper/accordion panels) keeps the server-rendered `display: none` after hydration,
  // so pages relying on initially-expanded panels are rendered on the client only.
  {path: 'dev/ui-kit', renderMode: RenderMode.Client},
  {
    path: '**',
    renderMode: RenderMode.Prerender
  }
];
