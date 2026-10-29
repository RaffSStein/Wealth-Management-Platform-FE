import {Component, ElementRef, computed, inject, signal, viewChild} from '@angular/core';
import {NgTemplateOutlet} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {Button, ButtonDirective, ButtonIcon} from 'primeng/button';
import {Dialog} from 'primeng/dialog';
import {OverlayBadge} from 'primeng/overlaybadge';
import {SelectButton} from 'primeng/selectbutton';
import {Tooltip} from 'primeng/tooltip';
import {AppNotification, NotificationService} from '../../../core/services/notification.service';

type Filter = 'all' | 'unread';

interface DayGroup {
  label: string;
  items: AppNotification[];
}

/**
 * Header notification bell: unread badge, a dropdown with the latest items, and a dialog with the full list.
 * The dropdown is rendered inside the bell (which sits in the sticky header) rather than as a body overlay, so it
 * stays attached to the bell when the page scrolls and lines up with its right edge.
 */
@Component({
  selector: 'app-notification-bell',
  imports: [NgTemplateOutlet, FormsModule, Button, ButtonDirective, ButtonIcon, Dialog, OverlayBadge, SelectButton, Tooltip],
  host: {
    '(document:click)': 'onDocumentClick($event)',
    '(document:keydown.escape)': 'closePanel(true)'
  },
  template: `
    @if (unreadDisplay(); as count) {
      <p-overlaybadge [value]="count" severity="danger" badgeSize="small" class="wmp-header-badge">
        <ng-container *ngTemplateOutlet="bell"/>
      </p-overlaybadge>
    } @else {
      <ng-container *ngTemplateOutlet="bell"/>
    }
    <ng-template #bell>
      <button #bellButton pButton type="button" [text]="true" [rounded]="true" severity="secondary" class="bell"
              [attr.aria-label]="'Notifications, ' + unreadCount() + ' unread'" aria-haspopup="dialog"
              [attr.aria-expanded]="panelOpen()" aria-controls="notification-panel" (click)="togglePanel()">
        <span pButtonIcon class="material-symbols-outlined" aria-hidden="true">notifications</span>
      </button>
    </ng-template>

    @if (panelOpen()) {
      <div id="notification-panel" class="panel" role="dialog" aria-label="Latest notifications">
        <div class="panel__head">
          <span class="panel__title">Notifications</span>
          <p-button label="Mark all as read" [text]="true" size="small" (onClick)="markAll()" [disabled]="!unreadCount()"/>
        </div>
        @if (latest().length) {
          <ul class="list">
            @for (n of latest(); track n.id) {
              <li>
                <button type="button" class="item" (click)="openAll(n)">
                  <span class="dot" [class.is-unread]="!n.read" aria-hidden="true"></span>
                  <span class="item__body">
                    <span class="item__title" [class.is-read]="n.read">{{ n.title }}</span>
                    <span class="item__msg">{{ n.message }}</span>
                  </span>
                  <span class="item__time num">{{ timeAgo(n.timestamp) }}</span>
                  @if (!n.read) { <span class="wmp-sr-only">(unread)</span> }
                </button>
              </li>
            }
          </ul>
        } @else {
          <p class="empty">No notifications</p>
        }
        <div class="panel__foot">
          <p-button label="View all" [text]="true" size="small" (onClick)="openAll()"/>
        </div>
      </div>
    }

    <p-dialog [modal]="true" [(visible)]="dialogOpen" [style]="{width: 'min(36rem, 94vw)'}" [dismissableMask]="true"
              [draggable]="false">
      <ng-template #header>
        <div class="dlg__title">
          <span id="notifications-dialog-title">Notifications</span>
          @if (unreadCount()) { <span class="pill num">{{ unreadCount() }} unread</span> }
        </div>
      </ng-template>
      <div class="dlg__toolbar">
        <p-selectbutton [options]="filters" [ngModel]="filter()" (ngModelChange)="filter.set($event)" [allowEmpty]="false"
                        optionLabel="label" optionValue="value" size="small" ariaLabelledBy="notifications-dialog-title"/>
        <p-button label="Mark all as read" [text]="true" size="small" (onClick)="markAll()" [disabled]="!unreadCount()"/>
      </div>

      <div class="dlg__list">
        @for (group of groups(); track group.label) {
          <section class="group" [attr.aria-label]="group.label">
            <h3 class="group__label">{{ group.label }}</h3>
            <ul class="rows">
              @for (n of group.items; track n.id) {
                <li class="row" [class.is-unread]="!n.read">
                  <span class="dot" [class.is-unread]="!n.read" aria-hidden="true"></span>
                  <div class="row__body">
                    <div class="row__head">
                      <span class="item__title" [class.is-read]="n.read">{{ n.title }}</span>
                      <time class="item__time num" [attr.datetime]="iso(n.timestamp)">{{ timeAgo(n.timestamp) }}</time>
                    </div>
                    <p class="row__msg">{{ n.message }}</p>
                  </div>
                  <button pButton type="button" [text]="true" [rounded]="true" severity="secondary" class="row__toggle"
                          [pTooltip]="n.read ? 'Mark as unread' : 'Mark as read'" tooltipPosition="left"
                          [attr.aria-label]="(n.read ? 'Mark as unread: ' : 'Mark as read: ') + n.title"
                          (click)="toggleRead(n)">
                    <span pButtonIcon class="material-symbols-outlined" aria-hidden="true">
                      {{ n.read ? 'mark_email_unread' : 'done' }}
                    </span>
                  </button>
                </li>
              }
            </ul>
          </section>
        } @empty {
          <div class="dlg__empty">
            <span class="material-symbols-outlined" aria-hidden="true">{{ filter() === 'unread' ? 'done_all' : 'notifications_off' }}</span>
            <p>{{ filter() === 'unread' ? 'You are all caught up.' : 'No notifications yet.' }}</p>
          </div>
        }
      </div>
    </p-dialog>
  `,
  styles: [`
    :host { display: inline-flex; position: relative; }
    .bell .material-symbols-outlined { font-size: 22px; }

    .panel {
      position: absolute; top: calc(100% + .5rem); right: 0; z-index: 50;
      width: min(22rem, calc(100vw - 2rem)); box-sizing: border-box; padding: .75rem;
      display: grid; gap: .25rem;
      background: var(--wmp-surface); border: 1px solid var(--wmp-border); border-radius: var(--wmp-radius-lg);
      box-shadow: 0 12px 32px rgba(0, 0, 0, .35);
    }
    .panel__head, .panel__foot { display: flex; align-items: center; justify-content: space-between; }
    .panel__head { padding: 0 .25rem; }
    .panel__foot { justify-content: center; border-top: 1px solid var(--wmp-border); padding-top: .25rem; }
    .panel__title { font-weight: 600; }
    .list, .rows { list-style: none; margin: 0; padding: 0; }
    .item {
      /* height/font reset: the legacy global button rule (wmp-legacy layer) sets a fixed height and bold text */
      width: 100%; height: auto; font-weight: inherit; display: grid; grid-template-columns: 8px minmax(0, 1fr) auto;
      gap: .6rem; align-items: start; padding: .6rem .5rem; border: 0; border-radius: var(--wmp-radius-md);
      background: transparent; color: var(--wmp-text); text-align: left; cursor: pointer;
    }
    .item:hover, .item:focus-visible { background: var(--wmp-surface-raised); }
    .item__body { display: grid; gap: .15rem; min-width: 0; }
    .item__title { font-weight: 600; font-size: .9rem; }
    .item__title.is-read { font-weight: 400; color: var(--wmp-text-muted); }
    .item__msg { font-size: .8rem; color: var(--wmp-text-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .item__time { font-size: .75rem; color: var(--wmp-text-muted); white-space: nowrap; }
    .dot { width: 8px; height: 8px; margin-top: .4rem; border-radius: 50%; }
    .dot.is-unread { background: var(--wmp-primary); }
    .empty { margin: 0; padding: 1rem .5rem; text-align: center; color: var(--wmp-text-muted); font-size: .85rem; }

    .dlg__title { display: flex; align-items: center; gap: .6rem; font-size: 1.15rem; font-weight: 600; }
    .pill {
      font-size: .75rem; font-weight: 500; padding: .1rem .5rem; border-radius: 999px;
      color: var(--wmp-primary); background: var(--wmp-primary-soft);
    }
    .dlg__toolbar {
      display: flex; justify-content: space-between; align-items: center; gap: .75rem; flex-wrap: wrap;
      padding-bottom: .75rem; border-bottom: 1px solid var(--wmp-border);
    }
    .dlg__list { max-height: min(60vh, 32rem); overflow-y: auto; margin-right: -.5rem; padding-right: .5rem; }
    .group { padding-top: .75rem; }
    .group__label {
      margin: 0 0 .25rem; font-size: .7rem; font-weight: 600; letter-spacing: .08em; text-transform: uppercase;
      color: var(--wmp-text-muted);
    }
    .row {
      display: grid; grid-template-columns: 8px minmax(0, 1fr) auto; gap: .75rem; align-items: start;
      padding: .65rem .5rem; border-radius: var(--wmp-radius-md);
    }
    .row.is-unread { background: color-mix(in srgb, var(--wmp-primary), transparent 94%); }
    .row + .row { margin-top: 2px; }
    .row__body { min-width: 0; display: grid; gap: .2rem; }
    .row__head { display: flex; justify-content: space-between; align-items: baseline; gap: 1rem; }
    .row__msg { margin: 0; font-size: .875rem; color: var(--wmp-text); line-height: 1.45; }
    .row:not(.is-unread) .row__msg { color: var(--wmp-text-muted); }
    .row__toggle { width: 2rem; height: 2rem; margin-top: -.15rem; }
    .row__toggle .material-symbols-outlined { font-size: 18px; }
    .dlg__empty { display: grid; justify-items: center; gap: .5rem; padding: 2.5rem 1rem; color: var(--wmp-text-muted); }
    .dlg__empty .material-symbols-outlined { font-size: 32px; }
    .dlg__empty p { margin: 0; }
  `]
})
export class NotificationBellComponent {
  private readonly notifications = inject(NotificationService);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly bellButton = viewChild<ElementRef<HTMLButtonElement>>('bellButton');

