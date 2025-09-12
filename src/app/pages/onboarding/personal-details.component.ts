import {Component, inject} from '@angular/core';
import {CommonModule} from '@angular/common';
import {OnboardingStep, OnboardingProgressService} from '../../core/services/onboarding-progress.service';
import {OnboardingStepShellComponent} from '../../shared/components/onboarding-step-shell/onboarding-step-shell.component';
import {Router} from '@angular/router';

@Component({
  selector: 'app-onboarding-personal-details',
  standalone: true,
  imports: [CommonModule, OnboardingStepShellComponent],
  template: `
    <app-onboarding-step-shell
      [stepIndex]="step"
      title="Personal details"
      subtitle="Fill in the required personal information to continue."
    >
      <p class="placeholder">Form will be implemented next (fields + validation + file uploader).</p>
      <button type="button" class="primary" (click)="onSubmit()" [disabled]="progress.isStepCompleted(step)">
        {{ progress.isStepCompleted(step) ? 'Step completed' : 'Save & continue' }}
      </button>
    </app-onboarding-step-shell>
  `,
  styles: []
})
export class PersonalDetailsComponent {
  step = OnboardingStep.PersonalDetails;
  progress: OnboardingProgressService = inject(OnboardingProgressService);
  private readonly router = inject(Router);

  onSubmit() {
    if (this.progress.isStepCompleted(this.step)) return;
    // TODO: validazione form reale quando presente
    this.progress.markPersonalDetailsSubmitted();
    const next = this.step + 1;
    // naviga allo step successivo se esiste
    if (next in OnboardingStep) {
      const nextPath = this.progress.pathFor(next as OnboardingStep);
      this.router.navigateByUrl(nextPath).catch(() => {});
    }
  }
}
