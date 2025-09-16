import {Component, inject, signal, computed, effect} from '@angular/core';
import {Router, RouterLink} from '@angular/router';
import {OnboardingProgressService} from '../../core/services/onboarding-progress.service';
import {CommonModule} from '@angular/common';
import {FormBuilder, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors} from '@angular/forms';
import {UserService} from '../../api/user-service';
import {AuthService} from '../../core/services/auth.service';
import {BankService, BankBranchDto, PageBankBranchDto} from '../../api/bank-service';
import {debounceTime} from 'rxjs';

// Validator for matching passwords
function matchPassword(group: AbstractControl): ValidationErrors | null {
  const pwd = group.get('password')?.value;
  const rep = group.get('confirmPassword')?.value;
  if (!pwd || !rep) return null;
  return pwd === rep ? null : {passwordMismatch: true};
}

@Component({
  selector: 'app-onboarding-start',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <section class="auth-shell">
      <div class="card form-card form-card--md">
        <a routerLink="/" class="back-link" aria-label="Back to home">&larr; home</a>
        <header class="headline">
          <h1 class="greeting">Welcome</h1>
          <p class="subtitle">Create your account to get started</p>
        </header>

        <form [formGroup]="form" (ngSubmit)="onSubmit()" novalidate class="wm-form">
          <div class="two-cols">
            <div class="field">
              <label for="firstName">First name *</label>
              <input id="firstName" type="text" formControlName="firstName" autocomplete="given-name"/>
              @if (submitted() && form.controls.firstName.invalid) {
                <small class="error">Required field</small>
              }
            </div>
            <div class="field">
              <label for="lastName">Last name *</label>
              <input id="lastName" type="text" formControlName="lastName" autocomplete="family-name"/>
              @if (submitted() && form.controls.lastName.invalid) {
                <small class="error">Required field</small>
              }
            </div>
          </div>

          <div class="field">
            <label for="email">Email *</label>
            <input id="email" type="email" formControlName="email" autocomplete="email"/>
            @if (submitted() && form.controls.email.invalid) {
              <small class="error">Invalid email</small>
            }
          </div>

          <div class="field">
            <label for="role">Role *</label>
            <select id="role" formControlName="role">
              <option value="customer">Customer</option>
              <option value="advisor">Advisor</option>
            </select>
            @if (submitted() && form.controls.role.invalid) {
              <small class="error">Select a role</small>
            }
          </div>

          @if (showCompanyId()) {
            <div class="field">
              <label for="companyId">Company ID *</label>
              <input id="companyId" type="text" formControlName="companyId" placeholder="Company UUID"/>
              <small class="hint">Required for advisor role</small>
              @if (submitted() && form.controls.companyId.invalid) {
                <small class="error">Required for advisor</small>
              }
            </div>
          }

          <div class="field">
            <label>Bank Branch *</label>
            <div class="selector-input" (click)="openBranchPicker()" [class.placeholder]="!selectedBranch()">
              {{ selectedBranch()?.branchName || 'Select a bank branch' }}
            </div>
            @if (submitted() && !selectedBranch()) {
              <small class="error">Bank branch is required</small>
            }
          </div>

          <div formGroupName="passwords" class="two-cols">
            <div class="field">
              <label for="password">Password *</label>
              <input id="password" type="password" formControlName="password" autocomplete="new-password"/>
              @if (submitted() && passwords.controls.password.invalid) {
                <small class="error">Minimum 8 characters</small>
              }
            </div>
            <div class="field">
              <label for="confirmPassword">Confirm *</label>
              <input id="confirmPassword" type="password" formControlName="confirmPassword"
                     autocomplete="new-password"/>
              @if (submitted() && passwords.errors?.passwordMismatch) {
                <small class="error">Passwords do not match</small>
              }
            </div>
          </div>

          <button class="primary btn--lg register-submit" type="submit"
                  [disabled]="loading()">{{ loading() ? 'Signing up…' : 'Create account' }}
          </button>
          @if (error()) {
            <p class="form-error">{{ error() }}</p>
          }
        </form>

        <p class="signin-hint">Already have an account? <a routerLink="/auth/sign-in">Sign in</a></p>
      </div>

      @if (branchPickerOpen()) {
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
                @if (branches().length === 0) {
                  <div class="empty">No branches found</div>
                } @else {
                  @for (b of branches(); track b.branchCode) {
                    <div class="result-row" role="option"
                         [attr.aria-selected]="b.branchCode === tentativeSelection()?.branchCode"
                         (click)="selectTentative(b)" [class.active]="b.branchCode === tentativeSelection()?.branchCode">
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
                <button type="button" class="button-secondary" (click)="prevPage()"
                        [disabled]="branchesPage() === 0 || branchesLoading()">Prev
                </button>
                <span style="font-size:0.7rem; opacity:.8;">Page {{ branchesPage() + 1 }}
                  / {{ branchesTotalPages() || 1 }}</span>
                <button type="button" class="button-secondary" (click)="nextPage()"
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
    /* Component-specific minor tweaks */
    .form-error {
      margin: 0;
      font-size: 0.7rem;
      color: var(--color-danger, #c0392b);
    }

    .register-submit {
      margin-top: 0.4rem;
    }

    .loading-block {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1.25rem;
    }

    .spinner {
      width: 28px;
      height: 28px;
      border: 3px solid var(--color-border);
      border-top-color: var(--color-primary);
      border-radius: 50%;
      animation: spin .7s linear infinite;
    }

    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }

    .error-banner {
      display: flex;
      align-items: center;
      gap: .75rem;
      padding: .6rem .75rem;
      background: #ffecec;
      border: 1px solid #f5b5b5;
      color: #b30000;
      font-size: .7rem;
    }

    .error-banner .retry {
      height: 30px;
      font-size: .65rem;
    }
  `]
})
export class OnboardingStartComponent {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly userService = inject(UserService);
  private readonly auth = inject(AuthService);
  private readonly progress: OnboardingProgressService = inject(OnboardingProgressService);
  private readonly bankService = inject(BankService);

  loading = signal(false);
  error = signal<string | null>(null);
  submitted = signal(false);

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
    firstName: this.fb.control('', {validators: [Validators.required]}),
    lastName: this.fb.control('', {validators: [Validators.required]}),
    email: this.fb.control('', {validators: [Validators.required, Validators.email]}),
    role: this.fb.control<'customer' | 'advisor'>('customer', {validators: [Validators.required]}),
    companyId: this.fb.control('', {validators: []}),
    bankBranchCode: this.fb.control('', {validators: [Validators.required]}),
    passwords: this.fb.group({
      password: this.fb.control('', {validators: [Validators.required, Validators.minLength(8)]}),
      confirmPassword: this.fb.control('', {validators: [Validators.required]})
    }, {validators: [matchPassword]})
  });

  passwords = this.form.controls.passwords as any;

  showCompanyId = computed(() => this.form.controls.role.value === 'advisor');

  constructor() {
    // React to filter changes with debounce
    this.branchFilters.valueChanges.pipe(debounceTime(350)).subscribe(() => {
      this.branchesPage.set(0); // reset to first page when filters change
      if (this.branchPickerOpen()) this.loadBranches();
    });
    // React to page changes
    effect(() => {
      this.branchesPage();
      if (this.branchPickerOpen()) this.loadBranches();
    });
  }

  openBranchPicker() {
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
      this.form.controls.bankBranchCode.setValue(sel.branchCode || '');
    }
    this.closeBranchPicker();
  }

  prevPage() {
    if (this.branchesPage() > 0) {
      this.branchesPage.set(this.branchesPage() - 1);
    }
  }

  nextPage() {
    if ((this.branchesPage() + 1) < (this.branchesTotalPages() || 1)) {
      this.branchesPage.set(this.branchesPage() + 1);
    }
  }

  private loadBranches() {
    if (!this.branchPickerOpen()) return; // only load when picker visible
    this.branchesLoading.set(true);
    this.branchLoadError.set(null);
    const f = this.branchFilters.value;
    this.bankService.getBankBranches({
      page: this.branchesPage(),
      size: 10
    }, f.bankCode || undefined, f.bankName || undefined, f.branchCode || undefined, undefined, f.countryCode || undefined, undefined, f.branchCity || undefined, f.zipCode || undefined)
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
          this.branchLoadError.set('Errore nel caricamento delle filiali. Riprova.');
        },
        complete: () => this.branchesLoading.set(false)
      });
  }

  retryLoadBranches() {
    this.loadBranches();
  }

  private buildUsername(first: string, last: string): string {
    const base = `${first}.${last}`.toLowerCase().replace(/\s+/g, '.');
    return base.replace(/[^a-z0-9._-]/g, '');
  }

  onSubmit() {
    this.submitted.set(true);
    this.error.set(null);
    if (this.form.invalid || !this.selectedBranch()) return;

    const v = this.form.value;
    const first = v.firstName?.trim() || '';
    const last = v.lastName?.trim() || '';
    const email = v.email?.trim() || '';
    const role = v.role || 'customer';
    const companyId = this.showCompanyId() ? (v.companyId?.trim() || '') : 'public-company';

    if (this.showCompanyId() && !companyId) {
      this.error.set('Company ID required for advisor role');
      return;
    }

    const username = this.buildUsername(first, last);
    const mappedRole = role === 'advisor' ? 'ADVISOR' : 'CUSTOMER';

    this.loading.set(true);
    this.userService.createUser({
      username,
      email,
      companyId,
      roles: [mappedRole]
      // future: include branch selection when backend supports it
    }).subscribe({
      next: () => {
        this.auth.setUsername(username);
        const target = this.progress.pathFor(0 as any);
        void this.router.navigateByUrl(target).catch(() => {
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
