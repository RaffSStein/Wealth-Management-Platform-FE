import {Component, signal, computed, effect} from '@angular/core';
import {CommonModule} from '@angular/common';
import {Router, RouterModule, NavigationEnd} from '@angular/router';
import {AuthService} from '../core/services/auth.service';
import {NotificationBellComponent} from '../shared/components/notification-bell/notification-bell.component';

interface SideNavItem {
  label: string;
  icon: string; // material symbol name
  path: string;
  exact?: boolean;
}

type SectionKey = 'account' | 'investments' | 'news-markets';

/**
 * AppShellComponent
 * Persistent layout after login: top header + left sidebar.
 * Sidebar changes depending on the active top-level section.
 */
@Component({
  standalone: true,
  selector: 'app-shell',
  imports: [CommonModule, RouterModule, NotificationBellComponent],
  template: `
    <div class="app-shell">
      <!-- Top Header -->
      <header class="topbar" role="banner">
        <div class="brand" routerLink="/app/home" aria-label="Go to Account Home">Wealth<span>Portal</span></div>
        <nav class="primary-nav" aria-label="Primary navigation">
          <a routerLink="/app/home" (click)="setTopSection('account')" routerLinkActive="active"
             [routerLinkActiveOptions]="{exact:true}">Account</a>
          <a routerLink="/app/investments" (click)="setTopSection('investments')"
             routerLinkActive="active">Investments</a>
          <a routerLink="/app/news-markets" (click)="setTopSection('news-markets')" routerLinkActive="active">News /
            Markets</a>
        </nav>
        <div class="spacer"></div>
        <app-notification-bell/>
      </header>
      <aside class="sidebar" aria-label="Section navigation">
        @if (currentSidebar().length) {
          <nav class="side-nav">
            @for (item of currentSidebar(); track item.path) {
              <a [routerLink]="item.path" routerLinkActive="active"
                 [routerLinkActiveOptions]="{exact: item.exact !== false}" (click)="onNavClick(item)">
                <span class="material-symbols-outlined icon" aria-hidden="true">{{ item.icon }}</span>
                <span class="label">{{ item.label }}</span>
              </a>
            }
            <button type="button" class="logout-item" (click)="logout()">
              <span class="material-symbols-outlined icon" aria-hidden="true">logout</span>
              <span class="label">Logout</span>
            </button>
          </nav>
        } @else {
          <div class="empty">No navigation</div>
        }
      </aside>
      <main class="content" role="main">
        <router-outlet/>
      </main>
    </div>
  `,
  styles: [
    `:host {
      display: contents;
    }

    .material-symbols-outlined {
      font-family: 'Material Symbols Outlined', sans-serif;
      font-weight: normal;
      font-style: normal;
      font-size: 20px;
      line-height: 1;
      letter-spacing: normal;
      text-transform: none;
      display: inline-block;
      white-space: nowrap;
      word-wrap: normal;
      direction: ltr;
      -webkit-font-feature-settings: 'liga';
      -webkit-font-smoothing: antialiased;
    }

    .app-shell {
      --header-h: 56px;
      --sidebar-w: 240px;
      height: 100dvh;
      width: 100%;
      display: grid;
      grid-template-rows:var(--header-h) 1fr;
      grid-template-columns:var(--sidebar-w) 1fr;
      grid-template-areas:'topbar topbar' 'sidebar content';
      background: var(--color-bg);
      color: var(--color-text);
    }

    .topbar {
      grid-area: topbar;
      position: sticky;
      top: 0;
      z-index: 40;
      display: flex;
      align-items: center;
      gap: 1.5rem;
      padding: 0 .75rem 0 1rem;
      background: var(--color-surface);
      border-bottom: 1px solid var(--color-border);
      box-shadow: 0 2px 4px rgba(0, 0, 0, .04);
    }

    .brand {
      font-weight: 600;
      cursor: pointer;
      letter-spacing: .5px;
      font-size: 1.05rem;
      color: var(--color-primary);
      display: flex;
      align-items: center;
      text-decoration: none;
    }

    .brand span {
      color: var(--color-heading);
      margin-left: 2px;
    }

    .primary-nav {
      display: flex;
      gap: .75rem;
    }

    .primary-nav a {
      text-decoration: none;
      font-size: .85rem;
      padding: .55rem .85rem;
      border-radius: 6px;
      color: var(--color-text);
      font-weight: 500;
    }

    .primary-nav a.active, .primary-nav a:hover {
      background: var(--color-surface-alt);
    }

    .spacer {
      flex: 1;
    }

    .sidebar {
      grid-area: sidebar;
      position: sticky;
      top: var(--header-h);
      align-self: start;
      height: calc(100dvh - var(--header-h));
      overflow-y: auto;
      background: var(--color-surface);
      border-right: 1px solid var(--color-border);
      padding: 1rem .85rem 1.5rem;
      display: flex;
    }

    .side-nav {
      display: flex;
      flex-direction: column;
      gap: .25rem;
      width: 100%;
    }

    .side-nav a, .side-nav button.logout-item {
      text-decoration: none;
      font-size: .8rem;
      font-weight: 500;
      padding: .55rem .65rem;
      border-radius: 6px;
      color: var(--color-text);
      position: relative;
      display: flex;
      align-items: center;
      gap: .6rem;
      border: none;
      background: transparent;
      text-align: left;
      cursor: pointer;
      font-family: inherit;
    }

    .side-nav a .icon, .side-nav button.logout-item .icon {
      width: 20px;
      text-align: center;
    }

    .side-nav a.active {
      background: var(--color-primary);
      color: var(--color-primary-contrast);
    }

    .side-nav a.active .icon {
      color: var(--color-primary-contrast);
    }

    .side-nav a:hover:not(.active), .side-nav button.logout-item:hover {
      background: var(--color-surface-alt);
    }

    .side-nav button.logout-item {
      margin-top: .75rem;
      border-top: 1px solid var(--color-border);
      padding-top: .85rem;
    }

    .side-nav button.logout-item:hover {
      color: var(--color-danger);
    }

    .empty {
      font-size: .75rem;
      color: var(--color-text-muted);
    }

    .content {
      grid-area: content;
      overflow-y: auto;
      -webkit-overflow-scrolling: touch;
    }

    @media (max-width: 900px) {
      .app-shell {
        grid-template-columns:1fr;
        grid-template-areas:'topbar' 'content';
      }
      .sidebar {
        position: fixed;
        left: 0;
        top: var(--header-h);
        transform: translateX(0);
        width: var(--sidebar-w);
        box-shadow: 4px 0 12px rgba(0, 0, 0, .12);
        z-index: 60;
      }
    }
    `]
})
export class AppShellComponent {
  private readonly currentUrl = signal<string>('');
  topSection = signal<SectionKey>('account');

