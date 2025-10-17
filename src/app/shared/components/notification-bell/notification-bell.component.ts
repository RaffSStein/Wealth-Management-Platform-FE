import {Component, HostListener, computed, inject, signal} from '@angular/core';
import {CommonModule} from '@angular/common';
import {NotificationService, AppNotification} from '../../../core/services/notification.service';

@Component({
  selector: 'app-notification-bell',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="notif-wrapper" (click)="$event.stopPropagation()">
      <button class="bell-btn" type="button" (click)="toggleDropdown()" aria-haspopup="true"
              [attr.aria-expanded]="showDropdown()" aria-label="Notifications">
        <span class="material-symbols-outlined bell-icon" aria-hidden="true">notifications</span>
        @if (unreadDisplay()) {
          <span class="badge">{{ unreadDisplay() }}</span>
        }
      </button>

      @if (showDropdown()) {
        <div class="dropdown" role="menu">
          <div class="dropdown-header">
            <span class="title">Notifications</span>
            <button class="link-btn" type="button" (click)="markAll()">Mark all as read</button>
          </div>
          <div class="list" [class.empty]="topFive().length === 0">
            @if (topFive().length) {
              @for (n of topFive(); track n.id) {
                <button class="item" (click)="openFromDropdown(n)">
                  <div class="left">
                    <div class="item-title" [class.read]="n.read">{{ n.title }}</div>
                    <div class="item-msg" [title]="n.message">{{ preview(n.message) }}</div>
                  </div>
                  <div class="right">
                    <span class="time">{{ timeAgo(n.timestamp) }}</span>
                    @if (!n.read) {
                      <span class="dot" aria-label="Unread"></span>
                    }
                  </div>
                </button>
              }
            } @else {
              <div class="empty">No notifications</div>
            }
          </div>
          <div class="dropdown-footer">
            <button class="link-btn" type="button" (click)="openModal()">View all</button>
          </div>
        </div>
      }

      @if (showModal()) {
        <div class="modal-backdrop" (click)="closeModal()"></div>
        <div class="modal" role="dialog" aria-modal="true" aria-label="All notifications">
          <div class="modal-header">
            <h3>Notifications</h3>
            <div class="spacer"></div>
            <button class="link-btn" type="button" (click)="markAll()">Mark all as read</button>
            <button class="close" type="button" (click)="closeModal()" aria-label="Close">
              <span class="material-symbols-outlined" aria-hidden="true">close</span>
            </button>
          </div>
          <div class="modal-body">
            <div class="all-list">
              @for (n of all(); track n.id) {
                <div class="block">
                  <div class="block-head">
                    <div class="row-left">
                      <div class="row-title" [class.read]="n.read">{{ n.title }}</div>
                    </div>
                    <div class="row-right">
                      <span class="time">{{ timeAgo(n.timestamp) }}</span>
                      @if (!n.read) {
                        <span class="dot" aria-label="Unread"></span>
                      }
                    </div>
                  </div>
                  <div class="block-msg">{{ n.message }}</div>
                  <div class="block-actions">
                    <button type="button" class="secondary"
                            (click)="markRead(n)">{{ n.read ? 'Mark as unread' : 'Mark as read' }}
                    </button>
                  </div>
                </div>
              }
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    :host {
      display: inline-block;
    }

    .material-symbols-outlined {
      font-family: 'Material Symbols Outlined', sans-serif;
      font-weight: normal;
      font-style: normal;
      letter-spacing: normal;
      text-transform: none;
      display: inline-block;
      -webkit-font-feature-settings: 'liga';
      -webkit-font-smoothing: antialiased;
      font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
    }

    .notif-wrapper {
      position: relative;
    }

    .bell-btn {
      position: relative;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 36px;
      border-radius: 8px;
      border: none;
      background: transparent;
      color: var(--color-text, #222);
      cursor: pointer;
      transition: background .2s ease;
    }

    .bell-btn:hover {
      background: var(--color-surface-alt, rgba(0, 0, 0, 0.06));
    }

    .bell-btn:focus-visible {
      outline: 2px solid var(--color-primary, #0b5ed7);
      outline-offset: 2px;
    }

    .bell-icon {
      font-size: 20px;
      line-height: 1;
    }

    .badge {
      position: absolute;
      top: -4px;
      right: -4px;
      min-width: 18px;
      height: 18px;
      padding: 0 4px;
      border-radius: 999px;
      background: #d32f2f;
      color: #fff;
      font-size: 11px;
      line-height: 18px;
      text-align: center;
      font-weight: 700;
      box-shadow: 0 1px 2px rgba(0, 0, 0, .2);
    }

    .dropdown {
      position: absolute;
      top: calc(100% + 8px);
      right: 0;
      width: 360px;
      background: var(--color-surface, #fff);
      border: 1px solid var(--color-border, rgba(0, 0, 0, 0.12));
      border-radius: 10px;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
      overflow: hidden;
      z-index: 20;
    }

    .dropdown-header, .dropdown-footer {
      display: flex;
      align-items: center;
      gap: 8px;
      /* shared horizontal padding for symmetric edges */
      --hdr-x-pad: 12px;
      padding: 10px var(--hdr-x-pad);
      background: var(--color-surface-alt, #fafafa);
    }

    .dropdown-header .title {
      font-weight: 600;
      margin-right: var(--hdr-x-pad);
    }

    .link-btn {
      margin-left: auto;
      padding-right: 0;
      background: transparent;
      border: none;
      color: var(--color-primary, #0b5ed7);
      cursor: pointer;
      font-size: 12px;
      font-weight: 600;
    }

    .list {
      max-height: 300px;
      overflow: auto;
    }

    .list.empty {
      padding: 16px;
      text-align: center;
      color: var(--color-text-muted, #777);
    }

    .item {
      width: 100%;
      height: 100%;
      border: none;
      background: transparent;
      display: grid;
      grid-template-columns: 1fr auto;
      align-items: start;
      gap: 10px;
      padding: 10px 12px;
      cursor: pointer;
      text-align: left;
      box-sizing: border-box;
    }

    .item + .item {
      border-top: 1px solid var(--color-border, rgba(0, 0, 0, 0.06));
    }

    .item:hover {
      background: var(--color-surface-alt, #f6f8fc);
    }

    .left {
      min-width: 0;
    }

    .item-title {
      font-weight: 600;
      color: var(--color-heading, #222);
    }

    .item-title.read {
      color: var(--color-text-muted, #666);
      font-weight: 500;
    }

    .item-msg {
      color: var(--color-text, #444);
      font-size: 13px;
      margin-top: 3px;
      white-space: normal;
      word-break: break-word;
    }

    .right {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 6px;
      min-width: 56px;
    }

    .time {
      color: var(--color-text-muted, #777);
      font-size: 12px;
      white-space: nowrap;
    }

    .dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #2e7d32;
      display: inline-block;
    }

    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.35);
      z-index: 30;
    }

    .modal {
      position: fixed;
      left: 50%;
      transform: translateX(-50%);
      top: 10%;
      width: min(900px, calc(100% - 32px));
      background: var(--color-surface, #fff);
      border-radius: 12px;
      box-shadow: 0 16px 48px rgba(0, 0, 0, 0.2);
      display: flex;
      flex-direction: column;
      max-height: 80vh;
      z-index: 31;
    }

    .modal-header {
      display: flex;
      align-items: center;
      padding: 12px 16px;
      border-bottom: 1px solid var(--color-border, rgba(0, 0, 0, 0.08));
      color: #222; /* Force readable text/icon color */
    }

    .modal-header h3 {
      margin: 0;
      font-size: 18px;
    }

    .modal-header .spacer {
      flex: 1;
    }

    .modal-header .close {
      width: 32px;
      height: 32px;
      border: none;
      background: transparent;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      color: #222; /* Ensure icon visible on light background */
    }

    .modal-header .close .material-symbols-outlined {
      font-size: 20px;
      line-height: 1;
    }

    .modal-body {
      padding: 8px 0;
      overflow: auto;
    }

    .all-list {
      display: flex;
      flex-direction: column;
      gap: 0;
    }

    .block {
      padding: 12px 16px;
    }

    .block + .block {
      border-top: 1px solid var(--color-border, rgba(0, 0, 0, 0.06));
    }

    .block-head {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .row-left {
      flex: 1;
      min-width: 0;
    }

    .row-right {
      display: inline-flex;
      align-items: center;
      gap: 8px;
    }

    .row-title {
      font-weight: 600;
      color: var(--color-heading, #222);
    }

    .row-title.read {
      color: var(--color-text-muted, #666);
      font-weight: 500;
    }

    .block-msg {
      color: var(--color-text, #333);
      font-size: 14px;
      margin-top: 6px;
      white-space: pre-wrap;
      word-break: break-word;
    }

    .block-actions {
      margin-top: 8px;
    }

    .secondary {
      border: 1px solid var(--color-border, rgba(0, 0, 0, 0.12));
      background: var(--color-surface, #fff);
      padding: 6px 10px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 12px;
      color: #222; /* Ensure text visible */
    }
  `]
})
export class NotificationBellComponent {
  private readonly notifications = inject(NotificationService);

  showDropdown = signal(false);
  showModal = signal(false);

  readonly unreadCount = computed(() => this.notifications.unreadCount());
  readonly unreadDisplay = computed(() => {
    const n = this.unreadCount();
    if (!n) return undefined;
    return n > 9 ? '9+' : String(n);
  });

  readonly topFive = computed(() => this.notifications.top(5));
  readonly all = computed(() => this.notifications.notifications());

  toggleDropdown() {
    this.showDropdown.update(v => !v);
  }

  @HostListener('document:click')
  onDocClick() {
    // Close dropdown when clicking outside
    if (this.showDropdown()) this.showDropdown.set(false);
  }

  openFromDropdown(n: AppNotification) {
    this.notifications.markAsRead(n.id);
    this.showDropdown.set(false);
    this.showModal.set(true);
  }

  openModal() {
    this.showDropdown.set(false);
    this.showModal.set(true);
  }

  closeModal() {
    this.showModal.set(false);
  }

  markAll() {
    this.notifications.markAllAsRead();
  }

  markRead(n: AppNotification) {
    if (n.read) this.notifications.markAsUnread(n.id);
    else this.notifications.markAsRead(n.id);
  }

  timeAgo(date: Date): string {
    const now = Date.now();
    const d = new Date(date).getTime();
    const diff = Math.max(0, now - d);
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'now';
    if (m < 60) return `${m} min`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h} h`;
    const days = Math.floor(h / 24);
    if (days < 7) return `${days} d`;
    const weeks = Math.floor(days / 7);
    return `${weeks} wk`;
  }

  // Character preview limit for dropdown items
  private readonly previewMaxChars = 180;

  /** Returns a truncated preview with ellipsis if text is too long */
  preview(text?: string, max: number = this.previewMaxChars): string {
    if (!text) return '';
    // Normalize whitespace to avoid overly tall rows caused by many breaks
    const normalized = String(text).replace(/\s+/g, ' ').trim();
    if (normalized.length <= max) return normalized;
    return normalized.slice(0, Math.max(0, max - 1)).trimEnd() + '…';
  }
}
