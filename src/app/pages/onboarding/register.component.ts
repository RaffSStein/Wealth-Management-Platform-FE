import {Component, inject, signal, effect} from '@angular/core';
import {Router, RouterLink} from '@angular/router';
import {CommonModule} from '@angular/common';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
  AbstractControl,
  ValidationErrors,
  FormGroup
} from '@angular/forms';
import {UserService, UserDTO, UserBranchRoleDTO} from '../../api/user-service';
import {AuthService} from '../../core/services/auth.service';
import {BankService, BankBranchDto, PageBankBranchDto} from '../../api/bank-service';
import {debounceTime} from 'rxjs';
import {finalize} from 'rxjs/operators';
import {
  PasswordStrengthFieldComponent
} from '../../shared/components/password-strength-field/password-strength-field.component';
import {MultiStepProgressComponent} from '../../shared/components/multi-step-progress/multi-step-progress.component';
import {RegistrationStateService} from '../../core/services/registration-state.service';

// Validator for matching passwords
function matchPassword(group: AbstractControl): ValidationErrors | null {
  const pwd = group.get('password')?.value;
  const rep = group.get('confirmPassword')?.value;
  if (!pwd || !rep) return null;
  return pwd === rep ? null : {passwordMismatch: true};
}

// Password complexity validator
function passwordComplexity(control: AbstractControl): ValidationErrors | null {
  const v = control.value as string;
  if (!v) return null; // required gestito da Validators.required
  const errors: any = {};
  if (!/[A-Z]/.test(v)) errors.missingUppercase = true;
  if (!/\d/.test(v)) errors.missingNumber = true;
  if (!/[^A-Za-z0-9]/.test(v)) errors.missingSymbol = true;
  return Object.keys(errors).length ? errors : null;
}

