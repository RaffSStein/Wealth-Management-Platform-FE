import { answersFromFilling, findBand, orderedSections, profileDisplay, riskBands, toMifidFilling } from './mifid-questionnaire.service';

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
});
