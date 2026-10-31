import {homePathFor} from './home-path';
import {WmpRole} from './role-assignment';

describe('homePathFor', () => {
  const roles = (...r: WmpRole[]) => new Set<WmpRole>(r);

  it('sends admins to the admin area, whatever else they hold', () => {
    expect(homePathFor(roles('BANK_ADMIN'), false)).toBe('/app/admin');
    expect(homePathFor(roles('PLATFORM_ADMIN'), true)).toBe('/app/admin');
    expect(homePathFor(roles('ADVISOR', 'BANK_ADMIN'), false)).toBe('/app/admin');
  });

  it('sends advisors to their workspace unless acting for a client', () => {
    expect(homePathFor(roles('ADVISOR'), false)).toBe('/app/advisor');
    expect(homePathFor(roles('ADVISOR'), true)).toBe('/app/home');
  });

  it('sends customers to customer selection until a profile is selected', () => {
    expect(homePathFor(roles('CUSTOMER'), false)).toBe('/onboarding/disambiguation');
    expect(homePathFor(roles('CUSTOMER'), true)).toBe('/app/home');
  });
});
