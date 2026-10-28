import {Component, computed, inject} from '@angular/core';
import {RouterLink} from '@angular/router';
import {ButtonDirective, ButtonLabel} from 'primeng/button';
import {UserSessionService} from '../../core/services/user-session.service';

interface WorkspaceKpi {
  label: string;
  icon: string;
  path: string;
}

/**
 * Advisor workspace overview (/app/advisor).
 * KPIs show "—" until advisor-service exposes the data: no placeholder numbers.
 */
@Component({
  selector: 'app-advisor-home',
  imports: [RouterLink, ButtonDirective, ButtonLabel],
  template: `
    <section class="page">
      <header class="page__head">
        <div>
          <p class="muted">Advisor workspace</p>
          <h1>{{ greeting() }}</h1>
        </div>
        <a pButton routerLink="/onboarding/disambiguation"><span pButtonLabel>Select a client</span></a>
      </header>

      <div class="kpis">
        @for (k of kpis; track k.label) {
          <a class="kpi" [routerLink]="k.path">
            <span class="kpi__label">
              <span class="material-symbols-outlined" aria-hidden="true">{{ k.icon }}</span>{{ k.label }}
            </span>
            <span class="kpi__value num" aria-label="Not available yet">—</span>
          </a>
        }
      </div>

      <div class="empty">
        <span class="material-symbols-outlined" aria-hidden="true">insights</span>
        <p>Client book, AUM and review deadlines will appear here once the advisor services are available.</p>
      </div>
    </section>
  `,
  styles: [`
    .page { padding: 1.5rem; display: grid; gap: 1.25rem; max-width: 1200px; }
    .page__head { display: flex; justify-content: space-between; align-items: flex-end; gap: 1rem; flex-wrap: wrap; }
    h1 { margin: .15rem 0 0; font-size: 1.6rem; font-weight: 600; }
    .muted { margin: 0; color: var(--wmp-text-muted); font-size: .85rem; }
    .kpis {
      display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1px;
      background: var(--wmp-border); border: 1px solid var(--wmp-border); border-radius: var(--wmp-radius-lg); overflow: hidden;
    }
    .kpi { background: var(--wmp-surface); padding: 1rem 1.25rem; display: grid; gap: .4rem; color: var(--wmp-text); text-decoration: none; }
    .kpi:hover { background: var(--wmp-surface-raised); text-decoration: none; }
    .kpi__label { display: flex; align-items: center; gap: .4rem; font-size: .8rem; color: var(--wmp-text-muted); }
    .kpi__label .material-symbols-outlined { font-size: 18px; }
    .kpi__value { font-size: 1.6rem; font-weight: 500; }
    .empty {
      display: grid; justify-items: center; gap: .75rem; padding: 3rem 1.5rem; text-align: center;
      background: var(--wmp-surface); border: 1px dashed var(--wmp-border); border-radius: var(--wmp-radius-lg);
      color: var(--wmp-text-muted);
    }
    .empty p { margin: 0; max-width: 32rem; }
    .empty .material-symbols-outlined { font-size: 32px; }
  `]
})
export class AdvisorHomeComponent {
  private readonly userSession = inject(UserSessionService);

  protected readonly greeting = computed(() => {
    const first = this.userSession.profile()?.firstName;
    return first ? `Hello, ${first}` : 'Hello';
  });

  protected readonly kpis: WorkspaceKpi[] = [
    {label: 'Clients', icon: 'groups', path: '/app/advisor/clients'},
    {label: 'Assets under management', icon: 'account_balance_wallet', path: '/app/advisor/clients'},
    {label: 'MiFID reviews due', icon: 'fact_check', path: '/app/advisor/reviews'},
    {label: 'Open proposals', icon: 'request_quote', path: '/app/advisor/proposals'}
  ];
}
