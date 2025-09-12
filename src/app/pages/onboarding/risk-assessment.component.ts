import {Component} from '@angular/core';
import {CommonModule} from '@angular/common';
import {
  OnboardingNavigatorComponent,
  OnboardingStep
} from '../../shared/components/onboarding-navigator/onboarding-navigator.component';

@Component({
  selector: 'app-onboarding-risk-assessment',
  standalone: true,
  imports: [CommonModule, OnboardingNavigatorComponent],
  template: `
    <section class="onb-shell">
      <div class="panel">
        <h1 class="title"><span class="step-badge">{{ step + 1 }}</span> Risk assessment</h1>
        <p class="muted">Review and confirm your risk profile.</p>
        <app-onboarding-navigator [currentStep]="step"></app-onboarding-navigator>
        <p class="placeholder">Result summary placeholder.</p>
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
  `]
})
export class RiskAssessmentComponent {
  step = OnboardingStep.RiskAssessment;
}
