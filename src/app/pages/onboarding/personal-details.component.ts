import {Component, inject, signal} from '@angular/core';
import {Router} from '@angular/router';
import {FormBuilder, ReactiveFormsModule, Validators} from '@angular/forms';
import {firstValueFrom} from 'rxjs';
import {Button, ButtonDirective, ButtonLabel} from 'primeng/button';
import {DatePicker} from 'primeng/datepicker';
import {InputText} from 'primeng/inputtext';
import {Message} from 'primeng/message';
import {Select} from 'primeng/select';
import {CustomerDTO, CustomerPersonalDetailsDTO, CustomerService} from '../../api/customer-service';
import {OnboardingProgressService, OnboardingStep} from '../../core/services/onboarding-progress.service';
import {UserSessionService} from '../../core/services/user-session.service';
import {OnboardingFormStateService} from '../../core/services/onboarding-form-state.service';
import {CustomerSessionService} from '../../core/services/customer-session.service';
import {WorkspaceContextService} from '../../core/services/workspace-context.service';
import {ToastService} from '../../shared/services/toast.service';
import {busyAction} from '../../core/services/busy-action';
import {OnboardingLayoutComponent} from '../../shared/components/onboarding-layout/onboarding-layout.component';

const ISO2 = /^[A-Z]{2}$/;

@Component({
  selector: 'app-onboarding-personal-details',
  imports: [ReactiveFormsModule, OnboardingLayoutComponent, DatePicker, InputText, Message, Select, Button, ButtonDirective, ButtonLabel],
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
          <p-button label="Save & exit" severity="secondary" [outlined]="true" [loading]="saveAndExit.pending()"
                    [disabled]="onSubmit.pending() || prefilling()" (onClick)="saveAndExit()"/>
          <button pButton type="submit" form="personal-details-form" [loading]="onSubmit.pending()"
                  [disabled]="saveAndExit.pending() || prefilling()"><span pButtonLabel>{{ onSubmit.pending() ? 'Saving…' : 'Save & continue' }}</span></button>
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
export class PersonalDetailsComponent {
  protected readonly step = OnboardingStep.PersonalDetails;
  private readonly progress = inject(OnboardingProgressService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly customerApi = inject(CustomerService);
  private readonly userSession = inject(UserSessionService);
  private readonly formState = inject(OnboardingFormStateService);
  private readonly customerSession = inject(CustomerSessionService);
  private readonly workspace = inject(WorkspaceContextService);
  private readonly toast = inject(ToastService);

  readonly onSubmit = busyAction(async () => {
    if (await this.save()) await this.router.navigateByUrl(this.progress.pathFor(OnboardingStep.FinancialInformation));
  });
  readonly saveAndExit = busyAction(async () => {
    if (!await this.save()) return;
    this.toast.success('Personal details saved. You can resume the onboarding at any time.');
    await this.workspace.exitOnboarding();
  });
  /** True while the saved values are loaded from the BE (the form is disabled meanwhile). */
  protected readonly prefilling = signal(false);
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
    void this.prefill();
  }

  /** Unsaved local draft first (this tab), else the values saved on the BE for the selected customer. */
  private async prefill(): Promise<void> {
    const draft = this.formState.load('personal-details');
    const customerId = this.customerSession.customer()?.id;
    if (draft) {
      this.form.patchValue(draft);
    } else if (customerId) {
      this.prefilling.set(true);
      this.form.disable({emitEvent: false});
      try {
        const customer = await firstValueFrom(this.customerApi.getCustomerById(customerId));
        this.customerSession.setCustomer(customer);
        this.form.patchValue(this.fromCustomer(customer), {emitEvent: false});
      } catch {
        this.errorMsg.set('Could not load the saved details. You can still edit and save them.');
      } finally {
        this.form.enable({emitEvent: false});
        this.prefilling.set(false);
      }
    }
    this.form.valueChanges.subscribe(v => this.formState.save('personal-details', v));
  }

  private fromCustomer(c: CustomerDTO) {
    return {
      taxId: c.taxId ?? '', firstName: c.firstName ?? '', lastName: c.lastName ?? '', dateOfBirth: c.dateOfBirth ?? '',
      gender: c.gender ?? 'NOT_SPECIFIED', nationality: c.nationality ?? '', phoneNumber: c.phoneNumber ?? '',
      addressLine1: c.addressLine1 ?? '', addressLine2: c.addressLine2 ?? '', city: c.city ?? '',
      zipCode: c.zipCode ?? '', country: c.country ?? ''
    };
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

  /**
   * Creates the customer (first save) or updates the selected one, so saving again never makes a duplicate.
   * Returns false when nothing was saved (invalid form or error, shown inline).
   */
  private async save(): Promise<boolean> {
    this.errorMsg.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return false;
    }
    const raw = this.form.getRawValue();
    const existingId = this.customerSession.customer()?.id;
    try {
      if (existingId) {
        // The update DTO has no address lines yet (BE spec): they are only stored on the first save
        const details = {
          firstName: raw.firstName,
          lastName: raw.lastName,
          dateOfBirth: raw.dateOfBirth,
          gender: raw.gender,
          taxId: raw.taxId,
          nationality: raw.nationality || undefined,
          phoneNumber: raw.phoneNumber || undefined,
          city: raw.city || undefined,
          zipCode: raw.zipCode || undefined,
          country: raw.country || undefined
        } as CustomerPersonalDetailsDTO;
        const updated = await firstValueFrom(this.customerApi.updateCustomerPersonalDetails(existingId, details));
        if (updated?.id) this.customerSession.setCustomer(updated);
      } else {
        const userId = this.userSession.profile()?.id; // take id from /me profile
        if (!userId) {
          this.errorMsg.set('User profile not loaded. Please sign in again.');
          return false;
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
        const created = await firstValueFrom(this.customerApi.initCustomer(dto));
        // Drop the 'new' draft before the draft scope switches to the created customer
        this.formState.clear('personal-details');
        // The next steps operate on the selected customer
        if (created?.id) this.customerSession.setCustomer(created);
      }
      this.formState.clear('personal-details');
      this.progress.markPersonalDetailsSubmitted();
      return true;
    } catch (err: unknown) {
      const message = (err as { error?: { message?: string } })?.error?.message;
      this.errorMsg.set(message || 'Unable to save the personal details. Please try again.');
      return false;
    }
  }
}
