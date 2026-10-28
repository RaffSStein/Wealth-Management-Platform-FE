import {Component, inject} from '@angular/core';
import {Button} from 'primeng/button';
import {WorkspaceContextService} from '../core/services/workspace-context.service';

/**
 * Shown to advisors while they operate on behalf of a client; makes the context explicit and reversible.
 */
@Component({
  selector: 'app-acting-as-banner',
  imports: [Button],
  template: `
    <div class="banner" role="status">
      <span class="material-symbols-outlined" aria-hidden="true">supervisor_account</span>
      <span class="banner__text">
        Acting as <strong>{{ workspace.clientName() }}</strong>
        @if (workspace.clientId()) { <span class="num banner__id">{{ workspace.clientId() }}</span> }
      </span>
      <p-button label="Exit client" size="small" [outlined]="true" (onClick)="workspace.exitClient()"/>
    </div>
  `,
  styles: [`
    .banner {
      display: flex; align-items: center; gap: .75rem; flex-wrap: wrap; padding: .5rem 1.25rem;
      background: var(--wmp-primary-soft); border-bottom: 1px solid var(--wmp-border); color: var(--wmp-text); font-size: .9rem;
    }
    .material-symbols-outlined { color: var(--wmp-primary); font-size: 20px; }
    .banner__text { flex: 1; min-width: 0; }
    .banner__id { margin-left: .5rem; font-size: .8rem; color: var(--wmp-text-muted); }
  `]
})
export class ActingAsBannerComponent {
  protected readonly workspace = inject(WorkspaceContextService);
}
