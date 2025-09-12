import {Component} from '@angular/core';
import {CommonModule} from '@angular/common';
import {OnboardingStep} from '../../core/services/onboarding-progress.service';
import {OnboardingStepShellComponent} from '../../shared/components/onboarding-step-shell/onboarding-step-shell.component';

@Component({
  selector: 'app-onboarding-risk-assessment',
  standalone: true,
  imports: [CommonModule, OnboardingStepShellComponent],
  template: `
    <app-onboarding-step-shell
      [stepIndex]="step"
      title="Risk assessment"
      subtitle="Review and confirm your risk profile."
    >
      <p class="placeholder">Result summary placeholder.</p>
    </app-onboarding-step-shell>
  `,
  styles: []
})
export class RiskAssessmentComponent {
  step = OnboardingStep.RiskAssessment;
}
