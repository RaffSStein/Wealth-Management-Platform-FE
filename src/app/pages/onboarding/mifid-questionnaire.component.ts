import {Component} from '@angular/core';
import {CommonModule} from '@angular/common';
import {OnboardingStep} from '../../core/services/onboarding-progress.service';
import {OnboardingStepShellComponent} from '../../shared/components/onboarding-step-shell/onboarding-step-shell.component';

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
      <p class="placeholder">Questionnaire sections placeholder.</p>
    </app-onboarding-step-shell>
  `,
  styles: []
})
export class MifidQuestionnaireComponent {
  step = OnboardingStep.MifidQuestionnaire;
}
