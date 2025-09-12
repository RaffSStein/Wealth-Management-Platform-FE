import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { inject } from '@angular/core';
import { OnboardingProgressService, OnboardingStep } from '../services/onboarding-progress.service';

/** Guard che impedisce l'accesso a step futuri se i precedenti non sono completi */
export const onboardingStepGuard: CanActivateFn = (route, _state): boolean | UrlTree => {
  const progress: OnboardingProgressService = inject(OnboardingProgressService);
  const router = inject(Router);

  const stepIndex = Number(route.data?.['step']);
  if (Number.isNaN(stepIndex)) return true; // se non specificato, lasciamo passare
  const step = stepIndex as OnboardingStep;

  if (progress.isStepAllowed(step)) return true;

  const redirect = progress.firstIncompletePath();
  return router.parseUrl(redirect);
};
