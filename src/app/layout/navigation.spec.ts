import {activeSection, featureOf, navigationFor} from './navigation';

describe('navigation', () => {
  it('shows customer sections to customers', () => {
    const keys = navigationFor({isAdvisor: false, actingAsClient: false}).map(s => s.key);
    expect(keys).toEqual(['account', 'investments', 'news-markets']);
  });

  it('shows the advisor workspace to advisors', () => {
    const keys = navigationFor({isAdvisor: true, actingAsClient: false}).map(s => s.key);
    expect(keys).toEqual(['workspace']);
  });

  it('shows customer sections to advisors acting as a client', () => {
    const keys = navigationFor({isAdvisor: true, actingAsClient: true}).map(s => s.key);
    expect(keys).toEqual(['account', 'investments', 'news-markets']);
  });

  it('resolves the active section from the url', () => {
    const sections = navigationFor({isAdvisor: false, actingAsClient: false});
    expect(activeSection('/app/investments/orders?x=1', sections)?.key).toBe('investments');
    expect(activeSection('/app/bank-transfers', sections)?.key).toBe('account');
    expect(activeSection('/app/news-markets', sections)?.key).toBe('news-markets');
  });

  it('falls back to the first section for unknown urls', () => {
    const sections = navigationFor({isAdvisor: true, actingAsClient: false});
    expect(activeSection('/somewhere', sections)?.key).toBe('workspace');
  });

  it('shows the admin area to admins', () => {
    const sections = navigationFor({isAdvisor: false, isAdmin: true, actingAsClient: false, can: () => false});
    expect(sections.map(s => s.key)).toEqual(['admin']);
    expect(sections[0].items.map(i => i.path)).toContain('/app/admin/approvals');
  });

  it('drops items and sections the catalogue does not let the user view', () => {
    const viewable = new Set(['ACCOUNT/INVESTOR_PROFILE', 'ACCOUNT/ASSETS', 'INVESTMENTS/OVERVIEW']);
    const sections = navigationFor({isAdvisor: false, actingAsClient: false, can: (s, f) => viewable.has(`${s}/${f}`)});
    expect(sections.map(s => s.key)).toEqual(['account', 'investments']);
    const account = sections[0];
    expect(account.items.map(i => i.label)).toEqual(['Investor profile', 'Assets']);
    // the section landed on Home, which is gone: it lands on its first remaining item
    expect(account.path).toBe('/app/investor-profile');
    expect(sections[1].path).toBe('/app/investments');
  });

  it('maps a page path to its catalogue section and feature', () => {
    expect(featureOf('/app/investments/orders')).toEqual({section: 'INVESTMENTS', feature: 'ORDERS'});
    expect(featureOf('/app/advisor/orders')).toEqual({section: 'WORKSPACE', feature: 'ORDERS'});
    expect(featureOf('/app/admin')).toBeNull();
  });
});