@Component({
  selector: 'app-onboarding-start',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, PasswordStrengthFieldComponent, MultiStepProgressComponent],
  template: `
    <section class="auth-shell">
      <div class="card form-card form-card--md narrow-form">
        <a routerLink="/" class="back-link" aria-label="Back to home">&larr; home</a>
        <header class="headline">
          <h1 class="greeting">Welcome</h1>
          <p class="subtitle">Create your account to get started</p>
        </header>

        <app-multi-step-progress [steps]="stepLabels" [currentIndex]="currentStep()"
                                 (stepClick)="goToStep($event)"></app-multi-step-progress>

        <form [formGroup]="form" (ngSubmit)="onSubmit()" novalidate class="wm-form multi-step vertical">
          <!-- STEP 0: Account & Persona -->
          @if (currentStep() === 0) {
            <div formGroupName="account" class="step">
              <div class="field">
                <label for="firstName">First name *</label>
                <input id="firstName" type="text" formControlName="firstName" autocomplete="given-name"/>
                @if (showError('account.firstName')) {
                  <small class="error">Required field</small>
                }
              </div>
              <div class="field">
                <label for="lastName">Last name *</label>
                <input id="lastName" type="text" formControlName="lastName" autocomplete="family-name"/>
                @if (showError('account.lastName')) {
                  <small class="error">Required field</small>
                }
              </div>
              <div class="field">
                <label for="email">Email *</label>
                <input id="email" type="email" formControlName="email" autocomplete="email"/>
                @if (showError('account.email')) {
                  <small class="error">Invalid email</small>
                }
              </div>
              <div class="field">
                <label for="gender">Gender *</label>
                <select id="gender" formControlName="gender">
                  <option value="">Select…</option>
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                  <option value="OTHER">Other</option>
                </select>
                @if (showError('account.gender')) {
                  <small class="error">Required</small>
                }
              </div>
              <div class="field">
                <label for="birthDate">Birth date *</label>
                <input id="birthDate" type="date" formControlName="birthDate"/>
                @if (showError('account.birthDate')) {
                  <small class="error">Required</small>
                }
              </div>
            </div>
          }

          <!-- STEP 1: Anagrafica -->
          @if (currentStep() === 1) {
            <div formGroupName="profile" class="step">
              <div class="field">
                <label for="phoneNumber">Phone *</label>
                <input id="phoneNumber" type="tel" formControlName="phoneNumber" autocomplete="tel"/>
                @if (showError('profile.phoneNumber')) {
                  <small class="error">Required</small>
                }
              </div>
              <div class="field">
                <label for="country">Country *</label>
                <input id="country" type="text" formControlName="country" maxlength="2" placeholder="e.g. IT"/>
                @if (showError('profile.country')) {
                  <small class="error">Required</small>
                }
              </div>
              <div class="field">
                <label for="city">City *</label>
                <input id="city" type="text" formControlName="city"/>
                @if (showError('profile.city')) {
                  <small class="error">Required</small>
                }
              </div>
              <div class="field">
                <label for="address">Address *</label>
                <input id="address" type="text" formControlName="address"/>
                @if (showError('profile.address')) {
                  <small class="error">Required</small>
                }
              </div>
            </div>
          }

          <!-- STEP 2: Branch, Role & Password -->
          @if (currentStep() === 2) {
            <div formGroupName="access" class="step">
              <div class="field">
                <label for="role">Role *</label>
                <select id="role" formControlName="role">
                  <option value="customer">Customer</option>
                  <option value="advisor">Advisor</option>
                </select>
                @if (showError('access.role')) {
                  <small class="error">Select a role</small>
                }
              </div>
              <div class="field">
                <label>Bank Branch *</label>
                <div class="selector-input" (click)="openBranchPicker()" [class.placeholder]="!selectedBranch()">
                  {{ selectedBranch()?.branchName || 'Select a bank branch' }}
                </div>
                @if (stepSubmitted() && !selectedBranch()) {
                  <small class="error">Bank branch is required</small>
                }
                <input type="hidden" formControlName="bankBranchCode"/>
              </div>
              <div formGroupName="passwords" class="password-group">
                <app-password-strength-field [group]="passwords"
                                             [submitted]="stepSubmitted()"></app-password-strength-field>
              </div>
            </div>
          }

          <div class="actions-row">
            <button type="button" class="button-secondary actions-row__back"
                    (click)="prevStep()" [disabled]="currentStep()===0 || loading()">Back
            </button>
            <button class="primary btn--lg register-submit actions-row__next"
                    type="submit" [disabled]="loading()">
              {{ loading() ? (currentStep() === finalStep ? 'Signing up…' : 'Please wait…') : (currentStep() === finalStep ? 'Create account' : 'Next') }}
            </button>
          </div>
          @if (error()) {
            <p class="form-error">{{ error() }}</p>
          }
        </form>

        <p class="signin-hint">Already have an account? <a routerLink="/auth/sign-in">Sign in</a></p>
      </div>

      <!-- Branch picker modal reused -->
      @if (branchPickerOpen() && currentStep() === 2) {
        <div class="branch-picker-overlay" (keydown.escape)="closeBranchPicker()" tabindex="-1">
          <div class="branch-picker" role="dialog" aria-modal="true" aria-labelledby="branchPickerTitle">
            <header>
              <h2 id="branchPickerTitle">Select bank branch</h2>
              <button type="button" class="button-secondary" (click)="closeBranchPicker()">Close</button>
            </header>
            <div class="filters">
              <div class="field">
                <label>Country</label>
                <input type="text" [formControl]="branchFilters.controls.countryCode" placeholder="e.g. US"
                       maxlength="2"/>
              </div>
              <div class="field">
                <label>Bank name</label>
                <input type="text" [formControl]="branchFilters.controls.bankName" placeholder="Partial name"/>
              </div>
              <div class="field">
                <label>Branch city</label>
                <input type="text" [formControl]="branchFilters.controls.branchCity" placeholder="City"/>
              </div>
              <div class="field">
                <label>Zip code</label>
                <input type="text" [formControl]="branchFilters.controls.zipCode" placeholder="Zip"/>
              </div>
              <div class="field">
                <label>Branch code</label>
                <input type="text" [formControl]="branchFilters.controls.branchCode" placeholder="Code"/>
              </div>
              <div class="field">
                <label>SWIFT / Bank code</label>
                <input type="text" [formControl]="branchFilters.controls.bankCode" placeholder="Bank code"/>
              </div>
            </div>
            <div class="results" role="listbox" aria-label="Bank branches results">
              @if (branchesLoading()) {
                <div class="loading-block">
                  <div class="spinner" aria-label="Loading"></div>
                </div>
              } @else {
                @if (branchLoadError()) {
                  <div class="error-banner">
                    <span>{{ branchLoadError() }}</span>
                    <button type="button" class="button-secondary retry" (click)="retryLoadBranches()"
                            [disabled]="branchesLoading()">Retry
                    </button>
                  </div>
                }
                @if (branches().length === 0 && !branchLoadError()) {
                  <div class="empty">No branches found</div>
                } @else {
                  @for (b of branches(); track b.branchCode) {
                    <div class="result-row" role="option"
                         [attr.aria-selected]="b.branchCode === tentativeSelection()?.branchCode"
                         (click)="selectTentative(b)"
                         [class.active]="b.branchCode === tentativeSelection()?.branchCode">
                      <div>
                        <strong>{{ b.branchName }}</strong><br>
                        <span>{{ b.bankName || b.bankCode }} • {{ b.countryCode }} • {{ b.branchCity }}</span>
                      </div>
                      <span>{{ b.branchCode }}</span>
                    </div>
                  }
                }
              }
            </div>
            <footer>
              <div class="pagination">
                <button type="button" class="pager-btn pager-btn--prev" (click)="prevPage()"
                        [disabled]="branchesPage() === 0 || branchesLoading()">Prev
                </button>
                <span style="font-size:0.7rem; opacity:.8;">Page {{ branchesPage() + 1 }}
                  / {{ branchesTotalPages() || 1 }}</span>
                <button type="button" class="pager-btn pager-btn--next" (click)="nextPage()"
                        [disabled]="(branchesPage()+1) >= (branchesTotalPages()||1) || branchesLoading()">Next
                </button>
              </div>
              <div class="actions">
                <button type="button" class="button-secondary" (click)="resetFilters()" [disabled]="branchesLoading()">
                  Reset
                </button>
                <button type="button" (click)="confirmBranchSelection()" [disabled]="!tentativeSelection()">Confirm
                </button>
              </div>
            </footer>
          </div>
        </div>
      }
    </section>
  `,
  styles: [`
    /* existing styles ... */
    .narrow-form {
      max-width: 520px;
      margin-inline: auto;
    }

    .wm-form.vertical .field {
      display: flex;
      flex-direction: column;
    }

    .wm-form.vertical .field + .field {
      margin-top: .6rem;
    }

    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0 0 0 0);
      white-space: nowrap;
      border: 0;
    }

    .actions-row {
      display: flex;
      width: 100%;
      align-items: center;
      margin-top: .9rem;
    }

    .actions-row__back {
      margin-right: auto;
    }

    .actions-row__next {
      margin-left: auto;
    }

    .password-group {
      margin-top: 1.25rem;
    }

    @media (min-width: 520px) {
      .linear-progress__labels span {
        font-size: .6rem;
      }
      .linear-progress__meta {
        font-size: .6rem;
      }
    }
  `]
})
export class OnboardingStartComponent {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly userService = inject(UserService);
  private readonly auth = inject(AuthService);
  private readonly bankService = inject(BankService);
  private readonly registrationState = inject(RegistrationStateService);

