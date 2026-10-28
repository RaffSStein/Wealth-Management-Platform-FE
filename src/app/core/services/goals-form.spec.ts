import { toCustomerGoals } from './goals-form';

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
});
