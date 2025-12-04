import {Component, inject, signal} from '@angular/core';
import {CommonModule} from '@angular/common';
import {OnboardingStep, OnboardingProgressService} from '../../core/services/onboarding-progress.service';
import {OnboardingStepShellComponent} from '../../shared/components/onboarding-step-shell/onboarding-step-shell.component';
import {Router, RouterModule} from '@angular/router';
import {AuthService} from '../../core/services/auth.service';
import {ToastService} from '../../shared/services/toast.service';
import {FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';
import {OnboardingFormStateService} from '../../core/services/onboarding-form-state.service';
import {FinancialInformationService, FinancialExpenseFormValue} from '../../core/services/financial-information.service';
import {FinancialTypeDTO} from '../../api/customer-service';
import {UserSessionService} from '../../core/services/user-session.service';
import {CustomerSessionService} from '../../core/services/customer-session.service';
import {firstValueFrom} from 'rxjs';

@Component({
  selector: 'app-onboarding-financial-information',
  standalone: true,
  imports: [CommonModule, OnboardingStepShellComponent, ReactiveFormsModule, RouterModule],
  template: `
    <app-onboarding-step-shell
      [stepIndex]="step"
      title="Financial information"
      subtitle="Please provide your financial details to help us tailor investment strategies that match your needs."
    >
      <form class="wm-form" [formGroup]="form" (ngSubmit)="onSubmit()" novalidate>
        <div class="form-grid form-grid--max2">
          <div class="field field--compact required">
            <label for="annualIncomeEur">Annual income (EUR)</label>
            <div class="money-input">
              <input id="annualIncomeEur" type="number" formControlName="annualIncomeEur" min="0" step="0.01" />
              <span class="currency-suffix">EUR</span>
            </div>
            @if (showError('annualIncomeEur')) {
              <small class="error--inline">Annual income is required</small>
            }
          </div>
          <div class="field field--compact">
            <label for="totalInvestmentsEur">Investments (EUR)</label>
            <div class="money-input">
              <input id="totalInvestmentsEur" type="number" formControlName="totalInvestmentsEur" min="0" step="0.01" />
              <span class="currency-suffix">EUR</span>
            </div>
          </div>
        </div>

        <div class="expenses-block">
          <div class="expenses-header">
            <h3>Expenses</h3>
            <button type="button" class="secondary" (click)="addExpense()">Add expense</button>
          </div>
          @if (expensesControls.length > 0) {
            <div class="expenses-table">
              <div class="expenses-row expenses-row--header">
                <div>Type</div>
                <div>Amount (EUR)</div>
                <div>Description</div>
                <div></div>
              </div>
              @for (group of expensesControls; track $index; let i = $index) {
                <div class="expenses-row" [formGroup]="group">
                  <div>
                    <select formControlName="typeCode">
                      <option [ngValue]="null">Select type</option>
                      @for (t of financialTypes(); track t.name) {
                        <option [value]="t.name">{{ t.name }}</option>
                      }
                    </select>
                  </div>
                  <div>
                    <div class="money-input">
                      <input type="number" formControlName="amountEur" min="0" step="0.01" />
                      <span class="currency-suffix">EUR</span>
                    </div>
                  </div>
                  <div>
                    <input type="text" formControlName="description" />
                  </div>
                  <div class="expenses-actions">
                    <button type="button" class="link" (click)="removeExpense(i)">Remove</button>
                  </div>
                </div>
              }
            </div>
          }
        </div>

        <div class="field field--compact field--full terms-field">
          <label>
            <input type="checkbox" formControlName="termsAccepted" />
            <span>
              I accept the <a routerLink="/terms" target="_blank" rel="noopener">terms of service</a>.
            </span>
          </label>
          @if (showError('termsAccepted')) {
            <small class="error--inline">You must accept the terms to continue.</small>
          }
        </div>

        <div class="form-actions">
          <button class="primary" type="submit" [disabled]="loading() || form.invalid">
            {{ loading() ? 'Saving...' : 'Save & continue' }}
          </button>
        </div>
        @if (errorMsg()) {
          <p class="form-error-global">{{ errorMsg() }}</p>
        }
      </form>
    </app-onboarding-step-shell>
  `,
  styles: [
    `:host ::ng-deep .field.required > label::after {
      content: ' *';
      color: var(--color-danger);
    }

    .money-input {
      display: flex;
      align-items: center;
      gap: .25rem;
    }

    .money-input input {
      flex: 1;
    }

    .currency-suffix {
      font-size: .85rem;
      color: var(--color-text-muted);
    }

    .expenses-block {
      margin-top: 1.5rem;
    }

    .expenses-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: .5rem;
    }

    .expenses-table {
      border: 1px solid var(--color-border);
      border-radius: var(--radius);
    }

    .expenses-row {
      display: grid;
      grid-template-columns: 2fr 1.5fr 3fr auto;
      gap: .5rem;
      padding: .5rem;
      align-items: center;
    }

    .expenses-row--header {
      background: var(--color-surface-alt);
      font-weight: 600;
      font-size: .85rem;
    }

    .expenses-row + .expenses-row {
      border-top: 1px solid var(--color-border-subtle);
    }

    .expenses-actions {
      text-align: right;
    }

    .expenses-actions .link {
      background: none;
      border: none;
      padding: 0;
      color: var(--color-primary);
      cursor: pointer;
      font-size: .85rem;
    }

    .terms-field {
      margin-top: 1.5rem;
    }

    .terms-field label {
      display: flex;
      align-items: center;
      gap: .5rem;
      cursor: pointer;
    }

    .terms-field a {
      color: var(--color-primary);
      text-decoration: underline;
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
export class FinancialInformationComponent {
  step = OnboardingStep.FinancialInformation;
  private readonly progress = inject(OnboardingProgressService);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(FormBuilder);
  private readonly formState = inject(OnboardingFormStateService);
  private readonly financialService = inject(FinancialInformationService);
  private readonly userSession = inject(UserSessionService);
  private readonly customerSession = inject(CustomerSessionService);

  loading = signal(false);
  errorMsg = signal<string | null>(null);
  financialTypes = signal<FinancialTypeDTO[]>([]);

  form: FormGroup = this.fb.group({
    annualIncomeEur: this.fb.control<number | null>(null, {validators: [Validators.required]}),
    totalInvestmentsEur: this.fb.control<number | null>(null),
    expenses: this.fb.array<FormGroup>([]),
    termsAccepted: this.fb.control<boolean>(false, {validators: [Validators.requiredTrue]})
  });

  constructor() {
    const saved = this.formState.load('financial-information');
    if (saved) {
      this.form.patchValue({
        annualIncomeEur: saved.annualIncomeEur ?? null,
        totalInvestmentsEur: saved.totalInvestmentsEur ?? null,
        termsAccepted: !!saved.termsAccepted
      });
      if (Array.isArray(saved.expenses)) {
        saved.expenses.forEach((e: any) => {
          this.expenses.push(this.createExpenseGroup(e.typeCode ?? null, e.amountEur ?? null, e.description ?? null));
        });
      }
    }

    this.form.valueChanges.subscribe(v => this.formState.save('financial-information', v));

    this.loadFinancialTypes();
  }

  get expenses(): FormArray<FormGroup> {
    return this.form.get('expenses') as FormArray<FormGroup>;
  }

  get expensesControls(): FormGroup[] {
    return this.expenses.controls;
  }

  private createExpenseGroup(typeCode: string | null = null, amountEur: number | null = null, description: string | null = null): FormGroup {
    return this.fb.group({
      typeCode: this.fb.control<string | null>(typeCode),
      amountEur: this.fb.control<number | null>(amountEur),
      description: this.fb.control<string | null>(description)
    });
  }

  addExpense() {
    this.expenses.push(this.createExpenseGroup());
  }

  removeExpense(index: number) {
    if (index >= 0 && index < this.expenses.length) {
      this.expenses.removeAt(index);
    }
  }

  showError(controlName: string): boolean {
    const c = this.form.get(controlName);
    return !!c && c.touched && c.invalid;
  }

  private async loadFinancialTypes() {
    try {
      this.loading.set(true);
      const types = await firstValueFrom(this.financialService.getFinancialTypes());
      this.financialTypes.set(types || []);
    } catch {
      this.toast.error('Could not load financial types. Please try again.');
    } finally {
      this.loading.set(false);
    }
  }

  async onSubmit() {
    this.errorMsg.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue() as {
      annualIncomeEur: number | null;
      totalInvestmentsEur: number | null;
      expenses: { typeCode: string | null; amountEur: number | null; description: string | null; }[];
      termsAccepted: boolean;
    };

    if (raw.annualIncomeEur == null) {
      this.errorMsg.set('Annual income is required.');
      return;
    }

    // Use the selected customer from CustomerSessionService as the source of customerId
    const customer = this.customerSession.customer();
    const customerId = customer?.id;
    if (!customerId) {
      this.errorMsg.set('Customer information not available. Please try again later.');
      return;
    }

    const expensesForm: FinancialExpenseFormValue[] = (raw.expenses || []).map(e => ({
      financialTypeName: e.typeCode || null,
      amount: e.amountEur,
      description: e.description
    }));

    const payload = this.financialService.buildCustomerFinancialPayload(
      raw.annualIncomeEur,
      raw.totalInvestmentsEur,
      expensesForm
    );

    this.loading.set(true);
    try {
      await firstValueFrom(this.financialService.addCustomerFinancials(customerId, payload));
      this.progress.completeStep(this.step);
      this.toast.success('Financial information saved.');
      const next = this.step + 1;
      const path = this.progress.pathFor(next as OnboardingStep);
      await this.router.navigateByUrl(path);
    } catch {
      this.errorMsg.set('Could not save financial information. Please try again.');
    } finally {
      this.loading.set(false);
    }
  }

  onPrev() {
    const prev = this.step - 1;
    const path = this.progress.pathFor(prev as OnboardingStep);
    this.router.navigateByUrl(path).catch(() => {
    });
  }

  onNext() {
    const next = this.step + 1;
    const path = this.progress.pathFor(next as OnboardingStep);
    this.router.navigateByUrl(path).catch(() => {
    });
  }

  async onLogout() {
    try {
      await this.auth.logout();
    } finally {
      this.toast.info('You have been logged out.');
      this.progress.reset();
      this.router.navigateByUrl('/auth/sign-in').catch(() => {
      });
    }
  }
}
