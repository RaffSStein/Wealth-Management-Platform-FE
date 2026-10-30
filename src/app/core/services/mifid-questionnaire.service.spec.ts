import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { MifidService } from '../../api/customer-service';
import {
  answeredSections, answersFromFilling, findBand, firstIncompleteSection, isSectionComplete, loadSubmittedFilling, MifidQuestionnaireService,
  orderedSections, prefillAnswers, profileDisplay, riskBands, toMifidFilling
} from './mifid-questionnaire.service';

describe('MiFID questionnaire mapping', () => {
  const config: any = {
    questionnaireId: 1,
    sections: [
      {
        id: 4, title: 'Investment Experience', orderIndex: 2, questions: [
          { id: 7, text: 'Leverage?', questionType: 'SINGLE', isRequired: true, orderIndex: 1,
            answerOptions: [{ id: 27, optionText: 'B', score: 10, orderIndex: 2 }, { id: 26, optionText: 'A', score: 5, orderIndex: 1 }] }
        ]
      },
      {
        id: 3, title: 'Personal Information', orderIndex: 1, questions: [
          { id: 5, text: 'Employment?', questionType: 'SINGLE', isRequired: true, orderIndex: 2,
            answerOptions: [{ id: 13, optionText: 'Full-time', score: 10, orderIndex: 1 }] },
          { id: 4, text: 'Income?', questionType: 'NUMERIC', isRequired: true, orderIndex: 1,
            answerOptions: [{ id: 69, optionText: 'Free numeric value', score: 5, orderIndex: 1 }] }
        ]
      }
    ],
    riskProfileConfigurations: [
      { profileCode: 'AGGRESSIVE', minScore: 129, maxScore: 145 },
      { profileCode: 'CONSERVATIVE', minScore: 0, maxScore: 79 }
    ]
  };

  it('orders sections, questions and options by orderIndex', () => {
    const sections = orderedSections(config);
    expect(sections.map(s => s.id)).toEqual([3, 4]);
    expect(sections[0].questions!.map(q => q.id)).toEqual([4, 5]);
    expect(sections[1].questions![0].answerOptions!.map(o => o.id)).toEqual([26, 27]);
  });

  it('sorts risk bands by minimum score', () => {
    expect(riskBands(config).map(b => b.profileCode)).toEqual(['CONSERVATIVE', 'AGGRESSIVE']);
    expect(riskBands(null)).toEqual([]);
  });

  it('builds a filling with the chosen options and the numeric free value', () => {
    const filling = toMifidFilling(config, { 4: { numericValue: 85000 }, 7: { optionId: 27 } },
      { today: new Date(2026, 9, 28) });
    expect(filling.questionnaireId).toBe(1);
    expect(filling.fillingDate).toBe('2026-10-28');
    expect('status' in filling).toBeFalse(); // server-derived
    expect(filling.responses.length).toBe(2);
    const [income, leverage] = filling.responses;
    expect(income.question.id).toBe(4);
    expect(income.answerOption.id).toBe(69);
    expect(income.numericValue).toBe(85000);
    expect((income.question as any).answerOptions).toBeUndefined();
    expect(leverage.answerOption.id).toBe(27);
    expect('numericValue' in leverage).toBeFalse();
  });

  it('skips unanswered questions and keeps the draft id', () => {
    const filling = toMifidFilling(config, { 5: { optionId: 13 }, 4: { numericValue: null } }, { fillingId: 9 });
    expect(filling.fillingId).toBe(9);
    expect(filling.responses.map(r => r.question.id)).toEqual([5]);
  });

  it('includes known response ids so a PATCH updates existing answers', () => {
    const filling = toMifidFilling(config, { 4: { numericValue: 1 }, 5: { optionId: 13 } }, { fillingId: 9, responseIds: { 5: 77 } });
    expect(filling.responses.find(r => r.question.id === 5)!.id).toBe(77);
    expect('id' in filling.responses.find(r => r.question.id === 4)!).toBeFalse();
  });

  it('matches a profile by code or by configured label', () => {
    const cfg: any = { riskProfileConfigurations: [{ profileCode: 'BALANCED', profileLabel: 'Balanced Profile', minScore: 96, maxScore: 112 }] };
    expect(findBand(cfg, 'BALANCED')?.profileLabel).toBe('Balanced Profile');
    expect(findBand(cfg, 'Balanced Profile')?.profileCode).toBe('BALANCED');
    expect(profileDisplay(cfg, 'Balanced Profile')).toBe('Balanced Profile');
    expect(profileDisplay(null, 'MODERATELY_AGGRESSIVE')).toBe('Moderately aggressive');
    expect(profileDisplay(cfg, 'UNDEFINED')).toBe('');
  });

  it('restores answers from a saved filling', () => {
    const filling = toMifidFilling(config, { 4: { numericValue: 1200 }, 5: { optionId: 13 } });
    expect(answersFromFilling(filling)).toEqual({ 4: { numericValue: 1200 }, 5: { optionId: 13 } });
  });

  it('lists a filling of the same questionnaire by section, unanswered questions included', () => {
    const filling = toMifidFilling(config, { 4: { numericValue: 85000 }, 7: { optionId: 27 } });
    expect(answeredSections(config, filling)).toEqual([
      { title: 'Personal Information', questions: [
        { question: 'Income?', answer: '85000' },
        { question: 'Employment?', answer: null }
      ] },
      { title: 'Investment Experience', questions: [{ question: 'Leverage?', answer: 'B' }] }
    ]);
  });

  it('pre-fills an update only with answers that still fit the current questionnaire', () => {
    const submitted = toMifidFilling(config, { 4: { numericValue: 85000 }, 5: { optionId: 13 }, 7: { optionId: 27 } });
    // option 27 was dropped from question 7 and question 5 no longer exists in the new version
    const next: any = JSON.parse(JSON.stringify(config));
    next.sections[0].questions[0].answerOptions = [{ id: 26, optionText: 'A', score: 5, orderIndex: 1 }];
    next.sections[1].questions = next.sections[1].questions.filter((q: any) => q.id !== 5);
    expect(prefillAnswers(next, submitted)).toEqual({ 4: { numericValue: 85000 } });
    // the submitted filling carries no ids into the new one: the first save is a new filling
    expect(prefillAnswers(config, submitted)).toEqual({ 4: { numericValue: 85000 }, 5: { optionId: 13 }, 7: { optionId: 27 } });
  });

  it('finds the first section with a required question unanswered', () => {
    const sections = orderedSections(config);
    expect(firstIncompleteSection(sections, { 4: { numericValue: 1 }, 5: { optionId: 13 } })).toBe(1);
    expect(firstIncompleteSection(sections, { 4: { numericValue: 1 }, 5: { optionId: 13 }, 7: { optionId: 26 } })).toBe(-1);
    expect(isSectionComplete(sections[0], { 4: { numericValue: null } })).toBeFalse();
  });

  it('lists a filling of another questionnaire version in one section, by question order', () => {
    const filling = { ...toMifidFilling(config, { 5: { optionId: 13 }, 4: { numericValue: 10 } }), questionnaireId: 99 };
    expect(answeredSections(config, filling)).toEqual([
      { title: 'Answers', questions: [{ question: 'Income?', answer: '10' }, { question: 'Employment?', answer: 'Full-time' }] }
    ]);
  });
});

