import { Injectable, computed, signal } from '@angular/core';

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  // In-memory notifications store (mock data for now)
  private readonly _notifications = signal<AppNotification[]>([
    {
      id: 'n1',
      title: 'New document available',
      message: 'Your monthly statement is ready to download.',
      timestamp: new Date(Date.now() - 1000 * 60 * 20),
      read: false,
    },
    {
      id: 'n2',
      title: 'Transfer completed',
      message: 'Bank transfer to Mario Rossi completed successfully.',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 3),
      read: false,
    },
    {
      id: 'n3',
      title: 'Portfolio update',
      message: 'Your portfolio gained +0.8% today.',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 26),
      read: true,
    },
    {
      id: 'n4',
      title: 'Security alert',
      message: 'New login from a recognized device.',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 48),
      read: false,
    },
    {
      id: 'n5',
      title: 'Tax document',
      message: 'Annual tax report is now available.',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 72),
      read: true,
    },
    {
      id: 'n6',
      title: 'Promotional offer',
      message: 'Earn higher interest on new savings plan.',
      timestamp: new Date(Date.now() - 1000 * 60 * 10),
      read: false,
    },
  ]);

  // Expose notifications as a readonly signal
  readonly notifications = computed(() => this._sorted(this._notifications()));

  // Unread notifications count
  readonly unreadCount = computed(() => this._notifications().filter((n) => !n.read).length);

  add(notification: Omit<AppNotification, 'id' | 'read'> & { id?: string; read?: boolean }) {
    // Note: in real-world, ID would come from backend
    const id = notification.id ?? cryptoRandomId();
    const item: AppNotification = {
      id,
      read: notification.read ?? false,
      ...notification,
    } as AppNotification;
    this._notifications.update((list) => [item, ...list]);
  }

  markAsRead(id: string) {
    this._notifications.update((list) => list.map((n) => (n.id === id ? { ...n, read: true } : n)));
  }

  markAllAsRead() {
    this._notifications.update((list) => list.map((n) => ({ ...n, read: true })));
  }

  markAsUnread(id: string) {
    this._notifications.update((list) => list.map((n) => (n.id === id ? { ...n, read: false } : n)));
  }

  // Return top N most recent notifications
  top(limit: number) {
    return this.notifications().slice(0, limit);
  }

  private _sorted(list: AppNotification[]): AppNotification[] {
    return [...list].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }
}

// Simple random id generator (no external deps)
function cryptoRandomId(): string {
  try {
    // Browser crypto API
    const arr = new Uint8Array(8);
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    (globalThis.crypto || (globalThis as any).msCrypto).getRandomValues(arr);
    return Array.from(arr, (b) => b.toString(16).padStart(2, '0')).join('');
  } catch {
    return Math.random().toString(16).slice(2);
  }
}

