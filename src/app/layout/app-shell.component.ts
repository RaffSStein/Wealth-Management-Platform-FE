import {Component, computed, inject, signal} from '@angular/core';
import {toSignal} from '@angular/core/rxjs-interop';
import {NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet} from '@angular/router';
import {filter, map} from 'rxjs';
import {MenuItem} from 'primeng/api';
import {Avatar} from 'primeng/avatar';
import {ButtonDirective, ButtonIcon} from 'primeng/button';
import {Drawer} from 'primeng/drawer';
import {InputText} from 'primeng/inputtext';
import {Menu} from 'primeng/menu';
import {Tooltip} from 'primeng/tooltip';
import {AuthService} from '../core/services/auth.service';
import {CustomerSessionService} from '../core/services/customer-session.service';
import {ThemeService} from '../core/services/theme.service';
import {UserSessionService} from '../core/services/user-session.service';
import {WorkspaceContextService} from '../core/services/workspace-context.service';
import {NotificationBellComponent} from '../shared/components/notification-bell/notification-bell.component';
import {ActingAsBannerComponent} from './acting-as-banner.component';
import {activeSection, navigationFor} from './navigation';
import {SideNavComponent} from './side-nav.component';

const COLLAPSED_KEY = 'wmp.sidenav.collapsed';

/**
 * AppShellComponent
 * Persistent layout for /app and /onboarding: header (brand, sections, search, notifications, theme, user menu)
 * plus a collapsible section side nav (a drawer on small screens). Navigation depends on the user's role and,
 * for advisors, on whether they are acting as a client. Onboarding uses a reduced header with no navigation.
 */
