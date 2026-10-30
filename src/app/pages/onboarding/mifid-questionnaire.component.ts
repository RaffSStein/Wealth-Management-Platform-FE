import {Component, computed, inject, signal} from '@angular/core';
import {Router} from '@angular/router';
import {Button} from 'primeng/button';
import {Message} from 'primeng/message';
import {OnboardingProgressService, OnboardingStep} from '../../core/services/onboarding-progress.service';
import {CustomerSessionService} from '../../core/services/customer-session.service';
import {firstIncompleteSection, isSectionComplete, MifidQuestionnaireService} from '../../core/services/mifid-questionnaire.service';
import {busyAction} from '../../core/services/busy-action';
import {WorkspaceContextService} from '../../core/services/workspace-context.service';
import {ToastService} from '../../shared/services/toast.service';
import {OnboardingLayoutComponent} from '../../shared/components/onboarding-layout/onboarding-layout.component';
import {MifidSectionComponent} from '../../shared/components/mifid-section/mifid-section.component';

@Component({
  selector: 'app-onboarding-mifid-questionnaire',
  imports: [OnboardingLayoutComponent, MifidSectionComponent, Button, Message],
  template: `
    <app-onboarding-layout [step]="step" title="MiFID questionnaire"
                           subtitle="These questions assess your knowledge, experience and attitude to risk, as required by MiFID II. There are no right or wrong answers.">
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
        }
      }

      <div actions class="wmp-actions">
        <p-button [label]="index() === 0 ? 'Back' : 'Previous section'" severity="secondary" [outlined]="true"
                  [loading]="previous.pending()" (onClick)="previous()"/>
        @if (mifid.state() === 'ready') {
          <div class="wmp-actions__end">
            <p-button label="Save & exit" severity="secondary" [outlined]="true" [loading]="saveAndExit.pending()"
                      [disabled]="submit.pending()" (onClick)="saveAndExit()"/>
            @if (isLast()) {
              <p-button [label]="submit.pending() ? 'Submitting…' : 'Submit questionnaire'" [loading]="submit.pending()" (onClick)="submit()"/>
            } @else {
              <p-button label="Next section" (onClick)="next()"/>
            }
          </div>
        }
      </div>
    </app-onboarding-layout>
  `,
  styles: [`
    .muted { color: var(--wmp-text-muted); }
  `]
})
export class MifidQuestionnaireComponent {
  protected readonly step = OnboardingStep.MifidQuestionnaire;
  protected readonly mifid = inject(MifidQuestionnaireService);
  private readonly progress = inject(OnboardingProgressService);
  private readonly router = inject(Router);
  private readonly customerSession = inject(CustomerSessionService);
  private readonly toast = inject(ToastService);
  private readonly workspace = inject(WorkspaceContextService);

  protected readonly index = signal(0);
  protected readonly showMissing = signal(false);
  protected readonly previous = busyAction(() => this.goToPrevious());
  protected readonly saveAndExit = busyAction(() => this.saveDraftAndExit());
  protected readonly submit = busyAction(() => this.submitQuestionnaire());
  protected readonly errorMsg = signal<string | null>(null);

  protected readonly section = computed(() => this.mifid.sections()[this.index()]);
  protected readonly isLast = computed(() => this.index() === this.mifid.sections().length - 1);

  constructor() {
    const customerId = this.customerSession.customer()?.id;
    if (customerId) void this.mifid.load(customerId);
    else this.mifid.state.set('error');
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

  private async goToPrevious(): Promise<void> {
    this.showMissing.set(false);
    if (this.index() === 0) {
      await this.router.navigateByUrl(this.progress.pathFor(OnboardingStep.InvestmentGoals));
      return;
    }
    this.index.update(i => i - 1);
    window.scrollTo({top: 0});
  }

  /** Saves the answers as a BE draft (resumed on the next visit), then leaves the onboarding. */
  private async saveDraftAndExit(): Promise<void> {
    try {
      await this.mifid.saveDraft();
      this.toast.success('Draft saved. You can continue later.');
    } catch {
      this.toast.error('Could not save the draft. Please try again.');
      return;
    }
    await this.workspace.exitOnboarding();
  }

  private async submitQuestionnaire(): Promise<void> {
    this.errorMsg.set(null);
    const firstIncomplete = firstIncompleteSection(this.mifid.sections(), this.mifid.answers());
    if (firstIncomplete !== -1) {
      this.index.set(firstIncomplete);
      this.showMissing.set(true);
      return;
    }
    try {
      await this.mifid.submit();
      this.progress.completeStep(this.step);
      await this.router.navigateByUrl(this.progress.pathFor(OnboardingStep.RiskAssessment));
    } catch {
      this.errorMsg.set('The questionnaire could not be submitted. Your answers are still here; please try again.');
    }
  }
}
