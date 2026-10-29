import { fromCustomerGoals, toCustomerGoals } from './goals-form';

describe('toCustomerGoals', () => {
  const types = [
    { name: 'HOME', description: 'Buying or renovating a home' },
    { name: 'RETIREMENT', description: 'Retirement planning' }
  ];

  it('maps complete rows to CustomerGoalDTOs with the full goal type', () => {
    const goals = toCustomerGoals([
      { goalTypeName: 'HOME', targetAmount: 250000, goalTimeline: 'MEDIUM_TERM', targetDate: '2030-06-01', notes: '  Flat in Milan ' }
    ], types);
    expect(goals).toEqual([{
      goalType: { name: 'HOME', description: 'Buying or renovating a home' },
      targetAmount: 250000,
      goalTimeline: 'MEDIUM_TERM',
      targetDate: '2030-06-01',
      notes: 'Flat in Milan'
    } as any]);
  });

  it('omits empty optional fields', () => {
    const [goal] = toCustomerGoals([
      { goalTypeName: 'RETIREMENT', targetAmount: 500000, goalTimeline: 'LONG_TERM', targetDate: null, notes: '   ' }
    ], types);
    expect('targetDate' in goal).toBeFalse();
    expect('notes' in goal).toBeFalse();
  });

  it('drops incomplete rows and unknown goal types', () => {
    const goals = toCustomerGoals([
      { goalTypeName: null, targetAmount: 1, goalTimeline: 'SHORT_TERM', targetDate: null, notes: null },
      { goalTypeName: 'HOME', targetAmount: null, goalTimeline: 'SHORT_TERM', targetDate: null, notes: null },
      { goalTypeName: 'HOME', targetAmount: 1, goalTimeline: null, targetDate: null, notes: null },
      { goalTypeName: 'YACHT', targetAmount: 1, goalTimeline: 'SHORT_TERM', targetDate: null, notes: null }
    ], types);
    expect(goals).toEqual([]);
  });

  it('round-trips saved goals with their ids, so a re-save updates instead of duplicating', () => {
    const rows = fromCustomerGoals([
      { id: 7, goalType: types[0], targetAmount: 250000, goalTimeline: 'MEDIUM_TERM', targetDate: '2030-06-01' }
    ]);
    expect(rows).toEqual([
      { id: 7, savedGoalTypeName: 'HOME', goalTypeName: 'HOME', targetAmount: 250000, goalTimeline: 'MEDIUM_TERM',
        targetDate: '2030-06-01', notes: null }
    ]);
    expect(toCustomerGoals(rows, types)[0].id).toBe(7);
  });

  it('sends a saved goal whose type changed as a new goal (the BE ignores type changes on update)', () => {
    const [goal] = toCustomerGoals([
      { id: 7, savedGoalTypeName: 'HOME', goalTypeName: 'RETIREMENT', targetAmount: 1, goalTimeline: 'LONG_TERM',
        targetDate: null, notes: null }
    ], types);
    expect('id' in goal).toBeFalse();
    expect(goal.goalType.name).toBe('RETIREMENT');
  });

  it('sends no id for new goals', () => {
    const [goal] = toCustomerGoals([
      { goalTypeName: 'HOME', targetAmount: 1, goalTimeline: 'SHORT_TERM', targetDate: null, notes: null }
    ], types);
    expect('id' in goal).toBeFalse();
  });
});