  protected readonly panelOpen = signal(false);
  protected readonly dialogOpen = signal(false);
  protected readonly filter = signal<Filter>('all');

  protected readonly unreadCount = this.notifications.unreadCount;
  protected readonly unreadDisplay = computed(() => {
    const n = this.unreadCount();
    if (!n) return undefined;
    return n > 9 ? '9+' : String(n);
  });
  protected readonly latest = computed(() => this.notifications.top(5));
  protected readonly filters = [
    {label: 'All', value: 'all'},
    {label: 'Unread', value: 'unread'}
  ];

  /** Full list for the dialog, filtered and grouped by day (newest first). */
  protected readonly groups = computed<DayGroup[]>(() => {
    const list = this.notifications.notifications().filter(n => this.filter() === 'all' || !n.read);
    return groupByDay(list, new Date());
  });

  protected togglePanel(): void {
    this.panelOpen.update(open => !open);
  }

  protected closePanel(restoreFocus = false): void {
    if (!this.panelOpen()) return;
    this.panelOpen.set(false);
    if (restoreFocus) this.bellButton()?.nativeElement.focus();
  }

  /** Closes the dropdown on a click outside the bell (the bell button itself toggles). */
  protected onDocumentClick(event: MouseEvent): void {
    if (this.panelOpen() && !this.host.nativeElement.contains(event.target as Node)) this.closePanel();
  }

