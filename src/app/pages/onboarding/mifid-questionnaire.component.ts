import {Component, computed, inject, signal} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {Router} from '@angular/router';
import {Button} from 'primeng/button';
import {InputNumber} from 'primeng/inputnumber';
import {Message} from 'primeng/message';
import {RadioButton} from 'primeng/radiobutton';
import {MifidQuestionDTO} from '../../api/customer-service';
import {OnboardingProgressService, OnboardingStep} from '../../core/services/onboarding-progress.service';
import {CustomerSessionService} from '../../core/services/customer-session.service';
import {isAnswered, MifidQuestionnaireService} from '../../core/services/mifid-questionnaire.service';
import {ToastService} from '../../shared/services/toast.service';
import {OnboardingLayoutComponent} from '../../shared/components/onboarding-layout/onboarding-layout.component';

@Component({
  selector: 'app-onboarding-mifid-questionnaire',
  imports: [FormsModule, OnboardingLayoutComponent, Button, InputNumber, Message, RadioButton],
  template: `
    <app-onboarding-layout [step]="step" title="MiFID questionnaire"
                           subtitle="These questions assess your knowledge, experience and attitude to risk, as required by MiFID II. There are no right or wrong answers.">
      @switch (mifid.state()) {
        @case ('loading') {
          <p class="muted">Loading the questionnaire…</p>
        }
        @case ('unavailable') {
          <p-message severity="warn">No MiFID questionnaire is currently available. Please try again later or contact support.</p-message>
        }
        @case ('error') {
          <p-message severity="error">The questionnaire could not be loaded. Reload the page to try again.</p-message>
        }
        @case ('ready') {
          @if (section(); as s) {
            <div class="progress">
              <span class="num">Section {{ index() + 1 }} of {{ sections().length }}</span>
              <span class="progress__title">{{ s.title }}</span>
              <span class="progress__bar"><span [style.width.%]="answeredPercent()"></span></span>
              <span class="num progress__count">{{ answeredCount() }}/{{ totalQuestions() }} answered</span>
            </div>

            @for (q of s.questions; track q.id; let qi = $index) {
              <fieldset class="wmp-panel question" [class.is-missing]="showMissing() && q.isRequired && !answered(q)">
                <legend class="question__text">
                  <span class="num question__n">{{ qi + 1 }}.</span> {{ q.text }}
                  @if (q.isRequired) { <span class="wmp-req" aria-hidden="true">*</span> }
                </legend>
                @if (q.questionType === 'NUMERIC') {
                  <p-inputnumber [inputId]="'q-' + q.id" [ngModel]="answers()[q.id!]?.numericValue ?? null"
                                 (ngModelChange)="mifid.setAnswer(q.id!, {numericValue: $event})"
                                 [min]="0" [fluid]="true" [attr.aria-label]="q.text"/>
                } @else {
                  <div class="options">
                    @for (o of q.answerOptions; track o.id) {
                      <label class="option" [class.is-selected]="answers()[q.id!]?.optionId === o.id" [for]="'o-' + o.id">
                        <p-radiobutton [inputId]="'o-' + o.id" [name]="'q-' + q.id" [value]="o.id"
                                       [ngModel]="answers()[q.id!]?.optionId" (ngModelChange)="mifid.setAnswer(q.id!, {optionId: $event})"/>
                        <span>{{ o.optionText }}</span>
                      </label>
                    }
                  </div>
                }
                @if (showMissing() && q.isRequired && !answered(q)) {
                  <small class="wmp-field__error">Please answer this question.</small>
                }
              </fieldset>
            }
          }
          @if (errorMsg()) {
            <p-message severity="error">{{ errorMsg() }}</p-message>
          }
        }
      }

      <div actions class="wmp-actions">
        <p-button [label]="index() === 0 ? 'Back' : 'Previous section'" severity="secondary" [outlined]="true" (onClick)="previous()"/>
        @if (mifid.state() === 'ready') {
          <div class="wmp-actions__end">
            <p-button label="Save draft" severity="secondary" [text]="true" [loading]="saving()" (onClick)="saveDraft()"/>
            @if (isLast()) {
              <p-button [label]="submitting() ? 'Submitting…' : 'Submit questionnaire'" [loading]="submitting()" (onClick)="submit()"/>
            } @else {
              <p-button label="Next section" (onClick)="next()"/>
            }
          </div>
        }
      </div>
    </app-onboarding-layout>
  `,
  styles: [`
    .muted { color: var(--wmp-text-muted); }
    .progress {
      display: grid; grid-template-columns: auto 1fr auto; gap: .35rem 1rem; align-items: center;
      margin-bottom: 1rem; font-size: .85rem; color: var(--wmp-text-muted);
    }
    .progress__title { color: var(--wmp-text); font-weight: 600; font-size: 1rem; }
    .progress__bar { grid-column: 1 / -1; height: 4px; border-radius: 2px; background: var(--wmp-surface-raised); overflow: hidden; }
    .progress__bar span { display: block; height: 100%; background: var(--wmp-primary); transition: width .2s ease; }
    .progress__count { grid-row: 1; grid-column: 3; }
    .question { margin: 0 0 1rem; min-width: 0; }
    .question.is-missing { border-color: var(--wmp-danger); }
    .question__text { padding: 0; font-weight: 500; line-height: 1.45; float: left; width: 100%; margin-bottom: .75rem; }
    .question__text + * { clear: both; }
    .question__n { color: var(--wmp-text-muted); margin-right: .25rem; }
    .options { display: grid; gap: .5rem; }
    .option {
      display: flex; align-items: flex-start; gap: .75rem; padding: .75rem .9rem; cursor: pointer; font-size: .9rem; line-height: 1.45;
      border: 1px solid var(--wmp-border); border-radius: var(--wmp-radius-md); background: var(--wmp-bg);
    }
    .option:hover { border-color: var(--wmp-text-muted); }
    .option.is-selected { border-color: var(--wmp-primary); background: var(--wmp-primary-soft); }
    @media (prefers-reduced-motion: reduce) { .progress__bar span { transition: none; } }
  `]
})
export class MifidQuestionnaireComponent {
  protected readonly step = OnboardingStep.MifidQuestionnaire;
  protected readonly mifid = inject(MifidQuestionnaireService);
  private readonly progress = inject(OnboardingProgressService);
  private readonly router = inject(Router);
  private readonly customerSession = inject(CustomerSessionService);
  private readonly toast = inject(ToastService);