@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, Avatar, ButtonDirective, ButtonIcon, Drawer, InputText, Menu,
    Tooltip, NotificationBellComponent, ActingAsBannerComponent, SideNavComponent],
  template: `
    <div class="shell" [class.shell--onboarding]="isOnboarding()" [class.shell--collapsed]="collapsed()">
      <header class="topbar">
        @if (!isOnboarding()) {
          <button pButton type="button" class="topbar__menu" [text]="true" severity="secondary"
                  aria-label="Open navigation" (click)="drawerOpen.set(true)">
            <span pButtonIcon class="material-symbols-outlined" aria-hidden="true">menu</span>
          </button>
        }
        <a class="brand" [routerLink]="workspace.homePath()" aria-label="WMP home">
          <svg width="28" height="28" viewBox="0 0 40 40" aria-hidden="true">
            <rect x="1" y="1" width="38" height="38" rx="7" fill="var(--wmp-surface)" stroke="var(--wmp-border)"/>
            <path d="M9 28h5V18H9zM17.5 28h5V12h-5zM26 28h5V22h-5z" fill="var(--wmp-primary)"/>
          </svg>
          <span class="brand__word">WMP</span>
        </a>

        @if (!isOnboarding()) {
          <nav class="sections" aria-label="Primary">
            @for (s of sections(); track s.key) {
              <a class="sections__link" [routerLink]="s.path" [class.is-active]="section()?.key === s.key"
                 [attr.aria-current]="section()?.key === s.key ? 'page' : null">{{ s.label }}</a>
            }
          </nav>
          <label class="search">
            <span class="material-symbols-outlined" aria-hidden="true">search</span>
            <span class="sr-only">Search</span>
            <input pInputText type="search" placeholder="Search ticker, ISIN…" class="search__input"/>
          </label>
        }

        <div class="topbar__actions">
          @if (!isOnboarding()) {
            <app-notification-bell/>
          }
          <button pButton type="button" [text]="true" [rounded]="true" severity="secondary"
                  [attr.aria-label]="theme.theme() === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'"
                  [pTooltip]="theme.theme() === 'dark' ? 'Light theme' : 'Dark theme'" tooltipPosition="bottom"
                  (click)="theme.toggle()">
            <span pButtonIcon class="material-symbols-outlined" aria-hidden="true">
              {{ theme.theme() === 'dark' ? 'light_mode' : 'dark_mode' }}
            </span>
          </button>
          @if (isAuthenticated()) {
            <button type="button" class="user" aria-label="Account menu" aria-haspopup="menu" (click)="userMenu.toggle($event)">
              <p-avatar [label]="initials()" shape="circle" class="user__avatar"/>
            </button>
            <p-menu #userMenu [model]="userMenuItems()" [popup]="true" appendTo="body" ariaLabel="Account menu"/>
          }
        </div>
      </header>

      @if (workspace.actingAsClient()) {
        <app-acting-as-banner/>
      }

      <div class="body">
        @if (!isOnboarding()) {
          <aside class="rail">
            <app-side-nav [section]="section()" [collapsed]="collapsed()"/>
            <button pButton type="button" class="rail__toggle" [text]="true" severity="secondary"
                    [attr.aria-label]="collapsed() ? 'Expand navigation' : 'Collapse navigation'"
                    [attr.aria-expanded]="!collapsed()" (click)="toggleCollapsed()">
              <span pButtonIcon class="material-symbols-outlined" aria-hidden="true">
                {{ collapsed() ? 'left_panel_open' : 'left_panel_close' }}
              </span>
            </button>
          </aside>
        }
        <main class="content">
          <router-outlet/>
        </main>
      </div>
    </div>

    <p-drawer [(visible)]="drawerOpen" position="left" header="Navigation" [closable]="true" class="nav-drawer">
      <nav class="drawer-sections" aria-label="Sections">
        @for (s of sections(); track s.key) {
          <a class="drawer-sections__link" [routerLink]="s.path" routerLinkActive="is-active"
             [routerLinkActiveOptions]="{exact: false}" (click)="drawerOpen.set(false)">{{ s.label }}</a>
        }
      </nav>
      <app-side-nav [section]="section()" (navigate)="drawerOpen.set(false)"/>
    </p-drawer>
  `,
  styles: [`
    :host { display: contents; }
    .shell { min-height: 100dvh; display: flex; flex-direction: column; background: var(--wmp-bg); color: var(--wmp-text); }
    .material-symbols-outlined { font-size: 20px; }

    /* Header */
    .topbar {
      position: sticky; top: 0; z-index: 40; height: var(--wmp-header-h);
      display: flex; align-items: center; gap: 1.25rem; padding: 0 1rem;
      background: var(--wmp-bg); border-bottom: 1px solid var(--wmp-border);
    }
    .topbar__menu { display: none; }
    .brand { display: flex; align-items: center; gap: .5rem; color: var(--wmp-text); font-weight: 600; letter-spacing: .04em; text-decoration: none; }
    .brand:hover { text-decoration: none; }
    .sections { display: flex; gap: 2px; }
    .sections__link {
      height: 36px; display: flex; align-items: center; padding: 0 .85rem; border-radius: var(--wmp-radius-md);
      color: var(--wmp-text-muted); font-size: .9rem; text-decoration: none;
    }
    .sections__link:hover { color: var(--wmp-text); background: var(--wmp-surface); text-decoration: none; }
    .sections__link.is-active { color: var(--wmp-text); background: var(--wmp-surface-raised); }
    .search {
      margin-left: auto; position: relative; display: flex; align-items: center; width: min(18rem, 28vw);
      color: var(--wmp-text-muted);
    }
    .search .material-symbols-outlined { position: absolute; left: .65rem; font-size: 18px; pointer-events: none; }
    .search__input { width: 100%; height: 36px; padding-left: 2.1rem; font-size: .85rem; }
    .topbar__actions { display: flex; align-items: center; gap: .25rem; }
    .shell--onboarding .topbar__actions { margin-left: auto; }
    .user { height: auto; padding: 0; margin-left: .25rem; border: 0; background: transparent; border-radius: 50%; cursor: pointer; display: flex; }
    .user__avatar { background: var(--wmp-primary-soft); color: var(--wmp-primary); font-weight: 600; font-size: .8rem; }

    /* Body: rail + content */
    .body { flex: 1; display: flex; min-height: 0; }
    .rail {
      position: sticky; top: var(--wmp-header-h); align-self: flex-start; height: calc(100dvh - var(--wmp-header-h));
      width: 232px; flex: 0 0 auto; display: flex; flex-direction: column; justify-content: space-between;
      border-right: 1px solid var(--wmp-border); background: var(--wmp-bg); transition: width .18s ease; overflow-y: auto;
    }
    .shell--collapsed .rail { width: 64px; }
    .rail__toggle { margin: .5rem; align-self: flex-end; }
    .shell--collapsed .rail__toggle { align-self: center; }
    .content { flex: 1; min-width: 0; }

    /* Mobile drawer */
    .drawer-sections { display: flex; gap: .25rem; flex-wrap: wrap; padding: 0 .5rem .5rem; border-bottom: 1px solid var(--wmp-border); }
    .drawer-sections__link {
      height: 36px; display: flex; align-items: center; padding: 0 .75rem; border-radius: var(--wmp-radius-md);
      color: var(--wmp-text-muted); text-decoration: none; font-size: .9rem;
    }
    .drawer-sections__link.is-active { color: var(--wmp-text); background: var(--wmp-surface-raised); }

    @media (max-width: 959.98px) {
      .topbar { gap: .5rem; padding: 0 .5rem; }
      .topbar__menu { display: inline-flex; }
      .sections, .rail { display: none; }
      .search { width: auto; flex: 1; min-width: 0; }
    }
    @media (max-width: 479.98px) {
      .search { display: none; }
      .topbar__actions { margin-left: auto; }
    }
    .sr-only {
      position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden;
      clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0;
    }
  `]
})
export class AppShellComponent {
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly userSession = inject(UserSessionService);
  private readonly customerSession = inject(CustomerSessionService);
  protected readonly theme = inject(ThemeService);
  protected readonly workspace = inject(WorkspaceContextService);

