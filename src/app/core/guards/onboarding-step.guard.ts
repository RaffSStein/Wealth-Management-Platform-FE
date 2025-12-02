import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { inject } from '@angular/core';
import { OnboardingProgressService, OnboardingStep } from '../services/onboarding-progress.service';
import { UserSessionService } from '../services/user-session.service';
import { OnboardingService } from '../../api/customer-service';
import { firstValueFrom } from 'rxjs';
import { SessionRefreshService } from '../services/session-refresh.service';

export const onboardingStepGuard: CanActivateFn = async (route, _state): Promise<boolean | UrlTree> => {
  const progress: OnboardingProgressService = inject(OnboardingProgressService);
  const router = inject(Router);
  const userSession = inject(UserSessionService);
  const onboardingApi = inject(OnboardingService);
  const sessionRefresh = inject(SessionRefreshService);

  // Only refresh /me and active onboarding once after a full page load
  if (sessionRefresh.shouldRefreshOnce()) {
    try { await userSession.ensureLoaded(true); } catch {}
    const customerId = (userSession as any).getAccountId?.();
    if (typeof customerId === 'string' && customerId.trim().length > 0) {
      try { await firstValueFrom(onboardingApi.getActiveOnboarding(customerId)); } catch {}
    }
    sessionRefresh.markRefreshed();
  }

  const stepIndex = Number(route.data?.['step']);
  if (Number.isNaN(stepIndex)) return true;
  const step = stepIndex as OnboardingStep;

  if (progress.isStepAllowed(step)) return true;

  const redirect = progress.firstIncompletePath();
  return router.parseUrl(redirect);
};
