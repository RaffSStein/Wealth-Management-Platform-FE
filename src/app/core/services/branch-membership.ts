import {UserBranchRoleDTO} from '../../api/user-service';

/** The bank (tenant) and branch a token is issued for. */
export interface ActiveBranch {
  bankCode: string;
  branchCode: string;
}

/** One branch the user belongs to, with the roles held there. */
export interface BranchMembership extends ActiveBranch {
  roles: string[];
}

/**
 * Reads the active membership from a user-service JWT (`tenantId` = bank code, `branchCode`).
 * Only for display and role scoping: the token is never validated client-side.
 * Returns null for a missing or malformed token, or a token issued without a membership.
 */
export function activeBranchFromToken(token: string | null | undefined): ActiveBranch | null {
  const payload = token?.split('.')[1];
  if (!payload) return null;
  try {
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const json = new TextDecoder().decode(Uint8Array.from(atob(base64), c => c.charCodeAt(0)));
    const claims = JSON.parse(json) as {tenantId?: unknown; branchCode?: unknown};
    return typeof claims.tenantId === 'string' && typeof claims.branchCode === 'string'
      ? {bankCode: claims.tenantId, branchCode: claims.branchCode}
      : null;
  } catch {
    return null;
  }
}

/** Groups `/me` branch roles by membership (bank + branch), in the order the BE returns them. */
export function membershipsOf(branchRoles: ReadonlyArray<UserBranchRoleDTO> | null | undefined): BranchMembership[] {
  const byKey = new Map<string, BranchMembership>();
  for (const r of branchRoles ?? []) {
    if (!r.bankCode || !r.branchCode) continue;
    const key = `${r.bankCode}/${r.branchCode}`;
    const membership = byKey.get(key) ?? {bankCode: r.bankCode, branchCode: r.branchCode, roles: []};
    if (r.role && !membership.roles.includes(r.role)) membership.roles.push(r.role);
    byKey.set(key, membership);
  }
  return [...byKey.values()];
}

type BranchRef = {bankCode?: string; branchCode?: string} | null | undefined;

export const sameBranch = (a: BranchRef, b: BranchRef): boolean =>
  !!a?.bankCode && !!a.branchCode && a.bankCode === b?.bankCode && a.branchCode === b?.branchCode;
