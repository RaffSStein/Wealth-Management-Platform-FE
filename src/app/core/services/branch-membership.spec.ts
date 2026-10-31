import {activeBranchFromToken, membershipsOf, sameBranch} from './branch-membership';

/** Unsigned test JWT with the given claims (base64url payload). */
export function testToken(claims: object): string {
  const b64url = (o: object) => btoa(JSON.stringify(o)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${b64url({alg: 'none'})}.${b64url(claims)}.sig`;
}

describe('branch membership', () => {
  it('reads the active bank and branch from the token claims', () => {
    expect(activeBranchFromToken(testToken({sub: 'u1', tenantId: 'BANK-A', branchCode: 'BR-01', roles: ['ADVISOR']})))
      .toEqual({bankCode: 'BANK-A', branchCode: 'BR-01'});
  });

  it('returns null without a membership or a readable token', () => {
    expect(activeBranchFromToken(testToken({sub: 'u1', roles: ['CUSTOMER']}))).toBeNull();
    expect(activeBranchFromToken('not-a-jwt')).toBeNull();
    expect(activeBranchFromToken('a.%%%.c')).toBeNull();
    expect(activeBranchFromToken(null)).toBeNull();
  });

  it('groups branch roles by bank and branch', () => {
    expect(membershipsOf([
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
});
