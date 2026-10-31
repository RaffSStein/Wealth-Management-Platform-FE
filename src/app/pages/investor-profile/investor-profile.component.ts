import {Component, computed, inject, signal} from '@angular/core';
import {RouterLink} from '@angular/router';
import {firstValueFrom} from 'rxjs';
import {ButtonDirective, ButtonLabel} from 'primeng/button';
import {Message} from 'primeng/message';
import {Skeleton} from 'primeng/skeleton';
import {MifidFillingDTO, MifidQuestionnaireConfigDTO, MifidService} from '../../api/customer-service';
import {CustomerSessionService} from '../../core/services/customer-session.service';
import {PermissionStore} from '../../core/services/permission-store.service';
import {
  answeredSections, findBand, loadSubmittedFilling, MifidQuestionnaireService, profileDisplay
} from '../../core/services/mifid-questionnaire.service';

type State = 'loading' | 'ready' | 'none' | 'error';

/**
 * Investor profile: the customer's submitted MiFID questionnaire, read-only (profile, score, answers).
 * Updating it creates a new filling that supersedes this one (InvestorProfileUpdateComponent).
 */
@Component({
  selector: 'app-investor-profile',
  imports: [RouterLink, ButtonDirective, ButtonLabel, Message, Skeleton],
  template: `
    <div class="page">
      <header class="head">
        <h1>Investor profile</h1>
        <p class="muted">The MiFID II suitability profile from the last submitted questionnaire.</p>
      </header>

      @switch (state()) {
        @case ('loading') {
          <p-skeleton height="140px"/>
          <p-skeleton height="240px"/>
        }
        @case ('error') {
          <p-message severity="error">The investor profile could not be loaded. Reload the page to try again.</p-message>
        }
        @case ('none') {
          <section class="card">
            <p class="muted">No submitted MiFID questionnaire yet.</p>
            <a routerLink="/onboarding/mifid-questionnaire" class="link">Complete the MiFID questionnaire →</a>
          </section>
        }
        @case ('ready') {
          <section class="card summary" aria-label="Profile summary">
            <div class="summary__main">
              <p class="summary__label">{{ profileLabel() || 'Not determined' }}</p>
              <dl class="facts">
                @if (score() != null) { <div><dt>MiFID score</dt><dd class="num">{{ score() }}</dd></div> }
                @if (band(); as b) { <div><dt>Profile range</dt><dd class="num">{{ b.minScore }}–{{ b.maxScore }}</dd></div> }
                @if (submittedOn()) { <div><dt>Submitted</dt><dd class="num">{{ submittedOn() }}</dd></div> }
              </dl>
            </div>
            @if (onboarded() && canUpdate()) {
              <div class="summary__action">
                <a pButton routerLink="/app/investor-profile/update" severity="secondary" [outlined]="true">
                  <span pButtonLabel>{{ hasDraft() ? 'Continue update' : 'Update questionnaire' }}</span>
                </a>
                @if (hasDraft()) { <span class="note">An update is in progress. The profile below stays in force until it is submitted.</span> }
              </div>
            }
          </section>

          @for (s of sections(); track $index) {
            <section class="card">
              <h2>{{ s.title }}</h2>
              <ol class="answers">
                @for (q of s.questions; track $index) {
                  <li>
                    <span class="answers__q">{{ q.question }}</span>
                    <span class="answers__a" [class.muted]="q.answer == null">{{ q.answer ?? 'Not answered' }}</span>
                  </li>
                }
              </ol>
            </section>
          }
        }
      }
    </div>
  `,
  styles: [`
    :host { display: block; }
    .page { padding: 1.5rem; display: grid; gap: 1rem; max-width: 960px; }
    .head h1 { margin: 0; font-size: 1.6rem; font-weight: 600; }
    .head p { margin: .35rem 0 0; }
    .muted { margin: 0; color: var(--wmp-text-muted); font-size: .9rem; }
    .link { font-size: .85rem; }
    .card {
      background: var(--wmp-surface); border: 1px solid var(--wmp-border); border-radius: var(--wmp-radius-lg);
      padding: 1rem 1.25rem; display: grid; gap: .75rem;
    }
    .card h2 { margin: 0; font-size: .95rem; font-weight: 600; }
    .summary { grid-template-columns: 1fr auto; align-items: start; gap: 1rem 2rem; }
    .summary__label { margin: 0; font-size: 1.4rem; font-weight: 600; color: var(--wmp-primary); }
    .facts { margin: .6rem 0 0; display: flex; flex-wrap: wrap; gap: .5rem 2rem; }
    .facts div { display: grid; gap: .15rem; }
    .facts dt { font-size: .8rem; color: var(--wmp-text-muted); }
    .facts dd { margin: 0; }
    .summary__action { display: grid; gap: .5rem; justify-items: end; max-width: 18rem; }
    .note { font-size: .8rem; color: var(--wmp-text-muted); text-align: right; line-height: 1.45; }
    .answers { list-style: none; margin: 0; padding: 0; display: grid; }
    .answers li {
      display: grid; grid-template-columns: minmax(0, 3fr) minmax(0, 2fr); gap: 1rem; padding: .65rem 0;
      border-top: 1px solid var(--wmp-border); font-size: .9rem; line-height: 1.45;
    }
    .answers li:first-child { border-top: 0; }
    .answers__q { color: var(--wmp-text-muted); }
    .answers__a { font-weight: 500; }
    @media (max-width: 599.98px) {
      .page { padding: 1rem; }
      .summary { grid-template-columns: 1fr; }
      .summary__action { justify-items: start; }
      .note { text-align: left; }
      .answers li { grid-template-columns: 1fr; gap: .25rem; }
    }
  `]
})
export class InvestorProfileComponent {
  private readonly mifidApi = inject(MifidService);
  private readonly customerSession = inject(CustomerSessionService);
  private readonly permissions = inject(PermissionStore);
  /** Updating the questionnaire needs EDIT on the investor profile (BE permission catalogue). */
  protected readonly canUpdate = computed(() => this.permissions.can('ACCOUNT', 'INVESTOR_PROFILE', 'EDIT'));

