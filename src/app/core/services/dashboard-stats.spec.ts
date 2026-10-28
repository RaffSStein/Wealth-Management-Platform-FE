import { advisorStats, financialSnapshot, goalHorizon } from './dashboard-stats';
import { MockPortfolioDataService, seededRandom } from './mock-portfolio-data.service';
import { firstValueFrom } from 'rxjs';

describe('dashboard stats', () => {
  it('aggregates the advisor client list', () => {
    const stats = advisorStats([
      { customerStatus: 'ACTIVE', riskProfile: { profile: 'BALANCED', score: 100 } },
      { customerStatus: 'ACTIVE', riskProfile: { profile: 'BALANCED', score: 104 } },
      { customerStatus: 'DRAFT' },
      { customerStatus: 'PENDING_VERIFICATION', riskProfile: { profile: 'UNDEFINED' } }
    ] as any);
    expect(stats).toEqual({ total: 4, active: 2, onboarding: 1, pendingVerification: 1, byProfile: { BALANCED: 2 } });
  });

  it('describes a goal horizon from its date, else its timeline', () => {
    const today = new Date(2026, 9, 28);
    expect(goalHorizon({ targetDate: '2036-10-28' } as any, today)).toBe('10 years');
    expect(goalHorizon({ targetDate: '2027-04-28' } as any, today)).toBe('6 months');
    expect(goalHorizon({ targetDate: '2020-01-01' } as any, today)).toBe('Due');
    expect(goalHorizon({ goalTimeline: 'LONG_TERM' } as any, today)).toBe('> 10 years');
  });

  it('splits financial records into income, investments and expenses', () => {
    expect(financialSnapshot([
      { financialType: { name: 'SALARY', type: 'INCOME' }, amount: 85000 },
      { financialType: { name: 'INVESTMENTS', type: 'INCOME' }, amount: 120000 },
      { financialType: { name: 'TRAVELS', type: 'EXPENSE' }, amount: 18000 }
    ] as any)).toEqual({ income: 85000, investments: 120000, expenses: 18000 });
    expect(financialSnapshot(undefined)).toEqual({ income: 0, investments: 0, expenses: 0 });
  });
});

describe('MockPortfolioDataService', () => {
  const svc = new MockPortfolioDataService();

  it('is deterministic per customer', async () => {
    const a = await firstValueFrom(svc.getSummary('c-1'));
    const b = await firstValueFrom(svc.getSummary('c-1'));
    const c = await firstValueFrom(svc.getSummary('c-2'));
    expect(a).toEqual(b);
    expect(a.total).not.toBe(c.total);
    expect(a.isSample).toBeTrue();
    expect(seededRandom('x')()).toBe(seededRandom('x')());
  });

  it('ends the value history at the current total and allocation sums to 100%', async () => {
    const summary = await firstValueFrom(svc.getSummary('c-1'));
    const history = await firstValueFrom(svc.getValueHistory('c-1', '1M'));
    expect(history.length).toBe(30);
    expect(history[history.length - 1].value).toBeCloseTo(summary.total, 0);
    const allocation = await firstValueFrom(svc.getAllocation('c-1'));
    expect(allocation.reduce((s, a) => s + a.pct, 0)).toBeCloseTo(100, 5);
  });
});
