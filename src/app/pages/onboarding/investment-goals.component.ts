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
import {busyAction} from '../../core/services/busy-action';
import {fromCustomerGoals, GOAL_TIMELINES, GoalFormRow, toCustomerGoals} from '../../core/services/goals-form';
import {OnboardingFormStateService} from '../../core/services/onboarding-form-state.service';
import {WorkspaceContextService} from '../../core/services/workspace-context.service';
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
        <p-button label="Back" severity="secondary" [outlined]="true" [loading]="onPrev.pending()" (onClick)="onPrev()"/>
        <div class="wmp-actions__end">
          <p-button label="Save & exit" severity="secondary" [outlined]="true" [loading]="saveAndExit.pending()"
                    [disabled]="onSubmit.pending() || prefilling()" (onClick)="saveAndExit()"/>
          <button pButton type="submit" form="goals-form" [loading]="onSubmit.pending()"
                  [disabled]="saveAndExit.pending() || prefilling()"><span pButtonLabel>{{ onSubmit.pending() ? 'Saving…' : 'Save & continue' }}</span></button>
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
  private readonly formState = inject(OnboardingFormStateService);
  private readonly workspace = inject(WorkspaceContextService);

  protected readonly timelines = GOAL_TIMELINES;
  protected readonly today = new Date();
  protected readonly goalTypes = signal<GoalTypeDTO[]>([]);
  protected readonly typesError = signal(false);
  readonly onSubmit = busyAction(async () => {
    if (await this.save()) await this.router.navigateByUrl(this.progress.pathFor(OnboardingStep.MifidQuestionnaire));
  });
  readonly saveAndExit = busyAction(async () => {
    if (!await this.save()) return;
    await this.workspace.exitOnboarding();
  });
  /** True while the saved goals are loaded from the BE (the form is disabled meanwhile). */
  protected readonly prefilling = signal(false);
  protected readonly onPrev = busyAction(() =>
    this.router.navigateByUrl(this.progress.pathFor(OnboardingStep.FinancialInformation)));
  protected readonly errorMsg = signal<string | null>(null);

  protected readonly form = this.fb.group({goals: this.fb.array<FormGroup>([this.createGoal()])});

  constructor() {
    void this.loadGoalTypes();
    void this.prefill();
  }

  /** Unsaved local draft first (this tab), else the goals saved on the BE, with their ids. */
  private async prefill(): Promise<void> {
    const draft = this.formState.load<GoalFormRow[]>('investment-goals');
    const customerId = this.customerSession.customer()?.id;
    if (draft?.length) {
      this.setRows(draft);
    } else if (customerId) {
      this.prefilling.set(true);
      this.form.disable({emitEvent: false});
      try {
        const customer = await firstValueFrom(this.customerApi.getCustomerById(customerId));
        const saved = fromCustomerGoals(customer?.customerGoals);
        if (saved.length) this.setRows(saved);
      } catch {
        this.errorMsg.set('Could not load the saved goals. You can still edit and save them.');
      } finally {
        this.form.enable({emitEvent: false});
        this.prefilling.set(false);
      }
    }
    this.goals.valueChanges.subscribe(() => this.formState.save('investment-goals', this.goals.getRawValue()));
  }

  private setRows(rows: GoalFormRow[]): void {
    this.goals.clear({emitEvent: false});
    rows.forEach(row => {
      const group = this.createGoal();
      group.patchValue(row, {emitEvent: false});
      this.goals.push(group, {emitEvent: false});
    });
  }

  get goals(): FormArray<FormGroup> {
    return this.form.controls.goals;
  }

  private createGoal(): FormGroup {
    return this.fb.group({
      // BE id and loaded type of a saved goal (see toCustomerGoals)
      id: this.fb.control<number | null>(null),
      savedGoalTypeName: this.fb.control<string | null>(null),
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
    // Saved goals are deleted on the BE by leaving them out of the next save (replace semantics)
    if (this.goals.length > 1) this.goals.removeAt(index);
  }

  protected showError(group: FormGroup, control: string): boolean {
    const c = group.get(control);
    return !!c && c.touched && c.invalid;
  }

  /** Saves the goals (goals with ids are updated, not duplicated). Returns false when nothing was saved. */
  private async save(): Promise<boolean> {
    this.errorMsg.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return false;
    }
    const customerId = this.customerSession.customer()?.id;
    if (!customerId) {
      this.errorMsg.set('Customer information not available. Please select the customer again.');
      return false;
    }
    const goals = toCustomerGoals(this.goals.getRawValue() as GoalFormRow[], this.goalTypes());
    try {
      await firstValueFrom(this.customerApi.addCustomerGoals(customerId, goals));
      // The BE now holds the goals (with ids): the next visit loads them from there
      this.formState.clear('investment-goals');
      this.progress.completeStep(this.step);
      this.toast.success('Investment goals saved.');
      return true;
    } catch {
      this.errorMsg.set('Could not save your goals. Please try again.');
      return false;
    }
  }
}
