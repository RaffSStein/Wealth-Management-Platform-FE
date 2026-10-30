import {Component, computed, inject, input} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {InputNumber} from 'primeng/inputnumber';
import {RadioButton} from 'primeng/radiobutton';
import {MifidQuestionDTO, MifidSectionDTO} from '../../../api/customer-service';
import {isAnswered, MifidQuestionnaireService} from '../../../core/services/mifid-questionnaire.service';

/**
 * One section of the MiFID questionnaire: progress header plus its questions, bound to MifidQuestionnaireService.
 * Used by the onboarding step and by the investor profile update.
 */
@Component({
  selector: 'app-mifid-section',
  imports: [FormsModule, InputNumber, RadioButton],
  template: `
    <div class="progress">
      <span class="num">Section {{ index() + 1 }} of {{ mifid.sections().length }}</span>
      <span class="progress__title">{{ section().title }}</span>
      <span class="progress__bar"><span [style.width.%]="answeredPercent()"></span></span>
      <span class="num progress__count">{{ answeredCount() }}/{{ totalQuestions() }} answered</span>
    </div>

    @for (q of section().questions; track q.id; let qi = $index) {
      <fieldset class="wmp-panel question" [class.is-missing]="missing(q)">
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
        @if (missing(q)) {
          <small class="wmp-field__error">Please answer this question.</small>
        }
      </fieldset>
    }
  `,
  styles: [`
    :host { display: block; }
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
export class MifidSectionComponent {
  protected readonly mifid = inject(MifidQuestionnaireService);

  readonly section = input.required<MifidSectionDTO>();
  readonly index = input.required<number>();
  /** Highlight required questions left unanswered (after a failed "next"). */
  readonly showMissing = input(false);

  protected readonly answers = this.mifid.answers;
  private readonly allQuestions = computed(() => this.mifid.sections().flatMap(s => s.questions ?? []));
  protected readonly totalQuestions = computed(() => this.allQuestions().length);
  protected readonly answeredCount = computed(() =>
    this.allQuestions().filter(q => isAnswered(q, this.answers()[q.id!])).length);
  protected readonly answeredPercent = computed(() =>
    this.totalQuestions() ? (this.answeredCount() / this.totalQuestions()) * 100 : 0);

  protected missing(q: MifidQuestionDTO): boolean {
    return this.showMissing() && !!q.isRequired && !isAnswered(q, this.answers()[q.id!]);
  }
}