  private readonly url = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map(e => e.urlAfterRedirects)
    ),
    {initialValue: this.router.url}
  );

  protected readonly isOnboarding = computed(() => this.url().startsWith('/onboarding'));
  // Public onboarding pages (sign-up, password setup link) also use the shell, without a session
  protected readonly isAuthenticated = computed(() => !!this.auth.token());
  protected readonly sections = computed(() => navigationFor({
    isAdvisor: this.workspace.isAdvisor(),
    actingAsClient: this.workspace.actingAsClient()
  }));
  protected readonly section = computed(() => activeSection(this.url(), this.sections()));

  protected readonly collapsed = signal(this.readCollapsed());
  protected readonly drawerOpen = signal(false);

  private readonly displayName = computed(() => {
    const p = this.userSession.profile();
    const name = `${p?.firstName ?? ''} ${p?.lastName ?? ''}`.trim();
    return name || p?.email || this.auth.username() || 'Account';
  });

  protected readonly initials = computed(() => {
    const p = this.userSession.profile();
    const fromName = `${p?.firstName?.[0] ?? ''}${p?.lastName?.[0] ?? ''}`;
    return (fromName || this.displayName()[0] || '?').toUpperCase();
  });

  protected readonly userMenuItems = computed<MenuItem[]>(() => [{
    label: this.displayName(),
    items: [
      {label: this.userSession.isAdvisor() ? 'Advisor' : 'Customer', disabled: true},
      {separator: true},
      {label: 'Log out', command: () => void this.logout()}
    ]
  }]);

  protected toggleCollapsed(): void {
    const next = !this.collapsed();
    this.collapsed.set(next);
    try {
      localStorage.setItem(COLLAPSED_KEY, String(next));
    } catch {
      // storage unavailable: keep the in-memory state only
    }
  }

  protected async logout(): Promise<void> {
    await this.auth.logout();
    this.userSession.clear();
    this.customerSession.setCustomer(null);
    await this.router.navigateByUrl('/auth/sign-in');
  }

  private readCollapsed(): boolean {
    try {
      return localStorage.getItem(COLLAPSED_KEY) === 'true';
    } catch {
      return false;
    }
  }
}