  protected readonly index = signal(0);
  protected readonly showMissing = signal(false);
  protected readonly saving = signal(false);
  protected readonly submitting = signal(false);
  protected readonly errorMsg = signal<string | null>(null);

  protected readonly sections = this.mifid.sections;
  protected readonly answers = this.mifid.answers;
  protected readonly section = computed(() => this.sections()[this.index()]);
  protected readonly isLast = computed(() => this.index() === this.sections().length - 1);
  private readonly allQuestions = computed(() => this.sections().flatMap(s => s.questions ?? []));
  protected readonly totalQuestions = computed(() => this.allQuestions().length);
  protected readonly answeredCount = computed(() => this.allQuestions().filter(q => this.answered(q)).length);
  protected readonly answeredPercent = computed(() =>
    this.totalQuestions() ? (this.answeredCount() / this.totalQuestions()) * 100 : 0);

  constructor() {
    const customerId = this.customerSession.customer()?.id;
    if (customerId) void this.mifid.load(customerId);
    else this.mifid.state.set('error');
  }

  protected answered(q: MifidQuestionDTO): boolean {
    return isAnswered(q, this.answers()[q.id!]);
  }

  private sectionComplete(): boolean {
    return (this.section()?.questions ?? []).every(q => !q.isRequired || this.answered(q));
  }

  protected next(): void {
    if (!this.sectionComplete()) {
      this.showMissing.set(true);
      return;
    }
    this.showMissing.set(false);
    this.index.update(i => i + 1);
    window.scrollTo({top: 0});
  }

  protected previous(): void {
    this.showMissing.set(false);
    if (this.index() === 0) {
      void this.router.navigateByUrl(this.progress.pathFor(OnboardingStep.InvestmentGoals));
      return;
    }
    this.index.update(i => i - 1);
    window.scrollTo({top: 0});
  }

  protected async saveDraft(): Promise<void> {
    this.saving.set(true);
    try {
      await this.mifid.saveDraft();
      this.toast.success('Draft saved. You can continue later.');
    } catch {
      this.toast.error('Could not save the draft. Please try again.');
    } finally {
      this.saving.set(false);
    }
  }

  protected async submit(): Promise<void> {
    this.errorMsg.set(null);
    const firstIncomplete = this.sections().findIndex(s => (s.questions ?? []).some(q => q.isRequired && !this.answered(q)));
    if (firstIncomplete !== -1) {
      this.index.set(firstIncomplete);
      this.showMissing.set(true);
      return;
    }
    this.submitting.set(true);
    try {
      await this.mifid.submit();
      this.progress.completeStep(this.step);
      await this.router.navigateByUrl(this.progress.pathFor(OnboardingStep.RiskAssessment));
    } catch {
      this.errorMsg.set('The questionnaire could not be submitted. Your answers are still here; please try again.');
    } finally {
      this.submitting.set(false);
    }
  }
}
