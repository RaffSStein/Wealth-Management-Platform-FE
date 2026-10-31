import {UserBranchRoleDTO} from '../../api/user-service';

/** Platform roles, least to most privileged; mirrors the BE `WmpRole` enum (platform-core). */
export const WMP_ROLES = ['CUSTOMER', 'ADVISOR', 'BANK_ADMIN', 'PLATFORM_ADMIN'] as const;
export type WmpRole = typeof WMP_ROLES[number];

/** Bank code of the platform admins' pseudo tenant: it owns no bank data. */
export const PLATFORM_TENANT = 'PLATFORM';

/** Parses a role name exactly, like the BE: an unknown name grants nothing. */
export const parseRole = (value: unknown): WmpRole | null =>
  WMP_ROLES.includes(value as WmpRole) ? value as WmpRole : null;

/** The bank (tenant) and branch a token is issued for. */
export interface ActiveBranch {
  bankCode: string;
  branchCode: string;
}

/** The active role assignment of a token: its bank, branch and the roles it carries. */
export interface TokenAssignment extends ActiveBranch {
  roles: WmpRole[];
}

/** One branch the user holds roles in (from /me), with those roles. */
export interface RoleAssignmentSummary extends ActiveBranch {
  roles: string[];
}

/**
 * Reads the active role assignment from a user-service JWT (`tenantId` = bank code, `branchCode`, `roles`).
 * Only for display and role scoping: the token is never validated client-side.
 * Returns null for a missing or malformed token, or a token issued without a role assignment.
 */
export function tokenAssignment(token: string | null | undefined): TokenAssignment | null {
  const payload = token?.split('.')[1];
  if (!payload) return null;
  try {
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const json = new TextDecoder().decode(Uint8Array.from(atob(base64), c => c.charCodeAt(0)));
    const claims = JSON.parse(json) as {tenantId?: unknown; branchCode?: unknown; roles?: unknown};
    if (typeof claims.tenantId !== 'string' || typeof claims.branchCode !== 'string') return null;
    const roles = Array.isArray(claims.roles)
      ? claims.roles.map(parseRole).filter((r): r is WmpRole => r != null)
      : [];
    return {bankCode: claims.tenantId, branchCode: claims.branchCode, roles};
  } catch {
    return null;
  }
}

/** Groups `/me` branch roles by bank + branch, in the order the BE returns them. */
export function roleAssignmentsOf(branchRoles: ReadonlyArray<UserBranchRoleDTO> | null | undefined): RoleAssignmentSummary[] {
  const byKey = new Map<string, RoleAssignmentSummary>();
  for (const r of branchRoles ?? []) {
    if (!r.bankCode || !r.branchCode) continue;
    const key = `${r.bankCode}/${r.branchCode}`;
    const assignment = byKey.get(key) ?? {bankCode: r.bankCode, branchCode: r.branchCode, roles: []};
    if (r.role && !assignment.roles.includes(r.role)) assignment.roles.push(r.role);
    byKey.set(key, assignment);
  }
  return [...byKey.values()];
}

type BranchRef = {bankCode?: string; branchCode?: string} | null | undefined;

export const sameBranch = (a: BranchRef, b: BranchRef): boolean =>
  !!a?.bankCode && !!a.branchCode && a.bankCode === b?.bankCode && a.branchCode === b?.branchCode;

/** Display name of a bank code: the platform admins' pseudo tenant reads "Platform". */
export const bankLabel = (bankCode: string): string => bankCode === PLATFORM_TENANT ? 'Platform' : bankCode;

const ROLE_LABELS: Record<WmpRole, string> = {
  CUSTOMER: 'Customer', ADVISOR: 'Advisor', BANK_ADMIN: 'Bank admin', PLATFORM_ADMIN: 'Platform admin'
};

/** Display name of a role; an unknown name is shown as sent. */
export const roleLabel = (role: string | null | undefined): string => {
  const parsed = parseRole(role);
  return parsed ? ROLE_LABELS[parsed] : role ?? '';
};
