import {Component, inject} from '@angular/core';
import {toSignal} from '@angular/core/rxjs-interop';
import {ActivatedRoute, RouterLink} from '@angular/router';
import {Observable} from 'rxjs';
import {ButtonDirective, ButtonLabel} from 'primeng/button';
import {WorkspaceContextService} from '../../core/services/workspace-context.service';

interface PlaceholderData {
  title?: string;
  description?: string;
  action?: { label: string; path: string };
}

/**
 * Work-in-progress page for sections that aren't built yet (no sample data on purpose).
 * Configured through route data: { title, description, action? }.
 */
@Component({
  selector: 'app-page-placeholder',
  imports: [RouterLink, ButtonDirective, ButtonLabel],
  template: `
    <section class="page">
      <header>
        <p class="eyebrow num">WORK IN PROGRESS</p>
        <h1>{{ data()?.title }}</h1>
      </header>
      <div class="wip" role="status">
        <span class="material-symbols-outlined" aria-hidden="true">construction</span>
        <div class="wip__text">
          <h2>This section is being built</h2>
          @if (data()?.description) { <p>{{ data()?.description }}</p> }
          <p class="muted">It will be available in a future release.</p>
        </div>
        <div class="wip__actions">
          @if (data()?.action; as action) {
            <a pButton [routerLink]="action.path"><span pButtonLabel>{{ action.label }}</span></a>
          }
          <a pButton [routerLink]="workspace.homePath()" severity="secondary" [outlined]="true"><span pButtonLabel>Back to home</span></a>
        </div>
      </div>
    </section>
  `,
  styles: [`
    .page { padding: 1.5rem; display: grid; gap: 1rem; max-width: 1200px; }
    .eyebrow { margin: 0; font-size: .7rem; letter-spacing: .1em; color: var(--wmp-warning); }
    h1 { margin: .25rem 0 0; font-size: 1.6rem; font-weight: 600; }
    .wip {
      display: grid; grid-template-columns: auto 1fr; gap: 1rem 1.25rem; align-items: start; padding: 1.5rem;
      background: var(--wmp-surface); border: 1px dashed var(--wmp-border); border-radius: var(--wmp-radius-lg);
    }
    .wip > .material-symbols-outlined { font-size: 32px; color: var(--wmp-warning); }
    .wip__text h2 { margin: 0; font-size: 1.05rem; font-weight: 600; }
    .wip__text p { margin: .4rem 0 0; max-width: 40rem; line-height: 1.55; }
    .muted { color: var(--wmp-text-muted); font-size: .9rem; }
    .wip__actions { grid-column: 2; display: flex; gap: .75rem; flex-wrap: wrap; }
    @media (max-width: 479.98px) {
      .wip { grid-template-columns: 1fr; }
      .wip__actions { grid-column: 1; }
    }
  `]
})
export class PagePlaceholderComponent {
  protected readonly data = toSignal(inject(ActivatedRoute).data as Observable<PlaceholderData>);
  protected readonly workspace = inject(WorkspaceContextService);
}
