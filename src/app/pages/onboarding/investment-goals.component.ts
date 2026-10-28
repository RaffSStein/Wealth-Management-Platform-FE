import {Component, inject, signal} from '@angular/core';
import {Router} from '@angular/router';
import {FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';
import {firstValueFrom} from 'rxjs';
import {Button, ButtonDirective, ButtonIcon, ButtonLabel} from 'primeng/button';
import {DatePicker} from 'primeng/datepicker';
import {InputNumber} from 'primeng/inputnumber';
import {InputText} from 'primeng/inputtext';
import {Message} from 'primeng/message';
import {Select} from 'primeng/select';
import {SelectButton} from 'primeng/selectbutton';
import {CustomerService, GoalService, GoalTypeDTO} from '../../api/customer-service';
import {OnboardingProgressService, OnboardingStep} from '../../core/services/onboarding-progress.service';
import {CustomerSessionService} from '../../core/services/customer-session.service';
import {GOAL_TIMELINES, GoalFormRow, toCustomerGoals} from '../../core/services/goals-form';
import {ToastService} from '../../shared/services/toast.service';
import {OnboardingLayoutComponent} from '../../shared/components/onboarding-layout/onboarding-layout.component';

@Component({
  selector: 'app-onboarding-investment-goals',
  imports: [ReactiveFormsModule, OnboardingLayoutComponent, Button, ButtonDirective, ButtonIcon, DatePicker, InputNumber, InputText, Message, Select, SelectButton, ButtonLabel],
  template: `
    <app-onboarding-layout [step]="step" title="Investment goals"
                           subtitle="What are you investing for? Add at least one goal; your advisor uses them to shape proposals.">
      <form id="goals-form" class="wmp-form" [formGroup]="form" (ngSubmit)="onSubmit()" novalidate>
        @if (typesError()) {
          <p-message severity="error">Goal types could not be loaded. Reload the page to try again.</p-message>
        }
        @for (group of goals.controls; track $index; let i = $index) {
          <section class="wmp-panel goal" [formGroup]="group" [attr.aria-label]="'Goal ' + (i + 1)">
            <div class="goal__head">
              <h2 class="wmp-panel__title">Goal {{ i + 1 }}</h2>
              @if (goals.length > 1) {
                <button pButton type="button" [text]="true" severity="secondary" [attr.aria-label]="'Remove goal ' + (i + 1)"
                        (click)="removeGoal(i)">
                  <span pButtonIcon class="material-symbols-outlined" aria-hidden="true">delete</span>
                </button>
              }
            </div>
            <div class="wmp-form-grid">
              <div class="wmp-field">
                <label [for]="'goal-type-' + i">Goal<span class="wmp-req" aria-hidden="true">*</span></label>
                <p-select [inputId]="'goal-type-' + i" formControlName="goalTypeName" [options]="goalTypes()"
                          optionLabel="description" optionValue="name" placeholder="Select a goal" appendTo="body"/>
                @if (showError(group, 'goalTypeName')) { <small class="wmp-field__error">Choose a goal.</small> }
              </div>
              <div class="wmp-field">
                <label [for]="'goal-amount-' + i">Target amount<span class="wmp-req" aria-hidden="true">*</span></label>
                <p-inputnumber [inputId]="'goal-amount-' + i" formControlName="targetAmount" mode="currency" currency="EUR"
                               locale="en-IE" [min]="1" [fluid]="true"/>
                @if (showError(group, 'targetAmount')) { <small class="wmp-field__error">Enter a target amount.</small> }
              </div>
              <div class="wmp-field wmp-field--full">
                <span class="wmp-field__label" [id]="'goal-timeline-label-' + i">Time horizon<span class="wmp-req" aria-hidden="true">*</span></span>
                <p-selectbutton formControlName="goalTimeline" [options]="timelines" optionLabel="label" optionValue="value"
                                [allowEmpty]="false" [ariaLabelledBy]="'goal-timeline-label-' + i"/>
                <small class="wmp-field__hint">Short: under 3 years · Medium: 3–10 years · Long: over 10 years</small>
              </div>
              <div class="wmp-field">
                <label [for]="'goal-date-' + i">Target date</label>
                <p-datepicker [inputId]="'goal-date-' + i" formControlName="targetDate" dataType="string" dateFormat="yy-mm-dd"
                              [minDate]="today" [showIcon]="true" iconDisplay="input" placeholder="Optional" appendTo="body"/>
              </div>
              <div class="wmp-field">
                <label [for]="'goal-notes-' + i">Notes</label>
                <input pInputText [id]="'goal-notes-' + i" formControlName="notes" maxlength="500" placeholder="Optional"/>
              </div>
            </div>
          </section>
        }
        <p-button label="Add another goal" severity="secondary" [outlined]="true" (onClick)="addGoal()"/>
        @if (errorMsg()) {
          <p-message severity="error">{{ errorMsg() }}</p-message>
        }
      </form>

      <div actions class="wmp-actions">
        <p-button label="Back" severity="secondary" [outlined]="true" (onClick)="onPrev()"/>
        <div class="wmp-actions__end">
          <button pButton type="submit" form="goals-form" [loading]="loading()"><span pButtonLabel>{{ loading() ? 'Saving…' : 'Save & continue' }}</span></button>
        </div>
      </div>
    </app-onboarding-layout>
  `,
  styles: [`
    .goal__head { display: flex; justify-content: space-between; align-items: center; min-height: 2.5rem; }
    .goal__head .material-symbols-outlined { font-size: 20px; }
  `]
})
export class InvestmentGoalsComponent {
  protected readonly step = OnboardingStep.InvestmentGoals;
  private readonly progress = inject(OnboardingProgressService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly goalApi = inject(GoalService);
  private readonly customerApi = inject(CustomerService);
  private readonly customerSession = inject(CustomerSessionService);
  private readonly toast = inject(ToastService);

  protected readonly timelines = GOAL_TIMELINES;
  protected readonly today = new Date();
  protected readonly goalTypes = signal<GoalTypeDTO[]>([]);
  protected readonly typesError = signal(false);
  protected readonly loading = signal(false);
  protected readonly errorMsg = signal<string | null>(null);

  protected readonly form = this.fb.group({goals: this.fb.array<FormGroup>([this.createGoal()])});

  constructor() {
    void this.loadGoalTypes();
  }

  get goals(): FormArray<FormGroup> {
    return this.form.controls.goals;
  }

  private createGoal(): FormGroup {
    return this.fb.group({
      goalTypeName: this.fb.control<string | null>(null, {validators: [Validators.required]}),
      targetAmount: this.fb.control<number | null>(null, {validators: [Validators.required, Validators.min(1)]}),
      goalTimeline: this.fb.control<string | null>('MEDIUM_TERM', {validators: [Validators.required]}),
      targetDate: this.fb.control<string | null>(null),
      notes: this.fb.control<string | null>(null, {validators: [Validators.maxLength(500)]})
    });
  }

  private async loadGoalTypes(): Promise<void> {
    try {
      this.goalTypes.set(await firstValueFrom(this.goalApi.getAllGoalTypes()) ?? []);
    } catch {
      this.typesError.set(true);
    }
  }

  protected addGoal(): void {
    this.goals.push(this.createGoal());
  }

  protected removeGoal(index: number): void {
    if (this.goals.length > 1) this.goals.removeAt(index);
  }

  protected showError(group: FormGroup, control: string): boolean {
    const c = group.get(control);
    return !!c && c.touched && c.invalid;
  }

  protected onPrev(): void {
    void this.router.navigateByUrl(this.progress.pathFor(OnboardingStep.FinancialInformation));
  }

  async onSubmit(): Promise<void> {
    this.errorMsg.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const customerId = this.customerSession.customer()?.id;
    if (!customerId) {
      this.errorMsg.set('Customer information not available. Please select the customer again.');
      return;
    }
    const goals = toCustomerGoals(this.goals.getRawValue() as GoalFormRow[], this.goalTypes());
    this.loading.set(true);
    try {
      await firstValueFrom(this.customerApi.addCustomerGoals(customerId, goals));
      this.progress.completeStep(this.step);
      this.toast.success('Investment goals saved.');
      await this.router.navigateByUrl(this.progress.pathFor(OnboardingStep.MifidQuestionnaire));
    } catch {
      this.errorMsg.set('Could not save your goals. Please try again.');
    } finally {
      this.loading.set(false);
    }
  }
}
