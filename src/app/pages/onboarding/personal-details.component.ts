import {Component, inject, OnDestroy} from '@angular/core';
import {CommonModule} from '@angular/common';
import {OnboardingStep, OnboardingProgressService} from '../../core/services/onboarding-progress.service';
import {
  OnboardingStepShellComponent
} from '../../shared/components/onboarding-step-shell/onboarding-step-shell.component';
import {Router} from '@angular/router';
import {FormBuilder, ReactiveFormsModule, Validators} from '@angular/forms';
import {CustomerService} from '../../api/customer-service';
import {Subscription, firstValueFrom} from 'rxjs';
import {AuthService} from '../../core/services/auth.service';
import {UserSessionService} from '../../core/services/user-session.service';
import {ToastService} from '../../shared/services/toast.service';
import {OnboardingFormStateService} from '../../core/services/onboarding-form-state.service';
import {OnboardingService} from '../../api/customer-service';
import {CustomerSessionService} from '../../core/services/customer-session.service';

@Component({
  selector: 'app-onboarding-personal-details',
  standalone: true,
  imports: [CommonModule, OnboardingStepShellComponent, ReactiveFormsModule],
  template: `
    <app-onboarding-step-shell
      [stepIndex]="step"
      title="Personal Details"
      subtitle="Please provide your basic information to continue with the onboarding process."
    >
      <form class="wm-form" [formGroup]="form" (ngSubmit)="onSubmit()" novalidate>
        <div class="form-grid form-grid--max2">
          <div class="field field--compact required">
            <label for="firstName">First name</label>
            <input id="firstName" type="text" formControlName="firstName"/>
            @if (showError('firstName')) {
              <small class="error--inline">First name is required</small>
            }
          </div>
          <div class="field field--compact required">
            <label for="lastName">Last name</label>
            <input id="lastName" type="text" formControlName="lastName"/>
            @if (showError('lastName')) {
              <small class="error--inline">Last name is required</small>
            }
          </div>
          <div class="field field--compact required">
            <label for="dateOfBirth">Date of birth</label>
            <input id="dateOfBirth" type="date" formControlName="dateOfBirth"/>
            @if (showError('dateOfBirth')) {
              <small class="error--inline">Date of birth is required</small>
            }
          </div>
          <div class="field field--compact">
            <label for="gender">Gender</label>
            <select id="gender" formControlName="gender">
              <option value="NOT_SPECIFIED">Not specified</option>
              <option value="MALE">Male</option>
              <option value="FEMALE">Female</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
          <div class="field field--compact required">
            <label for="taxId">Tax ID</label>
            <input id="taxId" type="text" formControlName="taxId"/>
            @if (showError('taxId')) {
              <small class="error--inline">Tax ID is required</small>
            }
          </div>
          <div class="field field--compact">
            <label for="nationality">Nationality (ISO 2)</label>
            <input id="nationality" maxlength="2" type="text" formControlName="nationality"
                   (input)="uppercase($event,'nationality')"/>
          </div>
          <div class="field field--compact">
            <label for="country">Country (ISO 2)</label>
            <input id="country" maxlength="2" type="text" formControlName="country"
                   (input)="uppercase($event,'country')"/>
          </div>
          <div class="field field--compact">
            <label for="phoneNumber">Phone</label>
            <input id="phoneNumber" type="tel" formControlName="phoneNumber"/>
          </div>
          <div class="field field--compact field--full">
            <label for="addressLine1">Address line 1</label>
            <input id="addressLine1" type="text" formControlName="addressLine1"/>
          </div>
          <div class="field field--compact field--full">
            <label for="addressLine2">Address line 2</label>
            <input id="addressLine2" type="text" formControlName="addressLine2"/>
          </div>
          <div class="field field--compact">
            <label for="city">City</label>
            <input id="city" type="text" formControlName="city"/>
          </div>
          <div class="field field--compact">
            <label for="zipCode">ZIP</label>
            <input id="zipCode" type="text" formControlName="zipCode"/>
          </div>
        </div>

        <div class="uploader-block">
          <label class="uploader-label">Identity document (placeholder)</label>
          <input type="file" disabled aria-disabled="true"/>
          <small>Document upload will be implemented later.</small>
        </div>

        <div class="form-actions">
          <button class="primary" type="submit" [disabled]="loading || form.invalid">
            {{ loading ? 'Saving...' : 'Save & continue' }}
          </button>
        </div>
        @if (errorMsg) {
          <p class="form-error-global">{{ errorMsg }}</p>
        }
      </form>
    </app-onboarding-step-shell>
  `,
  styles: [
    `:host ::ng-deep .field.required > label::after {
      content: ' *';
      color: var(--color-danger);
    }

    .step-actions {
      display: flex;
      justify-content: flex-end;
      margin-bottom: .5rem;
    }

    .step-actions .secondary {
      background: var(--color-surface-alt);
      color: var(--color-text);
      border: 1px solid var(--color-border);
      border-radius: var(--radius);
      padding: .35rem .6rem;
      font-size: .8rem;
      cursor: pointer;
    }
    `
  ]
})
export class PersonalDetailsComponent implements OnDestroy {
  step = OnboardingStep.PersonalDetails;
  progress: OnboardingProgressService = inject(OnboardingProgressService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly customerApi = inject(CustomerService);
  private readonly auth = inject(AuthService);
  private readonly userSession = inject(UserSessionService);
  private readonly toast = inject(ToastService);
  private readonly formState = inject(OnboardingFormStateService);
  private readonly customerSession = inject(CustomerSessionService);

  loading = false;
  errorMsg: string | null = null;
  private readonly sub?: Subscription;

  form = this.fb.group({
    taxId: this.fb.control<string>('', {validators: [Validators.required]}),
    firstName: this.fb.control<string>('', {validators: [Validators.required]}),
    lastName: this.fb.control<string>('', {validators: [Validators.required]}),
    dateOfBirth: this.fb.control<string>('', {validators: [Validators.required]}),
    gender: this.fb.control<'MALE' | 'FEMALE' | 'OTHER' | 'NOT_SPECIFIED'>('NOT_SPECIFIED'),
    nationality: this.fb.control<string>(''),
    phoneNumber: this.fb.control<string>(''),
    addressLine1: this.fb.control<string>(''),
    addressLine2: this.fb.control<string>(''),
    city: this.fb.control<string>(''),
    zipCode: this.fb.control<string>(''),
    country: this.fb.control<string>('')
  });

  constructor() {
    // Restore saved form state for this step (if any)
    const saved = this.formState.load('personal-details');
    if (saved) {
      this.form.patchValue(saved);
    }
    this.form.valueChanges.subscribe(v => this.formState.save('personal-details', v));

    this.redirectToActiveOnboardingIfAny().catch(() => {});
  }

  private async redirectToActiveOnboardingIfAny() {
    const customer = this.customerSession.customer();
    const customerId = customer?.id;
    if (!customerId) return;
    const onboardingApi = inject(OnboardingService);
    try {
      const active = await firstValueFrom(onboardingApi.getActiveOnboarding(customerId));
      const steps = active?.steps || [];
      const firstIncomplete = steps.find(s => (s.status || '').toUpperCase() !== 'COMPLETED');
      if (firstIncomplete && typeof firstIncomplete.step === 'number') {
        const path = this.progress.pathFor(firstIncomplete.step as OnboardingStep);
        if (path !== '/onboarding/personal-details') {
          await this.router.navigateByUrl(path);
        }
      }
    } catch {
      // ignore errors, stay on current step
    }
  }

  showError(controlName: string): boolean {
    const c = this.form.get(controlName);
    return !!c && c.touched && c.invalid;
  }

  uppercase(evt: Event, control: string) {
    const input = evt.target as HTMLInputElement;
    const v = (input.value || '').toUpperCase();
    input.value = v;
    this.form.get(control)?.setValue(v, {emitEvent: false});
  }

  // Lightweight navigation without enforcing submit
  onPrev() {
    const prev = this.step - 1;
    if (prev >= OnboardingStep.PersonalDetails) {
      const path = this.progress.pathFor(prev as OnboardingStep);
      this.router.navigateByUrl(path).catch(() => {});
    }
  }

  onNext() {
    const next = this.step + 1;
    const path = this.progress.pathFor(next as OnboardingStep);
    this.router.navigateByUrl(path).catch(() => {});
  }

  onSubmit() {
    if (this.progress.isStepCompleted(this.step)) {
      // If already submitted and form unchanged, skip re-init
      const current = this.form.getRawValue();
      if (!this.formState.isDirty('personal-details', current)) {
        const next = this.step + 1;
        const nextPath = this.progress.pathFor(next as OnboardingStep);
        this.router.navigateByUrl(nextPath).catch(() => {});
        return;
      }
    }
    this.errorMsg = null;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const raw = this.form.getRawValue();
    const userId = this.userSession.profile()?.id; // take id from /me profile
    if (!userId) {
      this.errorMsg = 'User profile not loaded. Please try logging in again.';
      return;
    }
    const dto: any = {
      customerType: 'INDIVIDUAL',
      taxId: raw.taxId,
      customerStatus: 'DRAFT',
      userId,
      firstName: raw.firstName,
      lastName: raw.lastName,
      dateOfBirth: raw.dateOfBirth,
      gender: raw.gender,
      nationality: raw.nationality || undefined,
      phoneNumber: raw.phoneNumber || undefined,
      addressLine1: raw.addressLine1 || undefined,
      addressLine2: raw.addressLine2 || undefined,
      city: raw.city || undefined,
      zipCode: raw.zipCode || undefined,
      country: raw.country || undefined
    };
    this.loading = true;
    this.customerApi.initCustomer(dto).subscribe({
      next: () => {
        this.loading = false;
        this.progress.markPersonalDetailsSubmitted();
        // Save submitted snapshot for dirty-check
        this.formState.saveSubmitted('personal-details', this.form.getRawValue());
        const next = this.step + 1;
        const nextPath = this.progress.pathFor(next as OnboardingStep);
        this.router.navigateByUrl(nextPath).catch(() => {
        });
      },
      error: (err) => {
        this.loading = false;
        this.errorMsg = (err?.error?.message) || 'Unable to save data';
      }
    });
  }

  async onLogout() {
    try {
      await this.auth.logout();
    } finally {
      // Clear client-side session and onboarding progress, then redirect to sign-in
      this.userSession.clear();
      this.progress.reset();
      this.toast.info('You have been logged out.');
      this.router.navigateByUrl('/auth/sign-in').catch(() => {});
    }
  }

  ngOnDestroy() {
    // Persist latest state on destroy (defensive)
    this.formState.save('personal-details', this.form.getRawValue());
    this.sub?.unsubscribe();
  }
}
