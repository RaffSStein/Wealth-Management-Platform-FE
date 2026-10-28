import {Component, input, output} from '@angular/core';
import {RouterLink, RouterLinkActive} from '@angular/router';
import {Tooltip} from 'primeng/tooltip';
import {NavSection} from './navigation';

/**
 * Section sub-navigation (left rail). Collapsed = icon-only with tooltips.
 * Rendered inline on desktop and inside the shell's drawer on mobile.
 */
@Component({
  selector: 'app-side-nav',
  imports: [RouterLink, RouterLinkActive, Tooltip],
  template: `
    @if (section(); as s) {
      <nav class="side-nav" [class.is-collapsed]="collapsed()" [attr.aria-label]="s.label + ' navigation'">
        @if (!collapsed()) {
          <span class="side-nav__title">{{ s.label }}</span>
        }
        @for (item of s.items; track item.path) {
          <a class="side-nav__item" [routerLink]="item.path" routerLinkActive="is-active"
             [routerLinkActiveOptions]="{exact: item.exact !== false}" ariaCurrentWhenActive="page"
             [pTooltip]="item.label" tooltipPosition="right" [tooltipDisabled]="!collapsed()"
             (click)="navigate.emit()">
            <span class="material-symbols-outlined" aria-hidden="true">{{ item.icon }}</span>
            <span class="side-nav__label" [class.sr-only]="collapsed()">{{ item.label }}</span>
          </a>
        }
      </nav>
    }
  `,
  styles: [`
    :host { display: block; }
    .side-nav { display: flex; flex-direction: column; gap: 2px; padding: .75rem .5rem; }
    .side-nav__title {
      padding: .25rem .75rem .5rem; font-family: var(--wmp-font-mono); font-size: .7rem;
      letter-spacing: .08em; text-transform: uppercase; color: var(--wmp-text-muted);
    }
    .side-nav__item {
      display: flex; align-items: center; gap: .75rem; min-height: 40px; padding: 0 .75rem;
      border-radius: var(--wmp-radius-md); color: var(--wmp-text-muted); font-size: .9rem; text-decoration: none;
      border: 1px solid transparent;
    }
    .side-nav__item:hover { background: var(--wmp-surface-raised); color: var(--wmp-text); text-decoration: none; }
    .side-nav__item.is-active { background: var(--wmp-surface-raised); border-color: var(--wmp-border); color: var(--wmp-text); }
    .side-nav__item.is-active .material-symbols-outlined { color: var(--wmp-primary); }
    .material-symbols-outlined { font-size: 20px; }
    .is-collapsed .side-nav__item { justify-content: center; padding: 0; }
    .sr-only {
      position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden;
      clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0;
    }
  `]
})
export class SideNavComponent {
  readonly section = input<NavSection | undefined>();
  readonly collapsed = input(false);
  /** Emitted when an item is clicked (the shell closes the mobile drawer). */
  readonly navigate = output<void>();
}
