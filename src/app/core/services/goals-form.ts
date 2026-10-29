import {CustomerGoalDTO, GoalTypeDTO} from '../../api/customer-service';

export type GoalTimeline = 'SHORT_TERM' | 'MEDIUM_TERM' | 'LONG_TERM';

/** One goal row as edited in the Investment goals step. */
export interface GoalFormRow {
  /** BE id of a saved goal: sent back so a re-save updates it instead of adding a copy. */
  id?: number | null;
  goalTypeName: string | null;
  targetAmount: number | null;
  goalTimeline: GoalTimeline | null;
  targetDate: string | null; // yyyy-mm-dd
  notes: string | null;
}

export const GOAL_TIMELINES: { label: string; value: GoalTimeline }[] = [
  {label: 'Short term', value: 'SHORT_TERM'},
  {label: 'Medium term', value: 'MEDIUM_TERM'},
  {label: 'Long term', value: 'LONG_TERM'}
];

/**
 * Maps edited rows to the customer-service payload. Rows missing a required field (type, amount, timeline)
 * are dropped; the form validators prevent that from happening on submit.
 */
export function toCustomerGoals(rows: GoalFormRow[], goalTypes: GoalTypeDTO[]): CustomerGoalDTO[] {
  return rows.flatMap(row => {
    const goalType = goalTypes.find(t => t.name === row.goalTypeName);
    if (!goalType || row.targetAmount == null || !row.goalTimeline) return [];
    const notes = row.notes?.trim();
    return [{
      ...(row.id != null ? {id: row.id} : {}),
      goalType,
      targetAmount: row.targetAmount,
      goalTimeline: row.goalTimeline,
      ...(row.targetDate ? {targetDate: row.targetDate} : {}),
      ...(notes ? {notes} : {})
    } as CustomerGoalDTO];
  });
}

/** Saved goals (CustomerDTO.customerGoals) as form rows, keeping their ids. */
export function fromCustomerGoals(goals: CustomerGoalDTO[] | null | undefined): GoalFormRow[] {
  return (goals ?? []).map(g => ({
    id: g.id ?? null,
    goalTypeName: g.goalType?.name ?? null,
    targetAmount: g.targetAmount ?? null,
    goalTimeline: (g.goalTimeline as GoalTimeline | undefined) ?? null,
    targetDate: g.targetDate ?? null,
    notes: g.notes ?? null
  }));
}