  protected openAll(n?: AppNotification): void {
    if (n) this.notifications.markAsRead(n.id);
    this.closePanel();
    this.dialogOpen.set(true);
  }

  protected markAll(): void {
    this.notifications.markAllAsRead();
  }

  protected toggleRead(n: AppNotification): void {
    if (n.read) this.notifications.markAsUnread(n.id);
    else this.notifications.markAsRead(n.id);
  }

  protected iso(date: Date): string {
    return new Date(date).toISOString();
  }

  protected timeAgo(date: Date): string {
    const diff = Math.max(0, Date.now() - new Date(date).getTime());
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'now';
    if (m < 60) return `${m} min`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h} h`;
    const days = Math.floor(h / 24);
    if (days < 7) return `${days} d`;
    return `${Math.floor(days / 7)} wk`;
  }
}

/** Groups notifications (already sorted newest first) into Today / Yesterday / Earlier, skipping empty groups. */
export function groupByDay(list: AppNotification[], now: Date): DayGroup[] {
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfYesterday = startOfToday - 24 * 60 * 60 * 1000;
  const buckets: DayGroup[] = [{label: 'Today', items: []}, {label: 'Yesterday', items: []}, {label: 'Earlier', items: []}];
  for (const n of list) {
    const t = new Date(n.timestamp).getTime();
    buckets[t >= startOfToday ? 0 : t >= startOfYesterday ? 1 : 2].items.push(n);
  }
  return buckets.filter(b => b.items.length);
}