  // State
  currentStep = signal(0);
  finalStep = 2; // last step index
  readonly stepLabels = ['Account', 'Personal Info', 'Bank & Access'];
  stepSubmitted = signal(false);

  loading = signal(false);
  error = signal<string | null>(null);

  branchPickerOpen = signal(false);
  branchesLoading = signal(false);
  branches = signal<BankBranchDto[]>([]);
  branchesPage = signal(0);
  branchesTotalPages = signal(0);
  tentativeSelection = signal<BankBranchDto | null>(null);
  selectedBranch = signal<BankBranchDto | null>(null);
  branchLoadError = signal<string | null>(null);

  branchFilters = this.fb.group({
    bankCode: [''], bankName: [''], branchCode: [''], countryCode: [''], branchCity: [''], zipCode: ['']
  });

  form = this.fb.group({
    account: this.fb.group({
      firstName: this.fb.control('', {validators: [Validators.required]}),
      lastName: this.fb.control('', {validators: [Validators.required]}),
      email: this.fb.control('', {validators: [Validators.required, Validators.email]}),
      gender: this.fb.control('', {validators: [Validators.required]}),
      birthDate: this.fb.control('', {validators: [Validators.required]})
    }),
    profile: this.fb.group({
      phoneNumber: this.fb.control('', {validators: [Validators.required]}),
      country: this.fb.control('', {validators: [Validators.required]}),
      city: this.fb.control('', {validators: [Validators.required]}),
      address: this.fb.control('', {validators: [Validators.required]})
    }),
    access: this.fb.group({
      role: this.fb.control<'customer' | 'advisor'>('customer', {validators: [Validators.required]}),
      bankBranchCode: this.fb.control('', {validators: [Validators.required]}),
      passwords: this.fb.group({
        password: this.fb.control('', {validators: [Validators.required, Validators.minLength(8), passwordComplexity]}),
        confirmPassword: this.fb.control('', {validators: [Validators.required]})
      }, {validators: [matchPassword]})
    })
  });

