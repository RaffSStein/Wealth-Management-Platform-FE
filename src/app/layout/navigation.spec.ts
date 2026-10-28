import {activeSection, navigationFor} from './navigation';

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
});
