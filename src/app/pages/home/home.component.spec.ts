import {homeNoticeFor} from './home.component';

describe('homeNoticeFor', () => {
  const kind = (status: string | undefined, staff = false, loadFailed = false) =>
    homeNoticeFor({staff, loadFailed, status})?.kind ?? null;

  it('shows the dashboard only to an onboarded customer', () => {
    expect(kind('ACTIVE')).toBeNull();
    expect(kind('ACTIVE', true)).toBeNull();
  });

  it('offers the onboarding to a customer without a record', () => {
    expect(kind(undefined)).toBe('start');
  });

  it('does not mistake a failed load for a customer without a record', () => {
    expect(kind(undefined, false, true)).toBe('load-failed');
  });

  it('never offers an advisor its own onboarding', () => {
    expect(kind(undefined, true)).toBe('no-client');
  });

  it('follows the onboarding lifecycle', () => {
    expect(kind('DRAFT')).toBe('draft');
    expect(kind('PENDING_VERIFICATION')).toBe('pending');
    expect(kind('REJECTED')).toBe('rejected');
    expect(kind('CLOSED')).toBe('closed');
  });
});