  passwords: FormGroup = this.form.get('access.passwords') as FormGroup;

  // validation step checks
  private readonly stepControlPaths: string[][] = [
    ['account.firstName', 'account.lastName', 'account.email', 'account.gender', 'account.birthDate'],
    ['profile.phoneNumber', 'profile.country', 'profile.city', 'profile.address'],
    ['access.role', 'access.bankBranchCode', 'access.passwords.password', 'access.passwords.confirmPassword']
  ];

  constructor() {
    // React to filter changes
    this.branchFilters.valueChanges.pipe(debounceTime(350)).subscribe(() => {
      this.branchesPage.set(0);
      if (this.branchPickerOpen() && this.currentStep() === 2) this.loadBranches();
    });
    // React to page changes
    effect(() => {
      this.branchesPage();
      if (this.branchPickerOpen() && this.currentStep() === 2) this.loadBranches();
    });
  }

  // UI helpers
  showError(path: string): boolean {
    const ctrl = this.form.get(path);
    return !!ctrl && ctrl.invalid && (ctrl.touched || this.stepSubmitted());
  }

  private validateCurrentStep(): boolean {
    const idx = this.currentStep();
    const paths = this.stepControlPaths[idx];
    let valid = true;
    for (const p of paths) {
      const c = this.form.get(p);
      if (c) {
        if (c.invalid) valid = false;
        c.markAsTouched();
        c.updateValueAndValidity({onlySelf: true});
      }
    }
    if (idx === 2 && !this.selectedBranch()) valid = false;
    return valid;
  }

  prevStep() {
    if (this.currentStep() > 0) {
      this.currentStep.set(this.currentStep() - 1);
      this.stepSubmitted.set(false);
    }
  }

  goToStep(i: number) {
    if (i < 0) return;
    // only turn back (no moving forward)
    if (i < this.currentStep()) {
      this.currentStep.set(i);
      this.stepSubmitted.set(false);
    }
  }

  openBranchPicker() {
    if (this.currentStep() !== 2) return;
    this.branchPickerOpen.set(true);
    this.tentativeSelection.set(this.selectedBranch());
    if (this.branches().length === 0) this.loadBranches();
  }

  closeBranchPicker() {
    this.branchPickerOpen.set(false);
  }

