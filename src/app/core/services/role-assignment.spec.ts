import {bankLabel, roleAssignmentsOf, sameBranch, tokenAssignment} from './role-assignment';

/** Unsigned test JWT with the given claims (base64url payload). */
export function testToken(claims: object): string {
  const b64url = (o: object) => btoa(JSON.stringify(o)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${b64url({alg: 'none'})}.${b64url(claims)}.sig`;
}

describe('role assignment', () => {
  it('reads the active bank, branch and roles from the token claims', () => {
    expect(tokenAssignment(testToken({sub: 'u1', tenantId: 'BANK-A', branchCode: 'BR-01', roles: ['ADVISOR']})))
      .toEqual({bankCode: 'BANK-A', branchCode: 'BR-01', roles: ['ADVISOR']});
  });

  it('parses roles exactly and ignores unknown ones', () => {
    const token = testToken({tenantId: 'PLATFORM', branchCode: 'PLATFORM', roles: ['PLATFORM_ADMIN', 'advisor', 'SUPERVISOR']});
    expect(tokenAssignment(token)?.roles).toEqual(['PLATFORM_ADMIN']);
    expect(tokenAssignment(testToken({tenantId: 'A', branchCode: 'B'}))?.roles).toEqual([]);
  });

  it('returns null without a role assignment or a readable token', () => {
    expect(tokenAssignment(testToken({sub: 'u1', roles: ['CUSTOMER']}))).toBeNull();
    expect(tokenAssignment('not-a-jwt')).toBeNull();
    expect(tokenAssignment('a.%%%.c')).toBeNull();
    expect(tokenAssignment(null)).toBeNull();
  });

  it('groups branch roles by bank and branch', () => {
    expect(roleAssignmentsOf([
      {bankCode: 'BANK-A', branchCode: 'BR-01', role: 'ADVISOR'},
      {bankCode: 'BANK-B', branchCode: 'BR-01', role: 'CUSTOMER'},
      {bankCode: 'BANK-A', branchCode: 'BR-01', role: 'SUPERVISOR'},
      {bankCode: 'BANK-A', role: 'ADVISOR'}
    ])).toEqual([
      {bankCode: 'BANK-A', branchCode: 'BR-01', roles: ['ADVISOR', 'SUPERVISOR']},
      {bankCode: 'BANK-B', branchCode: 'BR-01', roles: ['CUSTOMER']}
    ]);
  });

  it('tells branches apart by bank as well as branch code', () => {
    expect(sameBranch({bankCode: 'A', branchCode: 'B1'}, {bankCode: 'A', branchCode: 'B1'})).toBeTrue();
    expect(sameBranch({bankCode: 'A', branchCode: 'B1'}, {bankCode: 'B', branchCode: 'B1'})).toBeFalse();
    expect(sameBranch(null, {bankCode: 'A', branchCode: 'B1'})).toBeFalse();
  });

  it('names the platform pseudo bank', () => {
    expect(bankLabel('PLATFORM')).toBe('Platform');
    expect(bankLabel('BANK_A')).toBe('BANK_A');
  });
});
