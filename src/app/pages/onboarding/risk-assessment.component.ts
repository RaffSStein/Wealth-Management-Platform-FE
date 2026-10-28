import {Component, computed, inject, signal} from '@angular/core';
import {Router} from '@angular/router';
import {firstValueFrom} from 'rxjs';
import {Button} from 'primeng/button';
import {Message} from 'primeng/message';
import {CustomerRiskProfileDTO, CustomerService, MifidQuestionnaireConfigDTO, MifidService} from '../../api/customer-service';
import {OnboardingProgressService, OnboardingStep} from '../../core/services/onboarding-progress.service';
import {CustomerSessionService} from '../../core/services/customer-session.service';
import {MifidQuestionnaireService, riskBands} from '../../core/services/mifid-questionnaire.service';
import {WorkspaceContextService} from '../../core/services/workspace-context.service';
import {OnboardingLayoutComponent} from '../../shared/components/onboarding-layout/onboarding-layout.component';

interface BandView {
  code: string;
  label: string;
  range: string;
  width: number; // % of the full scale
  active: boolean;
}

@Component({
  selector: 'app-onboarding-risk-assessment',
  imports: [OnboardingLayoutComponent, Button, Message],
  template: `
    <app-onboarding-layout [step]="step" title="Risk assessment"
                           subtitle="Your investor profile, calculated from the MiFID questionnaire. It determines which investments can be recommended to you.">
      @if (loading()) {
        <p class="muted">Loading your profile…</p>
      } @else if (profile(); as p) {
        <section class="wmp-panel result">
          <p class="result__eyebrow num">INVESTOR PROFILE</p>
          <h2 class="result__label">{{ profileLabel() }}</h2>
          @if (p.score != null) {
            <p class="result__score">Score <span class="num">{{ p.score }}</span>
              @if (scaleMax()) { <span class="muted">&nbsp;of {{ scaleMax() }}</span> }
            </p>
          }

          @if (bands().length) {
            <div class="scale" role="img" [attr.aria-label]="'Profile ' + profileLabel() + ', score ' + p.score">
              <div class="scale__bands">
                @for (b of bands(); track b.code) {
                  <span class="scale__band" [class.is-active]="b.active" [style.width.%]="b.width"></span>
                }
              </div>
              @if (markerPercent() !== null) {
                <span class="scale__marker" [style.left.%]="markerPercent()"></span>
              }
            </div>
            <ul class="legend">
              @for (b of bands(); track b.code) {
                <li [class.is-active]="b.active"><span class="legend__label">{{ b.label }}</span><span class="num legend__range">{{ b.range }}</span></li>
              }
            </ul>
          } @else {
            <p class="muted">Profile bands are not available right now.</p>
          }
        </section>

        <p class="note">Your advisor reviews this profile with you. You can retake the questionnaire if your situation changes.</p>
      } @else {
        <p-message severity="info">No investor profile yet. Complete the MiFID questionnaire to calculate it.</p-message>
      }

      <div actions class="wmp-actions">
        <p-button label="Back to questionnaire" severity="secondary" [outlined]="true" (onClick)="back()"/>
        <div class="wmp-actions__end">
          <p-button label="Finish onboarding" [disabled]="!profile()" (onClick)="finish()"/>
        </div>
      </div>
    </app-onboarding-layout>
  `,
  styles: [`
    .muted { color: var(--wmp-text-muted); }
    .result { gap: .75rem; }
    .result__eyebrow { margin: 0; font-size: .75rem; letter-spacing: .08em; color: var(--wmp-text-muted); }
    .result__label { margin: 0; font-size: 2rem; font-weight: 600; color: var(--wmp-primary); }
    .result__score { margin: 0; font-size: 1rem; }
    .scale { position: relative; margin: 1rem 0 .25rem; }
    .scale__bands { display: flex; gap: 2px; height: 10px; border-radius: 5px; overflow: hidden; }
    .scale__band { background: var(--wmp-surface-raised); }
    .scale__band.is-active { background: var(--wmp-primary); }
    .scale__marker {
      position: absolute; top: -5px; width: 4px; height: 20px; margin-left: -2px; border-radius: 2px;
      background: var(--wmp-text); box-shadow: 0 0 0 2px var(--wmp-surface);
    }
    .legend { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: .5rem; }
    .legend li { display: grid; gap: .1rem; padding: .5rem .65rem; border: 1px solid var(--wmp-border); border-radius: var(--wmp-radius-md); font-size: .8rem; color: var(--wmp-text-muted); }
    .legend li.is-active { border-color: var(--wmp-primary); color: var(--wmp-text); background: var(--wmp-primary-soft); }
    .legend__label { font-weight: 500; }
    .note { margin: 1rem 0 0; color: var(--wmp-text-muted); font-size: .9rem; }
  `]
})
export class RiskAssessmentComponent {
  protected readonly step = OnboardingStep.RiskAssessment;
  private readonly progress = inject(OnboardingProgressService);
  private readonly router = inject(Router);
  private readonly mifid = inject(MifidQuestionnaireService);
  private readonly mifidApi = inject(MifidService);
  private readonly customerApi = inject(CustomerService);
  private readonly customerSession = inject(CustomerSessionService);
  private readonly workspace = inject(WorkspaceContextService);

