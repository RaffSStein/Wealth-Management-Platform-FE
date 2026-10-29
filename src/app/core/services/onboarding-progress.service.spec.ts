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

  it('rebuilds the step flags from the BE onboarding, dropping stale ones', () => {
    service.reset();
    [0, 1, 2, 3, 4].forEach(s => service.completeStep(s));
    service.syncFromBackend([
      {step: 'INIT', status: 'DONE'},
      {step: 'PERSONAL_DETAILS', status: 'DONE'},
      {step: 'DOCUMENTS', status: 'PENDING'},
      {step: 'FINANCIALS', status: 'done'},
      {step: 'GOALS', status: 'DONE'},
      {step: 'MIFID', status: 'PENDING'},
      {step: 'FINALIZE', status: 'PENDING'}
    ]);
    expect(service.progress()).toEqual([true, true, true, false, false]);
    expect(service.firstIncompletePath()).toBe('/onboarding/mifid-questionnaire');
  });

  it('treats rejected or missing steps as not completed', () => {
    service.syncFromBackend([{step: 'PERSONAL_DETAILS', status: 'REJECTED'}]);
    expect(service.progress().every(v => !v)).toBeTrue();
    service.syncFromBackend(undefined);
    expect(service.firstIncompletePath()).toBe('/onboarding/personal-details');
  });

  it('returns null for unknown or missing steps', () => {
    expect(service.stepFromBackend('SOMETHING_ELSE')).toBeNull();
    expect(service.stepFromBackend(undefined)).toBeNull();
  });
});
