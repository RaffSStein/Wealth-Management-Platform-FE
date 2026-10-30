import {HttpErrorResponse} from '@angular/common/http';
import {Injectable, inject, signal} from '@angular/core';
import {firstValueFrom} from 'rxjs';
import {
  CustomerRiskProfileDTO,
  MifidFillingDTO,
  MifidQuestionDTO,
  MifidQuestionnaireConfigDTO,
  MifidResponseDTO,
  MifidSectionDTO,
  MifidService,
  RiskProfileConfigurationDTO
} from '../../api/customer-service';

/** Answer to one question: the chosen option (SINGLE) or a free numeric value (NUMERIC). */
export interface MifidAnswer {
  optionId?: number;
  numericValue?: number | null;
}

export type MifidAnswers = Record<number, MifidAnswer>;

export type MifidLoadState = 'idle' | 'loading' | 'ready' | 'unavailable' | 'error';

const byOrder = <T extends { orderIndex?: number }>(a: T, b: T) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0);

/** Sections, questions and options sorted by orderIndex (the BE returns them unordered). */
export function orderedSections(config: MifidQuestionnaireConfigDTO): MifidSectionDTO[] {
  return [...(config.sections ?? [])].sort(byOrder).map(section => ({
    ...section,
    questions: [...(section.questions ?? [])].sort(byOrder).map(q => ({
      ...q,
      answerOptions: [...(q.answerOptions ?? [])].sort(byOrder)
    }))
  }));
}

/** Risk profile bands from the config, lowest score first. Codes and ranges are BE-owned: never hard-code them. */
export function riskBands(config: MifidQuestionnaireConfigDTO | null): RiskProfileConfigurationDTO[] {
  return [...(config?.riskProfileConfigurations ?? [])].sort((a, b) => (a.minScore ?? 0) - (b.minScore ?? 0));
}

/** The configured band for a customer profile. The BE returns either the profile code or its configured label. */
export function findBand(config: MifidQuestionnaireConfigDTO | null, profile: string | null | undefined): RiskProfileConfigurationDTO | undefined {
  if (!profile) return undefined;
  return riskBands(config).find(b => b.profileCode === profile || b.profileLabel === profile);
}

/** Display text for a profile: the configured label when known, else a readable version of the raw value. */
export function profileDisplay(config: MifidQuestionnaireConfigDTO | null, profile: string | null | undefined): string {
  if (!profile || profile.toUpperCase() === 'UNDEFINED') return '';
  const band = findBand(config, profile);
  if (band?.profileLabel) return band.profileLabel;
  return /^[A-Z_]+$/.test(profile) ? profile.charAt(0) + profile.slice(1).toLowerCase().replace(/_/g, ' ') : profile;
}

export function isAnswered(question: MifidQuestionDTO, answer: MifidAnswer | undefined): boolean {
  if (!answer) return false;
  return question.questionType === 'NUMERIC' ? answer.numericValue != null : answer.optionId != null;
}

/** True when every required question of the section is answered. */
export function isSectionComplete(section: MifidSectionDTO | undefined, answers: MifidAnswers): boolean {
  return (section?.questions ?? []).every(q => !q.isRequired || isAnswered(q, answers[q.id!]));
}

/** Index of the first section with a required question left unanswered, or -1 when all are complete. */
export function firstIncompleteSection(sections: MifidSectionDTO[], answers: MifidAnswers): number {
  return sections.findIndex(s => !isSectionComplete(s, answers));
}

/**
 * Builds the filling payload from the answers. NUMERIC questions carry a single "free value" option in the config,
 * which is sent as the answerOption together with numericValue. Unanswered questions are left out.
 * Known response ids (from a stored filling) are included so a PATCH updates those answers instead of adding new ones.
 * The filling status is server-derived (COMPLETED when every question is answered), so it is never sent.
 */
export function toMifidFilling(
  config: MifidQuestionnaireConfigDTO,
  answers: MifidAnswers,
  options: { fillingId?: number; responseIds?: Record<number, number>; today?: Date } = {}
): MifidFillingDTO {
  const responses = orderedSections(config).flatMap(section => (section.questions ?? []).flatMap(question => {
    const answer = answers[question.id!];
    if (!isAnswered(question, answer)) return [];
    const {answerOptions, ...questionRef} = question;
    const numeric = question.questionType === 'NUMERIC';
    const answerOption = numeric ? answerOptions?.[0] : answerOptions?.find(o => o.id === answer.optionId);
    if (!answerOption) return [];
    const id = options.responseIds?.[question.id!];
    return [{...(id != null ? {id} : {}), question: questionRef, answerOption, ...(numeric ? {numericValue: answer.numericValue!} : {})}];
  }));
  const day = options.today ?? new Date();
  const fillingDate = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
  return {
    questionnaireId: config.questionnaireId!,
    fillingDate,
    responses,
    ...(options.fillingId != null ? {fillingId: options.fillingId} : {})
  };
}