  private readonly mifid = inject(MifidQuestionnaireService);

  protected readonly state = signal<State>('loading');
  protected readonly onboarded = computed(() => this.customerSession.customer()?.customerStatus === 'ACTIVE');
  protected readonly hasDraft = computed(() => {
    const id = this.customerSession.customer()?.id;
    return !!id && this.mifid.hasDraft(id);
  });
  private readonly filling = signal<MifidFillingDTO | null>(null);
  private readonly config = signal<MifidQuestionnaireConfigDTO | null>(null);

  /** The filling's profile; the customer's stored one as a fallback (same values, kept on both by the BE). */
  private readonly riskProfile = computed(() =>
    this.filling()?.customerRiskProfile ?? this.customerSession.customer()?.riskProfile ?? null);
  protected readonly profileLabel = computed(() => profileDisplay(this.config(), this.riskProfile()?.profile));
  protected readonly score = computed(() => this.riskProfile()?.score ?? null);
  protected readonly band = computed(() => findBand(this.config(), this.riskProfile()?.profile));
  protected readonly submittedOn = computed(() => {
    const date = this.filling()?.fillingDate;
    return date ? new Date(`${date}T00:00:00`).toLocaleDateString('en-GB', {day: 'numeric', month: 'long', year: 'numeric'}) : '';
  });
  protected readonly sections = computed(() => {
    const filling = this.filling();
    return filling ? answeredSections(this.config(), filling) : [];
  });

  constructor() {
    void this.load();
  }

  private async load(): Promise<void> {
    const customerId = this.customerSession.customer()?.id;
    if (!customerId) {
      this.state.set('error');
      return;
    }
    try {
      const [filling, config] = await Promise.all([
        loadSubmittedFilling(this.mifidApi, customerId),
        // Labels and bands only: without the config the page falls back to the raw profile and a flat answer list
        firstValueFrom(this.mifidApi.getLatestValidMifidQuestionnaireConfig()).catch(() => null)
      ]);
      this.config.set(config);
      this.filling.set(filling);
      this.state.set(filling ? 'ready' : 'none');
    } catch {
      this.state.set('error');
    }
  }
}