  resetFilters() {
    this.branchFilters.reset({
      bankCode: '',
      bankName: '',
      branchCode: '',
      countryCode: '',
      branchCity: '',
      zipCode: ''
    });
    this.branchesPage.set(0);
    this.loadBranches();
  }

  selectTentative(b: BankBranchDto) {
    this.tentativeSelection.set(b);
  }

  confirmBranchSelection() {
    const sel = this.tentativeSelection();
    if (sel) {
      this.selectedBranch.set(sel);
      const ctrl = this.form.get('access.bankBranchCode');
      ctrl?.setValue(sel.branchCode || '');
    }
    this.closeBranchPicker();
  }

  prevPage() {
    if (this.branchesPage() > 0) this.branchesPage.set(this.branchesPage() - 1);
  }

  nextPage() {
    if ((this.branchesPage() + 1) < (this.branchesTotalPages() || 1)) this.branchesPage.set(this.branchesPage() + 1);
  }

  private loadBranches() {
    if (!this.branchPickerOpen() || this.currentStep() !== 2) return;
    this.branchesLoading.set(true);
    this.branchLoadError.set(null);
    const f = this.branchFilters.value;
    this.bankService.getBankBranches({page: this.branchesPage(), size: 10},
      f.bankCode || undefined, f.bankName || undefined, f.branchCode || undefined, undefined,
      f.countryCode || undefined, undefined, f.branchCity || undefined, f.zipCode || undefined)
      .pipe(finalize(() => this.branchesLoading.set(false)))
      .subscribe({
        next: (page: PageBankBranchDto) => {
          this.branches.set(page.content || []);
          const total = (page as any).totalPages || (page as any).page?.totalPages || 1;
          this.branchesTotalPages.set(total);
        },
        error: err => {
          console.error('Failed to load branches', err);
          this.branches.set([]);
          this.branchesTotalPages.set(1);
          this.branchLoadError.set('Failed to load branches. Please retry.');
        }
      });
  }

  retryLoadBranches() {
    this.loadBranches();
  }

  onSubmit() {
    this.error.set(null);
    this.stepSubmitted.set(true);

    // Se non siamo all'ultimo step, proviamo ad avanzare
    if (this.currentStep() < this.finalStep) {
      if (!this.validateCurrentStep()) return;
      this.currentStep.set(this.currentStep() + 1);
      this.stepSubmitted.set(false);
      return;
    }

    // Ultimo step: validazione totale
    if (!this.validateCurrentStep()) return;

    if (this.form.invalid || !this.selectedBranch()) return;

    const acc = this.form.value.account as any;
    const prof = this.form.value.profile as any;
    const access = this.form.value.access as any;

    const firstName = acc.firstName?.trim() || '';
    const lastName = acc.lastName?.trim() || '';
    const email = acc.email?.trim() || '';
    const gender = acc.gender || '';
    const birthDate = acc.birthDate || '';

    const phoneNumber = prof.phoneNumber?.trim() || '';
    const country = prof.country?.trim() || '';
    const city = prof.city?.trim() || '';
    const address = prof.address?.trim() || '';

    const role = access.role || 'customer';
    const branch = this.selectedBranch();
    if (!branch) return;

    const mappedRole = role === 'advisor' ? 'ADVISOR' : 'CUSTOMER';
    const userBranchRoles: UserBranchRoleDTO[] = [{bankCode: branch.bankCode, role: mappedRole}];

    const payload: UserDTO = {
      firstName,
      lastName,
      email,
      gender,
      birthDate,
      phoneNumber,
      country,
      city,
      address,
      userBranchRoles
    };

    this.loading.set(true);
    this.userService.createUser(payload).subscribe({
      next: () => {
        this.auth.setUsername(email);
        this.registrationState.setEmail(email);
        void this.router.navigate(['auth/registration-success']).catch(() => {
        });
      },
      error: (err) => {
        console.error(err);
        this.error.set('Sign up failed. Please try again later.');
        this.loading.set(false);
      },
      complete: () => this.loading.set(false)
    });
  }
}