/** Restores answers from a saved filling (draft resume). */
export function answersFromFilling(filling: MifidFillingDTO): MifidAnswers {
  const answers: MifidAnswers = {};
  for (const r of filling.responses ?? []) {
    const id = r.question?.id;
    if (id == null) continue;
    answers[id] = r.question.questionType === 'NUMERIC'
      ? {numericValue: r.numericValue ?? null}
      : {optionId: r.answerOption?.id};
  }
  return answers;
}

export interface AnsweredQuestion {
  question: string;
  /** Option text, or the numeric value as text; null when the question was left unanswered. */
  answer: string | null;
}

export interface AnsweredSection {
  title: string;
  questions: AnsweredQuestion[];
}

/**
 * Read-only view of a filling, for the investor profile page. When the filling belongs to the given questionnaire,
 * answers follow its sections and order; otherwise (an older questionnaire version) they are listed in one section.
 */
export function answeredSections(config: MifidQuestionnaireConfigDTO | null, filling: MifidFillingDTO): AnsweredSection[] {
  const text = (r: MifidResponseDTO): string | null =>
    r.question?.questionType === 'NUMERIC' ? (r.numericValue != null ? String(r.numericValue) : null) : r.answerOption?.optionText ?? null;
  const byQuestion = new Map<number, MifidResponseDTO>();
  for (const r of filling.responses ?? []) if (r.question?.id != null) byQuestion.set(r.question.id, r);

  if (config && config.questionnaireId === filling.questionnaireId) {
    return orderedSections(config).map(section => ({
      title: section.title ?? '',
      questions: (section.questions ?? []).map(q => {
        const r = byQuestion.get(q.id!);
        return {question: q.text ?? '', answer: r ? text(r) : null};
      })
    }));
  }
  const responses = [...(filling.responses ?? [])].sort((a, b) => (a.question?.orderIndex ?? 0) - (b.question?.orderIndex ?? 0));
  return [{title: 'Answers', questions: responses.map(r => ({question: r.question?.text ?? '', answer: text(r)}))}];
}

/**
 * Answers to start a MiFID update from: the submitted filling's answers that still fit the current questionnaire
 * (same question, and for choice questions an option that still exists). Anything else is left for the user.
 */
export function prefillAnswers(config: MifidQuestionnaireConfigDTO, filling: MifidFillingDTO): MifidAnswers {
  const questions = new Map(orderedSections(config).flatMap(s => s.questions ?? []).map(q => [q.id!, q]));
  const answers: MifidAnswers = {};
  for (const [id, answer] of Object.entries(answersFromFilling(filling))) {
    const question = questions.get(Number(id));
    if (!question) continue;
    const fits = question.questionType === 'NUMERIC' || question.answerOptions?.some(o => o.id === answer.optionId);
    if (fits && isAnswered(question, answer)) answers[question.id!] = answer;
  }
  return answers;
}

/**
 * The customer's current (latest SUBMITTED) filling, or null when there is none (404).
 * Open update drafts are ignored by the BE, so this stays the profile in force while an update is in progress.
 */
export async function loadSubmittedFilling(api: MifidService, customerId: string): Promise<MifidFillingDTO | null> {
  try {
    return await firstValueFrom(api.getCurrentMifidFillingForCustomer(customerId));
  } catch (err) {
    if (err instanceof HttpErrorResponse && err.status === 404) return null;
    throw err;
  }
}

/**
 * MiFID questionnaire state for the onboarding step: config, answers, draft persistence and submit.
 * The draft fillingId is remembered per customer in localStorage so a reload can resume it.
 */
@Injectable({providedIn: 'root'})
export class MifidQuestionnaireService {
  private readonly api = inject(MifidService);

  readonly state = signal<MifidLoadState>('idle');
  readonly config = signal<MifidQuestionnaireConfigDTO | null>(null);
  readonly sections = signal<MifidSectionDTO[]>([]);
  readonly answers = signal<MifidAnswers>({});
  /** Profile returned by the last successful submit (consumed by the risk assessment step). */
  readonly result = signal<CustomerRiskProfileDTO | null>(null);

  private customerId: string | null = null;
  private fillingId: number | null = null;
  private fillingStatus: MifidFillingDTO.StatusEnum | null = null;
  private responseIds: Record<number, number> = {};

