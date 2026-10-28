import {Component, inject, OnDestroy, signal} from '@angular/core';
import {Router} from '@angular/router';
import {FormBuilder, ReactiveFormsModule, Validators} from '@angular/forms';
import {firstValueFrom} from 'rxjs';
import {ButtonDirective, ButtonLabel} from 'primeng/button';
import {DatePicker} from 'primeng/datepicker';
import {InputText} from 'primeng/inputtext';
import {Message} from 'primeng/message';
import {Select} from 'primeng/select';
import {CustomerDTO, CustomerService, OnboardingService} from '../../api/customer-service';
import {OnboardingProgressService, OnboardingStep} from '../../core/services/onboarding-progress.service';
import {UserSessionService} from '../../core/services/user-session.service';
import {OnboardingFormStateService} from '../../core/services/onboarding-form-state.service';
import {CustomerSessionService} from '../../core/services/customer-session.service';
import {OnboardingLayoutComponent} from '../../shared/components/onboarding-layout/onboarding-layout.component';

const ISO2 = /^[A-Z]{2}$/;

@Component({
  selector: 'app-onboarding-personal-details',
  imports: [ReactiveFormsModule, OnboardingLayoutComponent, DatePicker, InputText, Message, Select, ButtonDirective, ButtonLabel],
  template: `
    <app-onboarding-layout [step]="step" title="Personal details"
                           subtitle="Tell us who the account holder is. We use this to identify the customer and meet our regulatory obligations.">
      <form id="personal-details-form" class="wmp-form" [formGroup]="form" (ngSubmit)="onSubmit()" novalidate>
        <section class="wmp-panel">
          <h2 class="wmp-panel__title">Identity</h2>
          <div class="wmp-form-grid">
            <div class="wmp-field">
              <label for="firstName">First name<span class="wmp-req" aria-hidden="true">*</span></label>
              <input pInputText id="firstName" formControlName="firstName" autocomplete="given-name"/>
              @if (showError('firstName')) { <small class="wmp-field__error">Enter the first name.</small> }
            </div>
            <div class="wmp-field">
              <label for="lastName">Last name<span class="wmp-req" aria-hidden="true">*</span></label>
              <input pInputText id="lastName" formControlName="lastName" autocomplete="family-name"/>
              @if (showError('lastName')) { <small class="wmp-field__error">Enter the last name.</small> }
            </div>
            <div class="wmp-field">
              <label for="dateOfBirth">Date of birth<span class="wmp-req" aria-hidden="true">*</span></label>
              <p-datepicker inputId="dateOfBirth" formControlName="dateOfBirth" dataType="string" dateFormat="yy-mm-dd"
                            [maxDate]="today" [showIcon]="true" iconDisplay="input" placeholder="YYYY-MM-DD" appendTo="body"/>
              @if (showError('dateOfBirth')) { <small class="wmp-field__error">Enter the date of birth.</small> }
            </div>
            <div class="wmp-field">
              <label for="gender">Gender</label>
              <p-select inputId="gender" formControlName="gender" [options]="genders" optionLabel="label" optionValue="value" appendTo="body"/>
            </div>
            <div class="wmp-field">
              <label for="taxId">Tax ID<span class="wmp-req" aria-hidden="true">*</span></label>
              <input pInputText id="taxId" formControlName="taxId" class="num" autocomplete="off"/>
              @if (showError('taxId')) { <small class="wmp-field__error">Enter the tax ID.</small> }
            </div>
            <div class="wmp-field">
              <label for="nationality">Nationality</label>
              <input pInputText id="nationality" formControlName="nationality" maxlength="2" placeholder="IT"
                     class="num" (input)="uppercase($event, 'nationality')" aria-describedby="nationality-hint"/>
              @if (showError('nationality')) {
                <small class="wmp-field__error">Use a 2-letter ISO country code.</small>
              } @else {
                <small class="wmp-field__hint" id="nationality-hint">2-letter ISO code, e.g. IT</small>
              }
            </div>
          </div>
        </section>

        <section class="wmp-panel">
          <h2 class="wmp-panel__title">Contact &amp; address</h2>
          <div class="wmp-form-grid">
            <div class="wmp-field">
              <label for="phoneNumber">Phone</label>
              <input pInputText id="phoneNumber" type="tel" formControlName="phoneNumber" autocomplete="tel"/>
            </div>
            <div class="wmp-field">
              <label for="country">Country of residence</label>
              <input pInputText id="country" formControlName="country" maxlength="2" placeholder="IT"
                     class="num" (input)="uppercase($event, 'country')"/>
              @if (showError('country')) { <small class="wmp-field__error">Use a 2-letter ISO country code.</small> }
            </div>
            <div class="wmp-field wmp-field--full">
              <label for="addressLine1">Address line 1</label>
              <input pInputText id="addressLine1" formControlName="addressLine1" autocomplete="address-line1"/>
            </div>
            <div class="wmp-field wmp-field--full">
              <label for="addressLine2">Address line 2</label>
              <input pInputText id="addressLine2" formControlName="addressLine2" autocomplete="address-line2"/>
            </div>
            <div class="wmp-field">
              <label for="city">City</label>
              <input pInputText id="city" formControlName="city" autocomplete="address-level2"/>
            </div>
            <div class="wmp-field">
              <label for="zipCode">ZIP</label>
              <input pInputText id="zipCode" formControlName="zipCode" autocomplete="postal-code" class="num"/>
            </div>
          </div>
        </section>

        <section class="wmp-panel doc">
          <span class="material-symbols-outlined" aria-hidden="true">badge</span>
          <div>
            <h2 class="wmp-panel__title">Identity document</h2>
            <p>Document upload is coming soon. You can continue without it for now.</p>
          </div>
        </section>

        @if (errorMsg()) {
          <p-message severity="error">{{ errorMsg() }}</p-message>
        }
      </form>

      <div actions class="wmp-actions">
        <span></span>
        <div class="wmp-actions__end">
          <button pButton type="submit" form="personal-details-form" [loading]="loading()"><span pButtonLabel>{{ loading() ? 'Saving…' : 'Save & continue' }}</span></button>
        </div>
      </div>
    </app-onboarding-layout>
  `,
  styles: [`
    .doc { grid-template-columns: auto 1fr; align-items: start; border-style: dashed; }
    .doc .material-symbols-outlined { font-size: 28px; color: var(--wmp-text-muted); }
    .doc p { margin: .25rem 0 0; color: var(--wmp-text-muted); font-size: .9rem; }
  `]
})
export class PersonalDetailsComponent implements OnDestroy {
  protected readonly step = OnboardingStep.PersonalDetails;
  private readonly progress = inject(OnboardingProgressService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly customerApi = inject(CustomerService);
  private readonly onboardingApi = inject(OnboardingService);
  private readonly userSession = inject(UserSessionService);
  private readonly formState = inject(OnboardingFormStateService);
  private readonly customerSession = inject(CustomerSessionService);

  protected readonly loading = signal(false);
  protected readonly errorMsg = signal<string | null>(null);
  protected readonly today = new Date();
  protected readonly genders = [
    {label: 'Not specified', value: 'NOT_SPECIFIED'},
    {label: 'Male', value: 'MALE'},
    {label: 'Female', value: 'FEMALE'},
    {label: 'Other', value: 'OTHER'}
  ];

  form = this.fb.group({
    taxId: this.fb.control<string>('', {validators: [Validators.required]}),
    firstName: this.fb.control<string>('', {validators: [Validators.required]}),
    lastName: this.fb.control<string>('', {validators: [Validators.required]}),
    dateOfBirth: this.fb.control<string>('', {validators: [Validators.required]}),
    gender: this.fb.control<'MALE' | 'FEMALE' | 'OTHER' | 'NOT_SPECIFIED'>('NOT_SPECIFIED'),
    nationality: this.fb.control<string>('', {validators: [Validators.pattern(ISO2)]}),
    phoneNumber: this.fb.control<string>(''),
    addressLine1: this.fb.control<string>(''),
    addressLine2: this.fb.control<string>(''),
    city: this.fb.control<string>(''),
    zipCode: this.fb.control<string>(''),
    country: this.fb.control<string>('', {validators: [Validators.pattern(ISO2)]})
  });

  constructor() {
    // Restore saved form state for this step (if any)
    const saved = this.formState.load('personal-details');
    if (saved) {
      this.form.patchValue(saved);
    }
    this.form.valueChanges.subscribe(v => this.formState.save('personal-details', v));
    void this.redirectToActiveOnboardingStep();
  }

  /** If the selected customer already has an onboarding in progress, resume at its first incomplete step. */
  private async redirectToActiveOnboardingStep(): Promise<void> {
    const customerId = this.customerSession.customer()?.id;
    if (!customerId) return;
    try {
      const active = await firstValueFrom(this.onboardingApi.getActiveOnboarding(customerId));
      const firstIncomplete = (active?.steps ?? []).find(s => (s.status || '').toUpperCase() !== 'COMPLETED');
      const target = this.progress.stepFromBackend(firstIncomplete?.step);
      if (target !== null && target !== this.step) {
        await this.router.navigateByUrl(this.progress.pathFor(target));
      }
    } catch {
      // stay on the current step
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
    this.form.get(control)?.setValue(v);
  }

  async onSubmit(): Promise<void> {
    const nextPath = this.progress.pathFor(OnboardingStep.FinancialInformation);
    if (this.progress.isStepCompleted(this.step)) {
      // Already submitted and unchanged: skip re-init
      if (!this.formState.isDirty('personal-details', this.form.getRawValue())) {
        await this.router.navigateByUrl(nextPath);
        return;
      }
    }
    this.errorMsg.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const raw = this.form.getRawValue();
    const userId = this.userSession.profile()?.id; // take id from /me profile
    if (!userId) {
      this.errorMsg.set('User profile not loaded. Please sign in again.');
      return;
    }
    const dto = {
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
    } as CustomerDTO;

    this.loading.set(true);
    try {
      const created = await firstValueFrom(this.customerApi.initCustomer(dto));
      // The next steps operate on the selected customer
      if (created?.id) this.customerSession.setCustomer(created);
      this.progress.markPersonalDetailsSubmitted();
      // Save submitted snapshot for dirty-check
      this.formState.saveSubmitted('personal-details', this.form.getRawValue());
      await this.router.navigateByUrl(nextPath);
    } catch (err: unknown) {
      const message = (err as { error?: { message?: string } })?.error?.message;
      this.errorMsg.set(message || 'Unable to save the personal details. Please try again.');
    } finally {
      this.loading.set(false);
    }
  }

  ngOnDestroy() {
    // Persist latest state on destroy (defensive)
    this.formState.save('personal-details', this.form.getRawValue());
  }
}
