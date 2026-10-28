import {CustomerGoalDTO, GoalTypeDTO} from '../../api/customer-service';

export type GoalTimeline = 'SHORT_TERM' | 'MEDIUM_TERM' | 'LONG_TERM';

/** One goal row as edited in the Investment goals step. */
export interface GoalFormRow {
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
      goalType,
      targetAmount: row.targetAmount,
      goalTimeline: row.goalTimeline,
      ...(row.targetDate ? {targetDate: row.targetDate} : {}),
      ...(notes ? {notes} : {})
    } as CustomerGoalDTO];
  });
}