  /**
   * Loads the config and resumes the customer's draft, if any. For a MiFID update (`prefillFrom` = the submitted
   * filling) without a draft, the answers start from the submitted ones; the first save then creates a new filling.
   */
  async load(customerId: string, options: { prefillFrom?: MifidFillingDTO | null } = {}): Promise<void> {
    this.customerId = customerId;
    this.state.set('loading');
    try {
      const config = await firstValueFrom(this.api.getLatestValidMifidQuestionnaireConfig());
      this.config.set(config);
      this.sections.set(orderedSections(config));
      this.answers.set({});
      this.fillingId = this.readFillingId(customerId);
      this.fillingStatus = null;
      this.responseIds = {};
      if (this.fillingId != null) await this.resumeDraft(customerId, this.fillingId);
      if (this.fillingId == null && options.prefillFrom) this.answers.set(prefillAnswers(config, options.prefillFrom));
      this.state.set('ready');
    } catch (err) {
      // 404 = no questionnaire valid today (BE returns OBJECT_NOT_FOUND)
      this.state.set(err instanceof HttpErrorResponse && err.status === 404 ? 'unavailable' : 'error');
    }
  }

  setAnswer(questionId: number, answer: MifidAnswer): void {
    this.answers.update(a => ({...a, [questionId]: answer}));
  }

  /** Stores the current answers as a draft (create, or update the existing DRAFT filling). */
  async saveDraft(): Promise<void> {
    await this.store();
  }

  /**
   * BE workflow: save/PATCH derive the status (COMPLETED once every question is answered); only a COMPLETED filling
   * can be submitted (otherwise 409 INVALID_STATE_TRANSITION). Submit computes the customer's risk profile.
   */
  async submit(): Promise<MifidFillingDTO> {
    const {customerId} = this.requireLoaded();
    const stored = await this.store();
    if (stored.status !== 'COMPLETED') throw new Error('MiFID filling is not complete');
    const submitted = await firstValueFrom(this.api.submitQuestionnaire(customerId, stored));
    this.result.set(submitted?.customerRiskProfile ?? null);
    this.forgetFilling(customerId);
    return submitted;
  }

  /** True when the customer has a saved, not yet submitted filling (an onboarding or update draft) on this browser. */
  hasDraft(customerId: string): boolean {
    return this.readFillingId(customerId) != null;
  }

  /**
   * POST a new filling, or PATCH the one being worked on while it isn't submitted (DRAFT or COMPLETED; the BE
   * recalculates the status on every update). Submitted fillings are never edited: an update is a new filling.
   */
  private async store(): Promise<MifidFillingDTO> {
    const {config, customerId} = this.requireLoaded();
    const editable = this.fillingId != null && (this.fillingStatus === 'DRAFT' || this.fillingStatus === 'COMPLETED');
    const payload = toMifidFilling(config, this.answers(), editable ? {fillingId: this.fillingId!, responseIds: this.responseIds} : {});
    const stored = editable
      ? await firstValueFrom(this.api.updateMifidFillingForCustomer(customerId, this.fillingId!, payload))
      : await firstValueFrom(this.api.saveMifidFillingForCustomer(customerId, payload));
    this.remember(customerId, stored);
    return stored;
  }

  private remember(customerId: string, filling: MifidFillingDTO): void {
    this.fillingId = filling.fillingId ?? this.fillingId;
    this.fillingStatus = filling.status ?? null;
    this.responseIds = {};
    for (const r of filling.responses ?? []) {
      if (r.id != null && r.question?.id != null) this.responseIds[r.question.id] = r.id;
    }
    if (this.fillingId != null) this.writeFillingId(customerId, this.fillingId);
  }

  private forgetFilling(customerId: string): void {
    this.writeFillingId(customerId, null);
    this.fillingId = null;
    this.fillingStatus = null;
    this.responseIds = {};
  }

  private async resumeDraft(customerId: string, fillingId: number): Promise<void> {
    try {
      const filling = await firstValueFrom(this.api.getMifidFillingForCustomer(customerId, fillingId));
      // A stored but not yet submitted filling (DRAFT, or COMPLETED from an interrupted submit) is resumed
      if (filling?.status === 'DRAFT' || filling?.status === 'COMPLETED') {
        this.answers.set(answersFromFilling(filling));
        this.remember(customerId, filling);
      } else {
        this.forgetFilling(customerId);
      }
    } catch {
      // Draft gone or not readable: start fresh
      this.forgetFilling(customerId);
    }
  }

  private requireLoaded(): { config: MifidQuestionnaireConfigDTO; customerId: string } {
    const config = this.config();
    if (!config || !this.customerId) throw new Error('MiFID questionnaire not loaded');
    return {config, customerId: this.customerId};
  }

  private storageKey(customerId: string): string {
    return `wmp.mifid.filling.${customerId}`;
  }

  private readFillingId(customerId: string): number | null {
    try {
      const raw = localStorage.getItem(this.storageKey(customerId));
      return raw ? Number(raw) : null;
    } catch {
      return null;
    }
  }

  private writeFillingId(customerId: string, fillingId: number | null): void {
    try {
      if (fillingId == null) localStorage.removeItem(this.storageKey(customerId));
      else localStorage.setItem(this.storageKey(customerId), String(fillingId));
    } catch {
      // storage unavailable: draft resume just won't work across reloads
    }
  }
}
