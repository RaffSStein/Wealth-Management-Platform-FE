import {Component} from '@angular/core';
import {CommonModule} from '@angular/common';
import {OnboardingStep} from '../../core/services/onboarding-progress.service';
import {OnboardingStepShellComponent} from '../../shared/components/onboarding-step-shell/onboarding-step-shell.component';

@Component({
  selector: 'app-onboarding-investment-goals',
  standalone: true,
  imports: [CommonModule, OnboardingStepShellComponent],
  template: `
    <app-onboarding-step-shell
      [stepIndex]="step"
      title="Investment goals"
      subtitle="Define your investment objectives and constraints."
    >
      <p class="placeholder">Content placeholder (form coming soon).</p>
    </app-onboarding-step-shell>
  `,
  styles: []
})
export class InvestmentGoalsComponent {
  step = OnboardingStep.InvestmentGoals;
}
