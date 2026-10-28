import {CustomerDTO, CustomerFinancialDTO, CustomerGoalDTO} from '../../api/customer-service';

export interface AdvisorStats {
  total: number;
  active: number;
  onboarding: number; // DRAFT
  pendingVerification: number;
  /** Count of clients per risk profile code (clients without a profile are not counted). */
  byProfile: Record<string, number>;
}

/** Aggregates the advisor's client list (CustomerDTOs from the disambiguation endpoint). */
export function advisorStats(customers: CustomerDTO[]): AdvisorStats {
  const stats: AdvisorStats = {total: customers.length, active: 0, onboarding: 0, pendingVerification: 0, byProfile: {}};
  for (const c of customers) {
    if (c.customerStatus === 'ACTIVE') stats.active++;
    else if (c.customerStatus === 'DRAFT') stats.onboarding++;
    else if (c.customerStatus === 'PENDING_VERIFICATION') stats.pendingVerification++;
    const profile = c.riskProfile?.profile;
    if (profile && profile.toUpperCase() !== 'UNDEFINED') stats.byProfile[profile] = (stats.byProfile[profile] ?? 0) + 1;
  }
  return stats;
}

const TIMELINE_YEARS: Record<string, string> = {SHORT_TERM: '< 3 years', MEDIUM_TERM: '3–10 years', LONG_TERM: '> 10 years'};

/** Human horizon for a goal: years left until targetDate, else the timeline band. */
export function goalHorizon(goal: CustomerGoalDTO, today = new Date()): string {
  if (goal.targetDate) {
    const target = new Date(goal.targetDate + 'T00:00:00');
    const years = (target.getTime() - today.getTime()) / (365.25 * 24 * 3600 * 1000);
    if (years <= 0) return 'Due';
    if (years < 1) return `${Math.max(1, Math.round(years * 12))} months`;
    return `${Math.round(years)} years`;
  }
  return goal.goalTimeline ? TIMELINE_YEARS[goal.goalTimeline] ?? '—' : '—';
}

export interface FinancialSnapshot {
  income: number;
  investments: number;
  expenses: number;
}

/**
 * Splits the customer's financial records: the onboarding stores annual income under INCOME types, current
 * investments under the INVESTMENTS type, and expenses under EXPENSE types.
 */
export function financialSnapshot(financials: CustomerFinancialDTO[] | undefined): FinancialSnapshot {
  const snap: FinancialSnapshot = {income: 0, investments: 0, expenses: 0};
  for (const f of financials ?? []) {
    const type = f.financialType?.type;
    if (f.financialType?.name === 'INVESTMENTS') snap.investments += f.amount ?? 0;
    else if (type === 'INCOME') snap.income += f.amount ?? 0;
    else if (type === 'EXPENSE') snap.expenses += f.amount ?? 0;
  }
  return snap;
}
