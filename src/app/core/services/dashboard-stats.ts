import {AdvisorDashboardStatisticsDTO, CustomerFinancialDTO, CustomerGoalDTO} from '../../api/customer-service';

export interface AdvisorStats {
  total: number;
  active: number;
  onboarding: number; // DRAFT
  pendingVerification: number;
  /** Count of clients per risk profile code (clients without a profile are not counted). */
  byProfile: Record<string, number>;
}

/** The advisor's counts from the BE. UNDEFINED is stored when no band matched a MiFID score: it counts as no profile. */
export function advisorStats(dto?: AdvisorDashboardStatisticsDTO | null): AdvisorStats {
  const byProfile: Record<string, number> = {};
  for (const {profile, count} of dto?.riskProfiles ?? []) {
    if (profile && profile.toUpperCase() !== 'UNDEFINED') byProfile[profile] = (byProfile[profile] ?? 0) + (count ?? 0);
  }
  return {
    total: dto?.total ?? 0,
    active: dto?.active ?? 0,
    onboarding: dto?.onboarding ?? 0,
    pendingVerification: dto?.pendingVerification ?? 0,
    byProfile
  };
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
