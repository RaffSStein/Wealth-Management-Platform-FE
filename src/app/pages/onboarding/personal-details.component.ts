import {Component, inject} from '@angular/core';
import {CommonModule} from '@angular/common';
import {
  OnboardingNavigatorComponent,
  OnboardingStep
} from '../../shared/components/onboarding-navigator/onboarding-navigator.component';
import {OnboardingProgressService} from '../../core/services/onboarding-progress.service';

@Component({
  selector: 'app-onboarding-personal-details',
  standalone: true,
  imports: [CommonModule, OnboardingNavigatorComponent],
  template: `
    <section class="onb-shell">
      <div class="panel">
        <h1 class="title"><span class="step-badge">{{ step + 1 }}</span> Personal details</h1>
        <p class="muted">Fill in the required personal information to continue.</p>
        <app-onboarding-navigator [currentStep]="step"></app-onboarding-navigator>
        <p class="placeholder">Form will be implemented next (fields + validation + file uploader).</p>
        <button type="button" class="primary" (click)="complete()" [disabled]="progress.isStepCompleted(step)">
          {{ progress.isStepCompleted(step) ? 'Step completed' : 'Mark step as completed (dev)' }}
        </button>
      </div>
    </section>
  `,
  styles: [`
    .onb-shell {
      min-height: 100dvh;
      padding: 2rem;
      background: var(--color-bg);
      display: grid;
      place-items: flex-start center;
    }

    .panel {
      width: 100%;
      max-width: 960px;
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius);
      padding: 1.5rem 1.75rem;
      display: grid;
      gap: 0.85rem;
    }

    .title {
      margin: 0;
      font-size: 1.35rem;
      line-height: 1.25;
      display: flex;
      align-items: center;
      gap: 0.65rem;
    }

    .step-badge {
      width: 34px;
      height: 34px;
      border-radius: 50%;
      background: var(--color-primary);
      color: var(--color-primary-contrast);
      font-size: 0.85rem;
      font-weight: 600;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }

    .muted {
      margin: 0;
      font-size: 0.8rem;
      opacity: 0.8;
    }

    .placeholder {
      margin: 0;
      font-size: 0.75rem;
      background: var(--color-surface-alt, var(--color-surface));
      padding: 0.5rem 0.75rem;
      border-radius: var(--radius);
      border: 1px dashed var(--color-border);
    }

    .primary {
      height: 42px;
      border: 1px solid var(--color-primary);
      background: var(--color-primary);
      color: var(--color-primary-contrast);
      font-weight: 600;
      border-radius: var(--radius);
      cursor: pointer;
    }

    .primary[disabled] {
      opacity: 0.6;
      cursor: default;
    }
  `]
})
export class PersonalDetailsComponent {
  step = OnboardingStep.PersonalDetails;
  progress: OnboardingProgressService = inject(OnboardingProgressService);

  complete() {
    this.progress.completeStep(this.step);
  }
}
