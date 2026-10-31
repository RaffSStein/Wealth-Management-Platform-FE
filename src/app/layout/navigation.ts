/**
 * Navigation model for the authenticated shell.
 * Top bar shows the sections; the side nav shows the items of the active section.
 */
export interface NavItem {
  label: string;
  icon: string; // Material Symbols name
  path: string;
  exact?: boolean; // default true: only the exact path marks the item active
  feature?: string; // feature code in the BE permission catalogue (profiler-service), unique within the section
}

export interface NavSection {
  key: string;
  label: string;
  path: string; // section landing page
  code?: string; // section code in the BE permission catalogue; sections without one are not permission-driven
  items: NavItem[];
}

/** Whether the active role assignment may use a catalogue feature (`PermissionStore.can`). */
export type PermissionCheck = (section: string, feature: string) => boolean;

export interface NavigationContext {
  isAdvisor: boolean;
  isAdmin?: boolean;
  actingAsClient: boolean;
  /** Filters catalogue items; omitted while the permissions are unknown (the role-based menu is shown). */
  can?: PermissionCheck;
}

const CUSTOMER_SECTIONS: NavSection[] = [
  {
    key: 'account', code: 'ACCOUNT', label: 'Account', path: '/app/home', items: [
      {label: 'Home', icon: 'home', path: '/app/home', feature: 'HOME'},
      {label: 'Investor profile', icon: 'fact_check', path: '/app/investor-profile', exact: false, feature: 'INVESTOR_PROFILE'},
      {label: 'Transactions', icon: 'receipt_long', path: '/app/transactions', feature: 'TRANSACTIONS'},
      {label: 'Assets', icon: 'pie_chart', path: '/app/assets', feature: 'ASSETS'},
      {label: 'Bank transfers', icon: 'account_balance', path: '/app/bank-transfers', feature: 'BANK_TRANSFERS'},
      {label: 'Tax credits', icon: 'balance', path: '/app/tax-credits', feature: 'TAX_CREDITS'},
      {label: 'Securities transfer', icon: 'swap_horiz', path: '/app/securities-transfer', feature: 'SECURITIES_TRANSFER'}
    ]
  },
  {
    key: 'investments', code: 'INVESTMENTS', label: 'Investments', path: '/app/investments', items: [
      {label: 'Overview', icon: 'dashboard', path: '/app/investments', feature: 'OVERVIEW'},
      {label: 'Positions', icon: 'list', path: '/app/investments/positions', feature: 'POSITIONS'},
      {label: 'Orders', icon: 'assignment', path: '/app/investments/orders', feature: 'ORDERS'},
      {label: 'Performance', icon: 'trending_up', path: '/app/investments/performance', feature: 'PERFORMANCE'},
      {label: 'Allocation', icon: 'donut_large', path: '/app/investments/allocation', feature: 'ALLOCATION'}
    ]
  },
  {
    key: 'news-markets', code: 'NEWS_MARKETS', label: 'Markets', path: '/app/news-markets', items: [
      {label: 'Overview', icon: 'dashboard', path: '/app/news-markets', feature: 'OVERVIEW'},
      {label: 'Market news', icon: 'article', path: '/app/news-markets/news', feature: 'MARKET_NEWS'},
      {label: 'Indices', icon: 'stacked_line_chart', path: '/app/news-markets/indices', feature: 'INDICES'},
      {label: 'Currencies', icon: 'currency_exchange', path: '/app/news-markets/currencies', feature: 'CURRENCIES'},
      {label: 'Commodities', icon: 'oil_barrel', path: '/app/news-markets/commodities', feature: 'COMMODITIES'}
    ]
  }
];

const ADVISOR_SECTIONS: NavSection[] = [
  {
    key: 'workspace', code: 'WORKSPACE', label: 'Workspace', path: '/app/advisor', items: [
      {label: 'Overview', icon: 'space_dashboard', path: '/app/advisor', feature: 'OVERVIEW'},
      {label: 'Clients', icon: 'groups', path: '/app/advisor/clients', feature: 'CLIENTS'},
      {label: 'MiFID reviews', icon: 'fact_check', path: '/app/advisor/reviews', feature: 'MIFID_REVIEWS'},
      {label: 'Proposals', icon: 'request_quote', path: '/app/advisor/proposals', feature: 'PROPOSALS'},
      {label: 'Orders', icon: 'assignment', path: '/app/advisor/orders', feature: 'ORDERS'}
    ]
  }
];

// Bank and platform admins: not in the BE catalogue (it has no admin features yet), so never permission-driven
const ADMIN_SECTIONS: NavSection[] = [
  {
    key: 'admin', label: 'Administration', path: '/app/admin', items: [
      {label: 'Overview', icon: 'admin_panel_settings', path: '/app/admin'},
      {label: 'Approvals', icon: 'how_to_reg', path: '/app/admin/approvals'},
      {label: 'Role assignments', icon: 'manage_accounts', path: '/app/admin/assignments'}
    ]
  }
];

/**
 * Sections available in the given context: admins see the admin area; advisors their workspace unless they are
 * acting as a client. With `ctx.can`, catalogue items the active role assignment may not view are dropped, and so
 * are sections left empty (a section then lands on its first remaining item).
 */
export function navigationFor(ctx: NavigationContext): NavSection[] {
  const sections = ctx.isAdmin ? ADMIN_SECTIONS
    : ctx.isAdvisor && !ctx.actingAsClient ? ADVISOR_SECTIONS : CUSTOMER_SECTIONS;
  const can = ctx.can;
  if (!can) return sections;
  return sections.flatMap(section => {
    if (!section.code) return [section];
    const items = section.items.filter(i => !i.feature || can(section.code!, i.feature));
    if (!items.length) return [];
    const path = items.some(i => i.path === section.path) ? section.path : items[0].path;
    return [{...section, path, items}];
  });
}

/** Catalogue section + feature of a route path, from the navigation model (for the permission guard). */
export function featureOf(path: string): {section: string; feature: string} | null {
  for (const section of [...CUSTOMER_SECTIONS, ...ADVISOR_SECTIONS]) {
    const item = section.items.find(i => i.path === path);
    if (item?.feature && section.code) return {section: section.code, feature: item.feature};
  }
  return null;
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
