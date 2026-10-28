import {Component, computed, inject, signal, viewChild} from '@angular/core';
import {NgTemplateOutlet} from '@angular/common';
import {Button, ButtonDirective, ButtonIcon} from 'primeng/button';
import {Dialog} from 'primeng/dialog';
import {OverlayBadge} from 'primeng/overlaybadge';
import {Popover} from 'primeng/popover';
import {AppNotification, NotificationService} from '../../../core/services/notification.service';

/**
 * Header notification bell: unread badge, popover with the latest items, dialog with the full list.
 */
@Component({
  selector: 'app-notification-bell',
  imports: [NgTemplateOutlet, Button, ButtonDirective, ButtonIcon, Dialog, OverlayBadge, Popover],
  template: `
    @if (unreadDisplay(); as count) {
      <p-overlaybadge [value]="count" severity="danger" badgeSize="small">
        <ng-container *ngTemplateOutlet="bell"/>
      </p-overlaybadge>
    } @else {
      <ng-container *ngTemplateOutlet="bell"/>
    }
    <ng-template #bell>
      <button pButton type="button" [text]="true" [rounded]="true" severity="secondary" class="bell"
              [attr.aria-label]="'Notifications, ' + unreadCount() + ' unread'" aria-haspopup="dialog"
              (click)="popover.toggle($event)">
        <span pButtonIcon class="material-symbols-outlined" aria-hidden="true">notifications</span>
      </button>
    </ng-template>

    <p-popover #popover ariaLabel="Latest notifications">
      <div class="panel">
        <div class="panel__head">
          <span class="panel__title">Notifications</span>
          <p-button label="Mark all as read" [text]="true" size="small" (onClick)="markAll()" [disabled]="!unreadCount()"/>
        </div>
        @if (latest().length) {
          <ul class="list">
            @for (n of latest(); track n.id) {
              <li>
                <button type="button" class="item" (click)="openAll(n)">
                  <span class="item__body">
                    <span class="item__title" [class.is-read]="n.read">{{ n.title }}</span>
                    <span class="item__msg">{{ preview(n.message) }}</span>
                  </span>
                  <span class="item__meta">
                    <span class="num">{{ timeAgo(n.timestamp) }}</span>
                    @if (!n.read) { <span class="dot" aria-label="Unread"></span> }
                  </span>
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
    </p-popover>

    <p-dialog header="Notifications" [modal]="true" [(visible)]="dialogOpen" [style]="{width: 'min(40rem, 92vw)'}"
              [dismissableMask]="true">
      <div class="dialog__actions">
        <p-button label="Mark all as read" [text]="true" size="small" (onClick)="markAll()" [disabled]="!unreadCount()"/>
      </div>
      <ul class="all">
        @for (n of all(); track n.id) {
          <li class="block">
            <div class="block__head">
              <span class="item__title" [class.is-read]="n.read">{{ n.title }}</span>
              <span class="item__meta">
                <span class="num">{{ timeAgo(n.timestamp) }}</span>
                @if (!n.read) { <span class="dot" aria-label="Unread"></span> }
              </span>
            </div>
            <p class="block__msg">{{ n.message }}</p>
            <p-button [label]="n.read ? 'Mark as unread' : 'Mark as read'" severity="secondary" [text]="true" size="small"
                      (onClick)="toggleRead(n)"/>
          </li>
        } @empty {
          <li class="empty">No notifications</li>
        }
      </ul>
    </p-dialog>
  `,
  styles: [`
    :host { display: inline-flex; }
    .bell .material-symbols-outlined { font-size: 22px; }
    .panel { width: min(22rem, 86vw); display: grid; gap: .25rem; }
    .panel__head, .panel__foot { display: flex; align-items: center; justify-content: space-between; }
    .panel__foot { justify-content: center; border-top: 1px solid var(--wmp-border); padding-top: .25rem; }
    .panel__title { font-weight: 600; }
    .list, .all { list-style: none; margin: 0; padding: 0; }
    .item {
      /* height/font reset: the legacy global button rule (wmp-legacy layer) sets a fixed height and bold text */
      width: 100%; height: auto; font-weight: inherit; display: flex; gap: .75rem; justify-content: space-between; align-items: flex-start;
      padding: .6rem .5rem; border: 0; border-radius: var(--wmp-radius-md); background: transparent;
      color: var(--wmp-text); text-align: left; cursor: pointer;
    }
    .item:hover, .item:focus-visible { background: var(--wmp-surface-raised); }
    .item__body { display: grid; gap: .15rem; min-width: 0; }
    .item__title { font-weight: 600; font-size: .9rem; }
    .item__title.is-read { font-weight: 400; color: var(--wmp-text-muted); }
    .item__msg { font-size: .8rem; color: var(--wmp-text-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .item__meta { display: inline-flex; align-items: center; gap: .4rem; font-size: .75rem; color: var(--wmp-text-muted); white-space: nowrap; }
    .dot { width: 8px; height: 8px; border-radius: 50%; background: var(--wmp-primary); }
    .empty { margin: 0; padding: 1rem .5rem; text-align: center; color: var(--wmp-text-muted); font-size: .85rem; }
    .dialog__actions { display: flex; justify-content: flex-end; margin-bottom: .5rem; }
    .block { padding: .75rem 0; border-top: 1px solid var(--wmp-border); display: grid; gap: .25rem; }
    .block__head { display: flex; justify-content: space-between; gap: 1rem; }
    .block__msg { margin: 0; font-size: .9rem; }
    .block p-button { justify-self: start; }
  `]
})
export class NotificationBellComponent {
  private readonly notifications = inject(NotificationService);

  private readonly popoverRef = viewChild.required<Popover>('popover');
  protected readonly dialogOpen = signal(false);

  protected readonly unreadCount = this.notifications.unreadCount;
  protected readonly unreadDisplay = computed(() => {
    const n = this.unreadCount();
    if (!n) return undefined;
    return n > 9 ? '9+' : String(n);
  });
  protected readonly latest = computed(() => this.notifications.top(5));
  protected readonly all = this.notifications.notifications;

  protected openAll(n?: AppNotification): void {
    if (n) this.notifications.markAsRead(n.id);
    this.popoverRef().hide();
    this.dialogOpen.set(true);
  }

  protected markAll(): void {
    this.notifications.markAllAsRead();
  }

  protected toggleRead(n: AppNotification): void {
    if (n.read) this.notifications.markAsUnread(n.id);
    else this.notifications.markAsRead(n.id);
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

  // Character preview limit for popover items
  private readonly previewMaxChars = 90;

  /** Returns a truncated single-line preview with ellipsis if text is too long */
  protected preview(text?: string, max: number = this.previewMaxChars): string {
    if (!text) return '';
    const normalized = String(text).replace(/\s+/g, ' ').trim();
    if (normalized.length <= max) return normalized;
    return normalized.slice(0, Math.max(0, max - 1)).trimEnd() + '…';
  }
}
