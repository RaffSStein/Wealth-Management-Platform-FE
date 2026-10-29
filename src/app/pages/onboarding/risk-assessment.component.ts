import {Component, DestroyRef, computed, inject, signal} from '@angular/core';
import {Router} from '@angular/router';
import {HttpContext} from '@angular/common/http';
import {firstValueFrom} from 'rxjs';
import {Button} from 'primeng/button';
import {Message} from 'primeng/message';
import {CustomerRiskProfileDTO, CustomerService, MifidQuestionnaireConfigDTO, MifidService} from '../../api/customer-service';
import {OnboardingProgressService, OnboardingStep} from '../../core/services/onboarding-progress.service';
import {CustomerSessionService} from '../../core/services/customer-session.service';
import {findBand, MifidQuestionnaireService, profileDisplay, riskBands} from '../../core/services/mifid-questionnaire.service';
import {WorkspaceContextService} from '../../core/services/workspace-context.service';
import {busyAction} from '../../core/services/busy-action';
import {BACKGROUND_REQUEST} from '../../core/interceptors/loading.context';
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

        <div class="verify" role="status" aria-live="polite">
          @switch (verification()) {
            @case ('pending') { <span class="material-symbols-outlined spin" aria-hidden="true">progress_activity</span> Verifying the account (anti-money-laundering check)… }
            @case ('active') { <span class="material-symbols-outlined ok" aria-hidden="true">verified</span> Account verified and active. }
            @case ('rejected') { <span class="material-symbols-outlined err" aria-hidden="true">block</span> The account could not be verified. Your advisor will contact you. }
            @case ('timeout') { <span class="material-symbols-outlined" aria-hidden="true">schedule</span> Verification is taking longer than usual. You can continue; the status updates automatically. }
          }
        </div>
        <p class="note">Your advisor reviews this profile with you. You can retake the questionnaire if your situation changes.</p>
      } @else {
        <p-message severity="info">No investor profile yet. Complete the MiFID questionnaire to calculate it.</p-message>
      }

      <div actions class="wmp-actions">
        <p-button label="Back to questionnaire" severity="secondary" [outlined]="true" [loading]="back.pending()" (onClick)="back()"/>
        <div class="wmp-actions__end">
          <p-button label="Finish onboarding" [disabled]="!profile() || verification() === 'pending'"
                    [loading]="finish.pending()" (onClick)="finish()"/>
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
    .verify { display: flex; align-items: center; gap: .5rem; margin-top: 1rem; font-size: .9rem; color: var(--wmp-text-muted); }
    .verify .material-symbols-outlined { font-size: 20px; }
    .verify .ok { color: var(--wmp-gain); }
    .verify .err { color: var(--wmp-danger); }
    .spin { animation: spin 1s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    @media (prefers-reduced-motion: reduce) { .spin { animation: none; } }
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
  /** Onboarding lifecycle after submit: PENDING_VERIFICATION -> ACTIVE | REJECTED (async AML check on the BE). */
  protected readonly verification = signal<'none' | 'pending' | 'active' | 'rejected' | 'timeout'>('none');
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
    return findBand(this.config(), p?.profile)
      ?? bands.find(b => p?.score != null && p.score >= (b.minScore ?? 0) && p.score <= (b.maxScore ?? 0));
  });

  /** BE label when the profile matches a configured band; otherwise a readable version of the raw code. */
  protected readonly profileLabel = computed(() => {
    const band = this.activeBand();
    if (band?.profileLabel) return band.profileLabel;
    return profileDisplay(this.config(), this.profile()?.profile) || 'Pending review';
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

  private destroyed = false;

  constructor() {
    inject(DestroyRef).onDestroy(() => (this.destroyed = true));
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
    if (customerId) void this.pollVerification(customerId);
  }

  /** Polls the customer status until it leaves PENDING_VERIFICATION (interval 1.5 s, timeout 20 s). */
  private async pollVerification(customerId: string): Promise<void> {
    const deadline = Date.now() + 20000;
    // Right after a submit the status may still read DRAFT for a moment: keep polling in that case
    const justSubmitted = !!this.mifid.result();
    // Background polling: the page already shows its own "verifying" state, so keep the global bar out of it
    const context = new HttpContext().set(BACKGROUND_REQUEST, true);
    while (!this.destroyed) {
      let status: string | undefined;
      try {
        const customer = await firstValueFrom(this.customerApi.getCustomerById(customerId, 'body', false, {context}));
        status = customer?.customerStatus;
        if (customer) this.customerSession.setCustomer(customer);
        if (!this.profile() && customer?.riskProfile) this.profile.set(customer.riskProfile);
      } catch {
        // transient error: keep polling until the deadline
      }
      if (status === 'ACTIVE') { this.verification.set('active'); return; }
      if (status === 'REJECTED') { this.verification.set('rejected'); return; }
      const waiting = status === undefined || status === 'PENDING_VERIFICATION' || (justSubmitted && status === 'DRAFT');
      if (!waiting) { this.verification.set('none'); return; }
      if (Date.now() > deadline) { this.verification.set('timeout'); return; }
      this.verification.set('pending');
      await new Promise(resolve => setTimeout(resolve, 1500));
    }
  }

  protected readonly back = busyAction(() =>
    this.router.navigateByUrl(this.progress.pathFor(OnboardingStep.MifidQuestionnaire)));

  protected readonly finish = busyAction(async () => {
    this.progress.completeStep(this.step);
    await this.router.navigateByUrl(this.workspace.homePath());
  });
}
