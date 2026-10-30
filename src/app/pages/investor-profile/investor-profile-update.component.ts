import {Component, computed, inject, signal} from '@angular/core';
import {Router, RouterLink} from '@angular/router';
import {firstValueFrom} from 'rxjs';
import {Button} from 'primeng/button';
import {Message} from 'primeng/message';
import {MifidService} from '../../api/customer-service';
import {CustomerSessionService} from '../../core/services/customer-session.service';
import {
  firstIncompleteSection, isSectionComplete, loadSubmittedFilling, MifidQuestionnaireService, profileDisplay
} from '../../core/services/mifid-questionnaire.service';
import {busyAction} from '../../core/services/busy-action';
import {ToastService} from '../../shared/services/toast.service';
import {MifidSectionComponent} from '../../shared/components/mifid-section/mifid-section.component';

const PROFILE_PATH = '/app/investor-profile';

/**
 * MiFID update for an onboarded customer: a new filling, pre-filled with the submitted answers (or the saved update
 * draft), that supersedes the current one on submit. The BE recalculates the risk profile without a new AML check.
 */
@Component({
  selector: 'app-investor-profile-update',
  imports: [RouterLink, Button, Message, MifidSectionComponent],
  template: `
    <div class="page">
      <header class="head">
        <div>
          <h1>Update investor profile</h1>
          <p class="muted">Review your MiFID answers and change what no longer applies. Your current profile stays in force
            until you submit.</p>
        </div>
        <a routerLink="/app/investor-profile" class="link">Cancel</a>
      </header>

      @if (!onboarded()) {
        <p-message severity="warn">This customer hasn't completed onboarding yet. Finish the MiFID questionnaire in the onboarding first.</p-message>
      } @else {
        @switch (mifid.state()) {
          @case ('loading') {
            <p class="muted">Loading the questionnaire…</p>
          }
          @case ('unavailable') {
            <p-message severity="warn">No MiFID questionnaire is currently available. Please try again later or contact support.</p-message>
          }
          @case ('error') {
            <p-message severity="error">The questionnaire could not be loaded. Reload the page to try again.</p-message>
          }
          @case ('ready') {
            @if (section(); as s) {
              <app-mifid-section [section]="s" [index]="index()" [showMissing]="showMissing()"/>
            }
            @if (errorMsg()) {
              <p-message severity="error">{{ errorMsg() }}</p-message>
            }
            <div class="wmp-actions">
              <p-button label="Previous section" severity="secondary" [outlined]="true" [disabled]="index() === 0" (onClick)="previous()"/>
              <div class="wmp-actions__end">
                <p-button label="Save & exit" severity="secondary" [outlined]="true" [loading]="saveAndExit.pending()"
                          [disabled]="submit.pending()" (onClick)="saveAndExit()"/>
                @if (isLast()) {
                  <p-button [label]="submit.pending() ? 'Submitting…' : 'Submit update'" [loading]="submit.pending()" (onClick)="submit()"/>
                } @else {
                  <p-button label="Next section" (onClick)="next()"/>
                }
              </div>
            </div>
          }
        }
      }
    </div>
  `,
  styles: [`
    :host { display: block; }
    .page { padding: 1.5rem; display: grid; gap: 1rem; max-width: 860px; }
    .head { display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; }
    .head h1 { margin: 0; font-size: 1.6rem; font-weight: 600; }
    .head p { margin: .35rem 0 0; max-width: 40rem; }
    .muted { margin: 0; color: var(--wmp-text-muted); font-size: .9rem; }
    .link { font-size: .9rem; white-space: nowrap; }
    @media (max-width: 599.98px) { .page { padding: 1rem; } }
  `]
})
export class InvestorProfileUpdateComponent {
  protected readonly mifid = inject(MifidQuestionnaireService);
  private readonly mifidApi = inject(MifidService);
  private readonly customerSession = inject(CustomerSessionService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  protected readonly onboarded = computed(() => this.customerSession.customer()?.customerStatus === 'ACTIVE');
  protected readonly index = signal(0);
  protected readonly showMissing = signal(false);
  protected readonly errorMsg = signal<string | null>(null);
  protected readonly saveAndExit = busyAction(() => this.saveDraftAndExit());
  protected readonly submit = busyAction(() => this.submitUpdate());

  protected readonly section = computed(() => this.mifid.sections()[this.index()]);
  protected readonly isLast = computed(() => this.index() === this.mifid.sections().length - 1);

  constructor() {
    void this.load();
  }

  private async load(): Promise<void> {
    const customerId = this.customerSession.customer()?.id;
    if (!customerId) {
      this.mifid.state.set('error');
      return;
    }
    if (!this.onboarded()) return;
    this.mifid.state.set('loading');
    try {
      // A saved update draft wins over the submitted answers (MifidQuestionnaireService.load)
      const submitted = this.mifid.hasDraft(customerId) ? null : await loadSubmittedFilling(this.mifidApi, customerId);
      await this.mifid.load(customerId, {prefillFrom: submitted});
    } catch {
      this.mifid.state.set('error');
    }
  }

  protected next(): void {
    if (!isSectionComplete(this.section(), this.mifid.answers())) {
      this.showMissing.set(true);
      return;
    }
    this.showMissing.set(false);
    this.index.update(i => i + 1);
    window.scrollTo({top: 0});
  }

  protected previous(): void {
    this.showMissing.set(false);
    this.index.update(i => Math.max(0, i - 1));
    window.scrollTo({top: 0});
  }

  private async saveDraftAndExit(): Promise<void> {
    try {
      await this.mifid.saveDraft();
      this.toast.success('Update saved. You can continue it from your investor profile.');
    } catch {
      this.toast.error('Could not save the update. Please try again.');
      return;
    }
    await this.router.navigateByUrl(PROFILE_PATH);
  }

  private async submitUpdate(): Promise<void> {
    this.errorMsg.set(null);
    const firstIncomplete = firstIncompleteSection(this.mifid.sections(), this.mifid.answers());
    if (firstIncomplete !== -1) {
      this.index.set(firstIncomplete);
      this.showMissing.set(true);
      return;
    }
    try {
      await this.mifid.submit();
    } catch {
      this.errorMsg.set('The update could not be submitted. Your answers are still here; please try again.');
      return;
    }
    const profile = this.mifid.result();
    const customer = this.customerSession.customer();
    if (customer && profile) this.customerSession.setCustomer({...customer, riskProfile: profile});
    const label = profileDisplay(this.mifid.config(), profile?.profile);
    this.toast.success(label ? `Investor profile updated: ${label}.` : 'Investor profile updated.');
    await this.router.navigateByUrl(PROFILE_PATH);
  }
}
