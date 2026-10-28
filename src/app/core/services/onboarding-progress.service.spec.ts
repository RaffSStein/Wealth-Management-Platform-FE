import { TestBed } from '@angular/core/testing';
import { OnboardingProgressService, OnboardingStep } from './onboarding-progress.service';

describe('OnboardingProgressService', () => {
  let service: OnboardingProgressService;

  beforeEach(() => {
    service = TestBed.inject(OnboardingProgressService);
  });

  it('maps BE onboarding steps to FE steps', () => {
    expect(service.stepFromBackend('INIT')).toBe(OnboardingStep.PersonalDetails);
    expect(service.stepFromBackend('PERSONAL_DETAILS')).toBe(OnboardingStep.PersonalDetails);
    expect(service.stepFromBackend('DOCUMENTS')).toBe(OnboardingStep.PersonalDetails);
    expect(service.stepFromBackend('FINANCIALS')).toBe(OnboardingStep.FinancialInformation);
    expect(service.stepFromBackend('goals')).toBe(OnboardingStep.InvestmentGoals);
    expect(service.stepFromBackend('MIFID')).toBe(OnboardingStep.MifidQuestionnaire);
    expect(service.stepFromBackend('AML')).toBe(OnboardingStep.RiskAssessment);
    expect(service.stepFromBackend('FINALIZE')).toBe(OnboardingStep.RiskAssessment);
  });

  it('returns null for unknown or missing steps', () => {
    expect(service.stepFromBackend('SOMETHING_ELSE')).toBeNull();
    expect(service.stepFromBackend(undefined)).toBeNull();
  });
});
