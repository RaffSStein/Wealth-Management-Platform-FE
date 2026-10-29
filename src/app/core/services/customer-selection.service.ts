import {Injectable, inject} from '@angular/core';
import {Router} from '@angular/router';
import {firstValueFrom} from 'rxjs';
import {CustomerService, OnboardingService} from '../../api/customer-service';
import {CustomerSessionService} from './customer-session.service';
import {OnboardingProgressService, OnboardingStep} from './onboarding-progress.service';

/**
 * Opens a customer as the working context (advisors: "act as" that client): loads a fresh record into the
 * session, then goes to the customer home, or resumes onboarding for DRAFT customers.
 */
@Injectable({providedIn: 'root'})
export class CustomerSelectionService {
  private readonly router = inject(Router);
  private readonly customerApi = inject(CustomerService);
  private readonly onboardingApi = inject(OnboardingService);
  private readonly customerSession = inject(CustomerSessionService);
  private readonly progress = inject(OnboardingProgressService);

  async open(customerId: string): Promise<void> {
    const customer = await firstValueFrom(this.customerApi.getCustomerById(customerId));
    this.customerSession.setCustomer(customer);
    if ((customer?.customerStatus || '').toUpperCase() === 'DRAFT') {
      await this.router.navigateByUrl(await this.resumePath(customerId));
      return;
    }
    await this.router.navigateByUrl('/app/home');
  }

  /** Syncs the step flags with the customer's active onboarding, then resumes at the first incomplete step. */
  private async resumePath(customerId: string): Promise<string> {
    try {
      const active = await firstValueFrom(this.onboardingApi.getActiveOnboarding(customerId));
      this.progress.syncFromBackend(active?.steps);
      return this.progress.firstIncompletePath();
    } catch {
      // Unknown progress: drop any flags left from another customer and start from the first step
      this.progress.reset();
      return this.progress.pathFor(OnboardingStep.PersonalDetails);
    }
  }
}
