/**
 * Navigation model for the authenticated shell.
 * Top bar shows the sections; the side nav shows the items of the active section.
 */
export interface NavItem {
  label: string;
  icon: string; // Material Symbols name
  path: string;
  exact?: boolean; // default true: only the exact path marks the item active
}

export interface NavSection {
  key: string;
  label: string;
  path: string; // section landing page
  items: NavItem[];
}

export interface NavigationContext {
  isAdvisor: boolean;
  actingAsClient: boolean;
}

const CUSTOMER_SECTIONS: NavSection[] = [
  {
    key: 'account', label: 'Account', path: '/app/home', items: [
      {label: 'Home', icon: 'home', path: '/app/home'},
      {label: 'Transactions', icon: 'receipt_long', path: '/app/transactions'},
      {label: 'Assets', icon: 'pie_chart', path: '/app/assets'},
      {label: 'Bank transfers', icon: 'account_balance', path: '/app/bank-transfers'},
      {label: 'Tax credits', icon: 'balance', path: '/app/tax-credits'},
      {label: 'Securities transfer', icon: 'swap_horiz', path: '/app/securities-transfer'}
    ]
  },
  {
    key: 'investments', label: 'Investments', path: '/app/investments', items: [
      {label: 'Overview', icon: 'dashboard', path: '/app/investments'},
      {label: 'Positions', icon: 'list', path: '/app/investments/positions'},
      {label: 'Orders', icon: 'assignment', path: '/app/investments/orders'},
      {label: 'Performance', icon: 'trending_up', path: '/app/investments/performance'},
      {label: 'Allocation', icon: 'donut_large', path: '/app/investments/allocation'}
    ]
  },
  {
    key: 'news-markets', label: 'Markets', path: '/app/news-markets', items: [
      {label: 'Overview', icon: 'dashboard', path: '/app/news-markets'},
      {label: 'Market news', icon: 'article', path: '/app/news-markets/news'},
      {label: 'Indices', icon: 'stacked_line_chart', path: '/app/news-markets/indices'},
      {label: 'Currencies', icon: 'currency_exchange', path: '/app/news-markets/currencies'},
      {label: 'Commodities', icon: 'oil_barrel', path: '/app/news-markets/commodities'}
    ]
  }
];

const ADVISOR_SECTIONS: NavSection[] = [
  {
    key: 'workspace', label: 'Workspace', path: '/app/advisor', items: [
      {label: 'Overview', icon: 'space_dashboard', path: '/app/advisor'},
      {label: 'Clients', icon: 'groups', path: '/app/advisor/clients'},
      {label: 'MiFID reviews', icon: 'fact_check', path: '/app/advisor/reviews'},
      {label: 'Proposals', icon: 'request_quote', path: '/app/advisor/proposals'},
      {label: 'Orders', icon: 'assignment', path: '/app/advisor/orders'}
    ]
  }
];

/** Sections available in the given context: advisors see their workspace unless they are acting as a client. */
export function navigationFor(ctx: NavigationContext): NavSection[] {
  return ctx.isAdvisor && !ctx.actingAsClient ? ADVISOR_SECTIONS : CUSTOMER_SECTIONS;
}

/** The section owning `url`: longest matching section/item path wins; falls back to the first section. */
export function activeSection(url: string, sections: NavSection[]): NavSection | undefined {
  const path = url.split(/[?#]/)[0];
  let best: { section: NavSection; length: number } | undefined;
  for (const section of sections) {
    for (const candidate of [section.path, ...section.items.map(i => i.path)]) {
      const matches = path === candidate || path.startsWith(candidate + '/');
      if (matches && (!best || candidate.length > best.length)) best = {section, length: candidate.length};
    }
  }
  return best?.section ?? sections[0];
}
