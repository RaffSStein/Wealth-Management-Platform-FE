import {CustomerGoalDTO, GoalTypeDTO} from '../../api/customer-service';

export type GoalTimeline = 'SHORT_TERM' | 'MEDIUM_TERM' | 'LONG_TERM';

/** One goal row as edited in the Investment goals step. */
export interface GoalFormRow {
  /** BE id of a saved goal: sent back so a re-save updates it instead of adding a copy. */
  id?: number | null;
  /** Goal type the saved goal had when loaded: the BE ignores type changes on an update. */
  savedGoalTypeName?: string | null;
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
 * A saved goal keeps its id unless its type changed: the BE ignores type changes on an update, so it is sent as a
 * new goal instead (the BE replaces the set, so the old one is deleted).
 */
function keepsId(row: GoalFormRow): boolean {
  return row.id != null && (row.savedGoalTypeName == null || row.savedGoalTypeName === row.goalTypeName);
}

/**
 * Maps edited rows to the customer-service payload (the customer's full set: the BE deletes goals left out). Rows missing a required field (type, amount, timeline)
 * are dropped; the form validators prevent that from happening on submit.
 */
export function toCustomerGoals(rows: GoalFormRow[], goalTypes: GoalTypeDTO[]): CustomerGoalDTO[] {
  return rows.flatMap(row => {
    const goalType = goalTypes.find(t => t.name === row.goalTypeName);
    if (!goalType || row.targetAmount == null || !row.goalTimeline) return [];
    const notes = row.notes?.trim();
    return [{
      ...(keepsId(row) ? {id: row.id} : {}),
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
    savedGoalTypeName: g.goalType?.name ?? null,
    goalTypeName: g.goalType?.name ?? null,
    targetAmount: g.targetAmount ?? null,
    goalTimeline: (g.goalTimeline as GoalTimeline | undefined) ?? null,
    targetDate: g.targetDate ?? null,
    notes: g.notes ?? null
  }));
}
