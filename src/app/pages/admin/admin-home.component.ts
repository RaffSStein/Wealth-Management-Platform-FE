import {Component, computed, inject, signal} from '@angular/core';
import {RouterLink} from '@angular/router';
import {firstValueFrom} from 'rxjs';
import {ButtonDirective, ButtonLabel} from 'primeng/button';
import {Skeleton} from 'primeng/skeleton';
import {RoleAssignmentService} from '../../api/profiler-service';
import {UserSessionService} from '../../core/services/user-session.service';

/**
 * Admin area overview (/app/admin) for bank and platform admins. They manage access, not customers: a platform
 * admin sees no bank data at all (its tenant is the PLATFORM pseudo bank).
 */
@Component({
  selector: 'app-admin-home',
  imports: [RouterLink, ButtonDirective, ButtonLabel, Skeleton],
  template: `
    <section class="page">
      <header class="head">
        <div>
          <p class="muted">Administration</p>
          <h1>{{ greeting() }}</h1>
          <p class="muted">{{ scope() }}</p>
        </div>
      </header>

      <section class="kpis" aria-label="Access summary">
        <a class="kpi" routerLink="/app/admin/approvals">
          <span class="kpi__label">Waiting for approval</span>
          @if (pendingCount() === undefined) {
            <p-skeleton width="3rem" height="1.8rem"/>
          } @else {
            <span class="kpi__value num">{{ pendingCount() ?? '—' }}</span>
          }
        </a>
      </section>

      <div class="row">
        <section class="card">
          <header class="card__head"><h2>Approvals</h2></header>
          <p class="muted">{{ approvalsText() }} The request needs a second admin: you can't approve your own requests or
            your own role.</p>
          <a pButton routerLink="/app/admin/approvals" [outlined]="true" class="cta"><span pButtonLabel>Open approvals</span></a>
        </section>
        <section class="card">
          <header class="card__head"><h2>Role assignments</h2></header>
          <p class="muted">Giving and removing roles will be available here soon. Revoking a role signs the person
            out everywhere at once.</p>
        </section>
      </div>
    </section>
  `,
  styles: [`
    .page { padding: 1.5rem; display: grid; gap: 1rem; max-width: 1440px; }
    .head { display: flex; justify-content: space-between; align-items: flex-end; gap: 1rem; flex-wrap: wrap; }
    h1 { margin: .15rem 0 .25rem; font-size: 1.6rem; font-weight: 600; }
    .muted { margin: 0; color: var(--wmp-text-muted); font-size: .85rem; line-height: 1.5; }
    .kpis {
      display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 240px)); gap: 1px;
      background: var(--wmp-border); border: 1px solid var(--wmp-border); border-radius: var(--wmp-radius-lg);
      overflow: hidden; justify-self: start;
    }
    .kpi { background: var(--wmp-surface); padding: 1rem 1.25rem; display: grid; gap: .35rem; color: var(--wmp-text); text-decoration: none; }
    a.kpi:hover { background: var(--wmp-surface-raised); text-decoration: none; }
    .kpi__label { font-size: .8rem; color: var(--wmp-text-muted); }
    .kpi__value { font-size: 1.5rem; font-weight: 500; }
    .row { display: flex; flex-wrap: wrap; gap: 1rem; }
    .card {
      flex: 1 1 300px; min-width: 0; background: var(--wmp-surface); border: 1px solid var(--wmp-border);
      border-radius: var(--wmp-radius-lg); padding: 1rem 1.25rem; display: grid; gap: .75rem; align-content: start;
    }
    .card__head h2 { margin: 0; font-size: .95rem; font-weight: 600; }
    .cta { justify-self: start; }
  `]
})
export class AdminHomeComponent {
  private readonly api = inject(RoleAssignmentService);
  private readonly userSession = inject(UserSessionService);

  /** undefined while loading, null when it couldn't be loaded. */
  protected readonly pendingCount = signal<number | null | undefined>(undefined);

  protected readonly greeting = computed(() => {
    const first = this.userSession.profile()?.firstName;
    return first ? `Hello, ${first}` : 'Hello';
  });
  protected readonly scope = computed(() => this.userSession.isPlatformAdmin()
    ? 'Platform admin: you create and approve bank admins for every bank.'
    : `Bank admin of ${this.userSession.activeBranch()?.bankCode ?? 'your bank'}: you manage advisors and customers of its branches.`);
  protected readonly approvalsText = computed(() => this.userSession.isPlatformAdmin()
    ? 'Bank admin requests from the other platform admins wait here.'
    : 'Advisor requests from the other admins of your bank wait here.');

  constructor() {
    void this.load();
  }

  private async load(): Promise<void> {
    try {
      const pending = await firstValueFrom(this.api.listRoleAssignmentRequests('PENDING'));
      this.pendingCount.set(pending?.length ?? 0);
    } catch {
      this.pendingCount.set(null);
    }
  }
}