describe('loadSubmittedFilling', () => {
  const api = (result: Observable<unknown>) => ({ getCurrentMifidFillingForCustomer: () => result }) as unknown as MifidService;

  it('returns the current submitted filling', async () => {
    const filling = { questionnaireId: 1, fillingDate: '2026-10-28', responses: [], status: 'SUBMITTED' };
    expect(await loadSubmittedFilling(api(of(filling)), 'c1')).toEqual(filling as any);
  });

  it('returns null when the customer has no submitted filling', async () => {
    expect(await loadSubmittedFilling(api(throwError(() => new HttpErrorResponse({ status: 404 }))), 'c1')).toBeNull();
  });

  it('rethrows other errors', async () => {
    await expectAsync(loadSubmittedFilling(api(throwError(() => new HttpErrorResponse({ status: 500 }))), 'c1')).toBeRejected();
  });
});

describe('MifidQuestionnaireService draft storage', () => {
  const config: any = {
    questionnaireId: 1,
    sections: [{ id: 1, title: 'S', orderIndex: 1, questions: [
      { id: 7, text: 'Q?', questionType: 'SINGLE', isRequired: true, orderIndex: 1,
        answerOptions: [{ id: 26, optionText: 'A', orderIndex: 1 }, { id: 27, optionText: 'B', orderIndex: 2 }] }
    ] }]
  };
  const stored = (status: string, optionId: number): any => ({
    questionnaireId: 1, fillingId: 42, fillingDate: '2026-10-30', status,
    responses: [{ id: 900, question: { id: 7, questionType: 'SINGLE' }, answerOption: { id: optionId } }]
  });
  let api: jasmine.SpyObj<MifidService>;
  let service: MifidQuestionnaireService;

  beforeEach(() => {
    localStorage.removeItem('wmp.mifid.filling.c1');
    api = jasmine.createSpyObj<MifidService>('MifidService', [
      'getLatestValidMifidQuestionnaireConfig', 'getMifidFillingForCustomer', 'saveMifidFillingForCustomer', 'updateMifidFillingForCustomer'
    ]);
    (api.getLatestValidMifidQuestionnaireConfig as jasmine.Spy).and.returnValue(of(config));
    TestBed.configureTestingModule({ providers: [{ provide: MifidService, useValue: api }] });
    service = TestBed.inject(MifidQuestionnaireService);
  });

  afterEach(() => localStorage.removeItem('wmp.mifid.filling.c1'));

  it('PATCHes a resumed COMPLETED filling instead of creating a new one', async () => {
    localStorage.setItem('wmp.mifid.filling.c1', '42');
    (api.getMifidFillingForCustomer as jasmine.Spy).and.returnValue(of(stored('COMPLETED', 26)));
    (api.updateMifidFillingForCustomer as jasmine.Spy).and.returnValue(of(stored('COMPLETED', 27)));
    await service.load('c1');
    service.setAnswer(7, { optionId: 27 });
    await service.saveDraft();
    expect(api.saveMifidFillingForCustomer).not.toHaveBeenCalled();
    const [, fillingId, body] = (api.updateMifidFillingForCustomer as jasmine.Spy).calls.mostRecent().args;
    expect(fillingId).toBe(42);
    expect(body.responses[0].id).toBe(900);
  });

  it('starts an update from the submitted answers and saves it as a new filling', async () => {
    (api.saveMifidFillingForCustomer as jasmine.Spy).and.returnValue(of(stored('COMPLETED', 26)));
    await service.load('c1', { prefillFrom: { ...stored('SUBMITTED', 26), fillingId: 7 } });
    expect(service.answers()).toEqual({ 7: { optionId: 26 } });
    await service.saveDraft();
    expect(api.updateMifidFillingForCustomer).not.toHaveBeenCalled();
    const [, body] = (api.saveMifidFillingForCustomer as jasmine.Spy).calls.mostRecent().args;
    expect(body.fillingId).toBeUndefined();
    expect(body.responses[0].id).toBeUndefined();
    expect(service.hasDraft('c1')).toBeTrue();
  });
});
