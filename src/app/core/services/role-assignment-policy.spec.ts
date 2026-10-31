import {HttpErrorResponse} from '@angular/common/http';
import {WmpRole} from './role-assignment';
import {assignableRoles, canRevoke, needsApproval, roleAssignmentErrorMessage} from './role-assignment-policy';

describe('role assignment policy', () => {
  const roles = (...r: WmpRole[]) => new Set<WmpRole>(r);

  it('offers the roles each caller may assign', () => {
    expect(assignableRoles(roles('PLATFORM_ADMIN'))).toEqual(['BANK_ADMIN']);
    expect(assignableRoles(roles('BANK_ADMIN'))).toEqual(['CUSTOMER', 'ADVISOR']);
    expect(assignableRoles(roles('ADVISOR'))).toEqual(['CUSTOMER']);
    expect(assignableRoles(roles('CUSTOMER'))).toEqual([]);
  });

  it('lets each caller revoke only the roles it may manage', () => {
    expect(canRevoke(roles('PLATFORM_ADMIN'), 'BANK_ADMIN')).toBeTrue();
    expect(canRevoke(roles('PLATFORM_ADMIN'), 'ADVISOR')).toBeFalse();
    expect(canRevoke(roles('BANK_ADMIN'), 'ADVISOR')).toBeTrue();
    expect(canRevoke(roles('BANK_ADMIN'), 'BANK_ADMIN')).toBeFalse();
    expect(canRevoke(roles('ADVISOR'), 'CUSTOMER')).toBeTrue();
    expect(canRevoke(roles('BANK_ADMIN'), 'PLATFORM_ADMIN')).toBeFalse();
    expect(canRevoke(roles('BANK_ADMIN'), 'SUPERVISOR')).toBeFalse();
  });

  it('needs a second admin for staff roles only', () => {
    expect(needsApproval('CUSTOMER')).toBeFalse();
    expect(needsApproval('ADVISOR')).toBeTrue();
    expect(needsApproval('BANK_ADMIN')).toBeTrue();
  });

  it('explains the BE answers', () => {
    expect(roleAssignmentErrorMessage(new HttpErrorResponse({status: 409}))).toContain('already have this role');
    expect(roleAssignmentErrorMessage(new HttpErrorResponse({status: 404}))).toContain("doesn't exist in this bank");
    expect(roleAssignmentErrorMessage(new Error('x'))).toContain("couldn't be saved");
  });
});
