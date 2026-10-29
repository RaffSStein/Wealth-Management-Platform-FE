import {Component, computed, inject, signal} from '@angular/core';
import {toSignal} from '@angular/core/rxjs-interop';
import {DecimalPipe} from '@angular/common';
import {Router, RouterLink} from '@angular/router';
import {FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';
import {firstValueFrom} from 'rxjs';
import {Button, ButtonDirective, ButtonIcon, ButtonLabel} from 'primeng/button';
import {Checkbox} from 'primeng/checkbox';
import {InputNumber} from 'primeng/inputnumber';
import {InputText} from 'primeng/inputtext';
import {Message} from 'primeng/message';
import {Select} from 'primeng/select';
import {OnboardingProgressService, OnboardingStep} from '../../core/services/onboarding-progress.service';
import {ToastService} from '../../shared/services/toast.service';
import {OnboardingFormStateService} from '../../core/services/onboarding-form-state.service';
import {FinancialExpenseFormValue, FinancialInformationService} from '../../core/services/financial-information.service';
import {FinancialTypeDTO} from '../../api/customer-service';
import {CustomerSessionService} from '../../core/services/customer-session.service';
import {busyAction} from '../../core/services/busy-action';
import {OnboardingLayoutComponent} from '../../shared/components/onboarding-layout/onboarding-layout.component';

interface FinancialFormValue {
  annualIncomeEur: number | null;
  totalInvestmentsEur: number | null;
  expenses: { typeCode: string | null; amountEur: number | null; description: string | null }[];
  termsAccepted: boolean;
}

@Component({
  selector: 'app-onboarding-financial-information',
  imports: [ReactiveFormsModule, RouterLink, DecimalPipe, OnboardingLayoutComponent, Button, ButtonDirective, ButtonIcon, Checkbox, InputNumber, InputText, Message, Select, ButtonLabel],
  template: `
    <app-onboarding-layout [step]="step" title="Financial information"
                           subtitle="Required under MiFID II to assess which investments are suitable. Your data stays confidential.">
      <form id="financial-form" class="wmp-form" [formGroup]="form" (ngSubmit)="onSubmit()" novalidate>
        <section class="wmp-panel">
          <h2 class="wmp-panel__title">Income &amp; assets</h2>
          <div class="wmp-form-grid">
            <div class="wmp-field">
              <label for="annualIncomeEur">Annual net income<span class="wmp-req" aria-hidden="true">*</span></label>
              <p-inputnumber inputId="annualIncomeEur" formControlName="annualIncomeEur" mode="currency" currency="EUR"
                             locale="en-IE" [min]="0" [fluid]="true"/>
              @if (showError('annualIncomeEur')) { <small class="wmp-field__error">Enter the annual net income.</small> }
            </div>
            <div class="wmp-field">
              <label for="totalInvestmentsEur">Current investments</label>
              <p-inputnumber inputId="totalInvestmentsEur" formControlName="totalInvestmentsEur" mode="currency" currency="EUR"
                             locale="en-IE" [min]="0" [fluid]="true"/>
              <small class="wmp-field__hint">Total value of securities, funds and deposits you hold today.</small>
            </div>
          </div>
        </section>

        <section class="wmp-panel">
          <div class="panel-head">
            <h2 class="wmp-panel__title">Expenses</h2>
            <p-button label="Add expense" severity="secondary" [outlined]="true" size="small" (onClick)="addExpense()"/>
          </div>
          @if (expensesControls.length === 0) {
            <p class="empty">No expenses added. Add recurring commitments such as rent, mortgage or loans.</p>
          } @else {
            <div class="rows" role="list">
              @for (group of expensesControls; track $index; let i = $index) {
                <div class="row" role="listitem" [formGroup]="group">
                  <div class="wmp-field">
                    <label [for]="'exp-type-' + i">Type</label>
                    <p-select [inputId]="'exp-type-' + i" formControlName="typeCode" [options]="financialTypes()"
                              optionLabel="description" optionValue="name" placeholder="Select type" appendTo="body"/>
                  </div>
                  <div class="wmp-field">
                    <label [for]="'exp-amount-' + i">Amount</label>
                    <p-inputnumber [inputId]="'exp-amount-' + i" formControlName="amountEur" mode="currency" currency="EUR"
                                   locale="en-IE" [min]="0" [fluid]="true"/>
                  </div>
                  <div class="wmp-field">
                    <label [for]="'exp-desc-' + i">Description</label>
                    <input pInputText [id]="'exp-desc-' + i" formControlName="description"/>
                  </div>
                  <button pButton type="button" class="row__remove" [text]="true" severity="secondary"
                          [attr.aria-label]="'Remove expense ' + (i + 1)" (click)="removeExpense(i)">
                    <span pButtonIcon class="material-symbols-outlined" aria-hidden="true">delete</span>
                  </button>
                </div>
              }
            </div>
          }
        </section>

        <div class="wmp-field">
          <span class="wmp-choice">
            <p-checkbox inputId="termsAccepted" formControlName="termsAccepted" [binary]="true"/>
            <label for="termsAccepted">I accept the <a routerLink="/terms" target="_blank" rel="noopener">terms of service</a>.</label>
          </span>
          @if (showError('termsAccepted')) { <small class="wmp-field__error">You must accept the terms to continue.</small> }
        </div>

        @if (errorMsg()) {
          <p-message severity="error">{{ errorMsg() }}</p-message>
        }
      </form>

      <aside aside class="summary wmp-panel" aria-label="Summary">
        <h2 class="summary__title num">SUMMARY</h2>
        <dl>
          <div><dt>Annual income</dt><dd class="num">€{{ summary().income | number:'1.0-0' }}</dd></div>
          <div><dt>Current investments</dt><dd class="num">€{{ summary().investments | number:'1.0-0' }}</dd></div>
          <div><dt>Total expenses</dt><dd class="num">€{{ summary().expenses | number:'1.0-0' }}</dd></div>
        </dl>
        @if (summary().ratio !== null) {
          <div class="ratio">
            <div class="ratio__bar" role="img" [attr.aria-label]="'Expenses are ' + (summary().ratio | number:'1.0-0') + '% of income'">
              <span [style.width.%]="summary().ratioClamped"></span>
            </div>
            <span class="ratio__label"><span class="num">{{ summary().ratio | number:'1.0-0' }}%</span> of income committed to expenses</span>
          </div>
        }
      </aside>

      <div actions class="wmp-actions">
        <p-button label="Back" severity="secondary" [outlined]="true" [loading]="onPrev.pending()" (onClick)="onPrev()"/>
        <div class="wmp-actions__end">
          <button pButton type="submit" form="financial-form" [loading]="onSubmit.pending()"><span pButtonLabel>{{ onSubmit.pending() ? 'Saving…' : 'Save & continue' }}</span></button>
        </div>
      </div>
    </app-onboarding-layout>
  `,
  styles: [`
    .panel-head { display: flex; justify-content: space-between; align-items: center; gap: 1rem; }
    .empty { margin: 0; color: var(--wmp-text-muted); font-size: .9rem; }
    .rows { display: grid; gap: .75rem; }
    .row {
      display: grid; grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr) minmax(0, 1.4fr) auto; gap: .75rem; align-items: end;
      padding-bottom: .75rem; border-bottom: 1px solid var(--wmp-border);
    }
    .row:last-child { border-bottom: 0; padding-bottom: 0; }
    .row__remove .material-symbols-outlined { font-size: 20px; }
    .summary { flex: 1 1 240px; max-width: 320px; position: sticky; top: calc(var(--wmp-header-h) + 1rem); }
    .summary__title { margin: 0; font-size: .75rem; letter-spacing: .08em; color: var(--wmp-text-muted); font-weight: 500; }
    dl { margin: 0; display: grid; gap: .6rem; }
    dl div { display: flex; justify-content: space-between; gap: 1rem; font-size: .9rem; }
    dt { color: var(--wmp-text-muted); }
    dd { margin: 0; }
    .ratio { display: grid; gap: .4rem; padding-top: .75rem; border-top: 1px solid var(--wmp-border); }
    .ratio__bar { height: 8px; border-radius: 4px; background: var(--wmp-surface-raised); overflow: hidden; }
    .ratio__bar span { display: block; height: 100%; background: var(--wmp-loss); }
    .ratio__label { font-size: .8rem; color: var(--wmp-text-muted); }
    @media (max-width: 719.98px) {
      .row { grid-template-columns: minmax(0, 1fr) auto; }
      .row > .wmp-field { grid-column: 1 / 2; }
      .row__remove { grid-column: 2; grid-row: 1; align-self: start; }
      .summary { max-width: none; position: static; }
    }
  `]
})
export class FinancialInformationComponent {
  protected readonly step = OnboardingStep.FinancialInformation;
  private readonly progress = inject(OnboardingProgressService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(FormBuilder);
  private readonly formState = inject(OnboardingFormStateService);
  private readonly financialService = inject(FinancialInformationService);
  private readonly customerSession = inject(CustomerSessionService);

  readonly onSubmit = busyAction(() => this.submit());
  readonly onPrev = busyAction(() =>
    this.router.navigateByUrl(this.progress.pathFor(OnboardingStep.PersonalDetails)));
  protected readonly errorMsg = signal<string | null>(null);
  protected readonly financialTypes = signal<FinancialTypeDTO[]>([]);

  form: FormGroup = this.fb.group({
    annualIncomeEur: this.fb.control<number | null>(null, {validators: [Validators.required]}),
    totalInvestmentsEur: this.fb.control<number | null>(null),
    expenses: this.fb.array<FormGroup>([]),
    termsAccepted: this.fb.control<boolean>(false, {validators: [Validators.requiredTrue]})
  });

  private readonly value = toSignal(this.form.valueChanges, {initialValue: this.form.getRawValue()});

  /** Values shown in the live summary: plain sums of what was entered, no assumptions on periodicity. */
  protected readonly summary = computed(() => {
    const v = this.value() as FinancialFormValue;
    const income = v.annualIncomeEur ?? 0;
    const investments = v.totalInvestmentsEur ?? 0;
    const expenses = (v.expenses ?? []).reduce((sum, e) => sum + (e.amountEur ?? 0), 0);
    const ratio = income > 0 ? (expenses / income) * 100 : null;
    return {income, investments, expenses, ratio, ratioClamped: Math.min(100, ratio ?? 0)};
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
        saved.expenses.forEach((e: { typeCode?: string; amountEur?: number; description?: string }) => {
          this.expenses.push(this.createExpenseGroup(e.typeCode ?? null, e.amountEur ?? null, e.description ?? null));
        });
      }
    }
    this.form.valueChanges.subscribe(v => this.formState.save('financial-information', v));
    void this.loadFinancialTypes();
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
      const types = await firstValueFrom(this.financialService.getFinancialTypes());
      // Only expense categories belong in the expense picker (the BE also returns INCOME types)
      this.financialTypes.set((types || []).filter(t => !t.type || t.type === 'EXPENSE'));
    } catch {
      this.toast.error('Could not load expense types. Please try again.');
    }
  }

  private async submit(): Promise<void> {
    this.errorMsg.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const raw = this.form.getRawValue() as FinancialFormValue;
    if (raw.annualIncomeEur == null) {
      this.errorMsg.set('Annual income is required.');
      return;
    }
    // Use the selected customer from CustomerSessionService as the source of customerId
    const customerId = this.customerSession.customer()?.id;
    if (!customerId) {
      this.errorMsg.set('Customer information not available. Please select the customer again.');
      return;
    }
    const expensesForm: FinancialExpenseFormValue[] = (raw.expenses || []).map(e => ({
      financialTypeName: e.typeCode || null,
      amount: e.amountEur,
      description: e.description
    }));
    const payload = this.financialService.buildCustomerFinancialPayload(raw.annualIncomeEur, raw.totalInvestmentsEur, expensesForm);

    try {
      await firstValueFrom(this.financialService.addCustomerFinancials(customerId, payload));
      this.progress.completeStep(this.step);
      this.toast.success('Financial information saved.');
      await this.router.navigateByUrl(this.progress.pathFor(OnboardingStep.InvestmentGoals));
    } catch {
      this.errorMsg.set('Could not save financial information. Please try again.');
    }
  }
}