  constructor(private readonly router: Router, private readonly auth: AuthService) {
    // Initialize and react to route changes
    effect(() => {
      const url = this.router.url;
      this.currentUrl.set(url);
      this.topSection.set(this.deriveTopSection(url));
    });
    this.router.events.subscribe(e => {
      if (e instanceof NavigationEnd) {
        this.currentUrl.set(e.urlAfterRedirects);
        this.topSection.set(this.deriveTopSection(e.urlAfterRedirects));
      }
    });
  }

  // Sidebar definitions
  private readonly accountSidebar: SideNavItem[] = [
    {label: 'Home', icon: 'home', path: '/app/home'},
    {label: 'Transactions', icon: 'receipt_long', path: '/app/transactions'},
    {label: 'Assets', icon: 'pie_chart', path: '/app/assets'},
    {label: 'Bank Transfers', icon: 'account_balance', path: '/app/bank-transfers'},
    {label: 'Tax Credits', icon: 'balance', path: '/app/tax-credits'},
    {label: 'Securities Transfer', icon: 'swap_horiz', path: '/app/securities-transfer'}
  ];

  private readonly investmentsSidebar: SideNavItem[] = [
    {label: 'Overview', icon: 'dashboard', path: '/app/investments', exact: true},
    {label: 'Positions', icon: 'list', path: '/app/investments/positions', exact: true},
    {label: 'Orders', icon: 'assignment', path: '/app/investments/orders', exact: true},
    {label: 'Performance', icon: 'trending_up', path: '/app/investments/performance', exact: true},
    {label: 'Allocation', icon: 'donut_large', path: '/app/investments/allocation', exact: true}
  ];

  private readonly marketsSidebar: SideNavItem[] = [
    {label: 'Overview', icon: 'dashboard', path: '/app/news-markets', exact: true},
    {label: 'Market News', icon: 'article', path: '/app/news-markets/news', exact: true},
    {label: 'Indices', icon: 'stacked_line_chart', path: '/app/news-markets/indices', exact: true},
    {label: 'Currencies', icon: 'currency_exchange', path: '/app/news-markets/currencies', exact: true},
    {label: 'Commodities', icon: 'oil_barrel', path: '/app/news-markets/commodities', exact: true}
  ];

  currentSidebar = computed<SideNavItem[]>(() => {
    switch (this.topSection()) {
      case 'investments':
        return this.investmentsSidebar;
      case 'news-markets':
        return this.marketsSidebar;
      default:
        return this.accountSidebar;
    }
  });

  async logout() {
    await this.auth.logout();
    this.router.navigate(['/auth/sign-in']);
  }

  setTopSection(section: SectionKey) {
    this.topSection.set(section);
  }

  onNavClick(item: SideNavItem) {
    if (item.path) {
      // deliberate: routerLink handles navigation; method can be expanded for analytics
    }
  }

  private deriveTopSection(url: string): SectionKey {
    if (url.startsWith('/app/investments')) return 'investments';
    if (url.startsWith('/app/news-markets')) return 'news-markets';
    return 'account';
  }
}
