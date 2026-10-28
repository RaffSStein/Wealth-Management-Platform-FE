import {Component, inject} from '@angular/core';
import {toSignal} from '@angular/core/rxjs-interop';
import {ActivatedRoute, RouterLink} from '@angular/router';
import {Observable} from 'rxjs';
import {ButtonDirective, ButtonLabel} from 'primeng/button';

interface PlaceholderData {
  title?: string;
  description?: string;
  action?: { label: string; path: string };
}

/**
 * Generic "coming soon" page for routes whose feature is not built yet.
 * Configured through route data: { title, description, action? }.
 */
@Component({
  selector: 'app-page-placeholder',
  imports: [RouterLink, ButtonDirective, ButtonLabel],
  template: `
    <section class="page">
      <h1>{{ data()?.title }}</h1>
      <div class="empty">
        <span class="material-symbols-outlined" aria-hidden="true">construction</span>
        <p>{{ data()?.description }}</p>
        @if (data()?.action; as action) {
          <a pButton [routerLink]="action.path" [outlined]="true"><span pButtonLabel>{{ action.label }}</span></a>
        }
      </div>
    </section>
  `,
  styles: [`
    .page { padding: 1.5rem; display: grid; gap: 1rem; max-width: 1200px; }
    h1 { margin: 0; font-size: 1.5rem; font-weight: 600; }
    .empty {
      display: grid; justify-items: center; gap: .75rem; padding: 3rem 1.5rem; text-align: center;
      background: var(--wmp-surface); border: 1px dashed var(--wmp-border); border-radius: var(--wmp-radius-lg);
      color: var(--wmp-text-muted);
    }
    .empty p { margin: 0; max-width: 32rem; }
    .material-symbols-outlined { font-size: 32px; color: var(--wmp-text-muted); }
  `]
})
export class PagePlaceholderComponent {
  protected readonly data = toSignal(inject(ActivatedRoute).data as Observable<PlaceholderData>);
}