  protected readonly loading = signal(true);
  protected readonly profile = signal<CustomerRiskProfileDTO | null>(this.mifid.result());
  private readonly config = signal<MifidQuestionnaireConfigDTO | null>(this.mifid.config());

  private readonly sortedBands = computed(() => riskBands(this.config()));
  protected readonly scaleMax = computed(() => {
    const bands = this.sortedBands();
    return bands.length ? bands[bands.length - 1].maxScore ?? null : null;
  });

  private readonly activeBand = computed(() => {
    const p = this.profile();
    const bands = this.sortedBands();
    return bands.find(b => b.profileCode === p?.profile)
      ?? bands.find(b => p?.score != null && p.score >= (b.minScore ?? 0) && p.score <= (b.maxScore ?? 0));
  });

  /** BE label when the profile matches a configured band; otherwise a readable version of the raw code. */
  protected readonly profileLabel = computed(() => {
    const band = this.activeBand();
    if (band?.profileLabel) return band.profileLabel;
    const code = this.profile()?.profile ?? '';
    if (!code || code.toUpperCase() === 'UNDEFINED') return 'Pending review';
    return code.charAt(0) + code.slice(1).toLowerCase().replace(/_/g, ' ');
  });

  protected readonly bands = computed<BandView[]>(() => {
    const bands = this.sortedBands();
    const min = bands[0]?.minScore ?? 0;
    const span = Math.max(1, (this.scaleMax() ?? 0) - min);
    const active = this.activeBand();
    return bands.map(b => ({
      code: b.profileCode ?? '',
      label: b.profileLabel ?? b.profileCode ?? '',
      range: `${b.minScore}–${b.maxScore}`,
      width: (((b.maxScore ?? 0) - (b.minScore ?? 0)) / span) * 100,
      active: b === active
    }));
  });

  protected readonly markerPercent = computed(() => {
    const score = this.profile()?.score;
    const bands = this.sortedBands();
    if (score == null || !bands.length) return null;
    const min = bands[0].minScore ?? 0;
    const span = Math.max(1, (this.scaleMax() ?? 0) - min);
    return Math.min(100, Math.max(0, ((score - min) / span) * 100));
  });

  constructor() {
    void this.load();
  }

  private async load(): Promise<void> {
    try {
      if (!this.config()) {
        this.config.set(await firstValueFrom(this.mifidApi.getLatestValidMifidQuestionnaireConfig()));
      }
    } catch {
      // bands are optional: the profile is still shown
    }
    const customerId = this.customerSession.customer()?.id;
    if (!this.profile() && customerId) {
      try {
        const customer = await firstValueFrom(this.customerApi.getCustomerById(customerId));
        this.profile.set(customer?.riskProfile ?? null);
      } catch {
        // falls through to the empty state
      }
    }
    this.loading.set(false);
  }

  protected back(): void {
    void this.router.navigateByUrl(this.progress.pathFor(OnboardingStep.MifidQuestionnaire));
  }

  protected async finish(): Promise<void> {
    this.progress.completeStep(this.step);
    await this.router.navigateByUrl(this.workspace.homePath());
  }
}
