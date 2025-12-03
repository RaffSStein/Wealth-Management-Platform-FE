import {Component, inject} from '@angular/core';
import {CommonModule} from '@angular/common';
import {OnboardingStep, OnboardingProgressService} from '../../core/services/onboarding-progress.service';
import {OnboardingStepShellComponent} from '../../shared/components/onboarding-step-shell/onboarding-step-shell.component';
import {Router} from '@angular/router';
import {AuthService} from '../../core/services/auth.service';
import {ToastService} from '../../shared/services/toast.service';

@Component({
  selector: 'app-onboarding-mifid-questionnaire',
  standalone: true,
  imports: [CommonModule, OnboardingStepShellComponent],
  template: `
    <app-onboarding-step-shell
      [stepIndex]="step"
      title="MiFID questionnaire"
      subtitle="Provide the required regulatory answers."
    >
      <div class="step-actions">
        <button type="button" class="secondary" (click)="onPrev()">Back</button>
        <button type="button" class="secondary" (click)="onNext()">Next</button>
        <button type="button" class="secondary" (click)="onLogout()">Logout</button>
      </div>
      <p class="placeholder">Questionnaire sections placeholder.</p>
    </app-onboarding-step-shell>
  `,
  styles: [
    `.step-actions { display: flex; justify-content: flex-end; margin-bottom: .5rem; }
     .step-actions .secondary { background: var(--color-surface-alt); color: var(--color-text); border: 1px solid var(--color-border); border-radius: var(--radius); padding: .35rem .6rem; font-size: .8rem; cursor: pointer; }`
  ]
})
export class MifidQuestionnaireComponent {
  step = OnboardingStep.MifidQuestionnaire;
  private readonly progress = inject(OnboardingProgressService);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);

  onPrev() {
    const prev = this.step - 1;
    const path = this.progress.pathFor(prev as OnboardingStep);
    this.router.navigateByUrl(path).catch(() => {});
  }

  onNext() {
    const next = this.step + 1;
    const path = this.progress.pathFor(next as OnboardingStep);
    this.router.navigateByUrl(path).catch(() => {});
  }

  async onLogout() {
    try { await this.auth.logout(); } finally {
      this.toast.info('You have been logged out.');
      this.progress.reset();
      this.router.navigateByUrl('/auth/sign-in').catch(() => {});
    }
  }
}
