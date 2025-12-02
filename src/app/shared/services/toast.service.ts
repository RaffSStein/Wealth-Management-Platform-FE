import {Injectable, Signal, computed, signal} from '@angular/core';

export type ToastVariant = 'success' | 'error' | 'info' | 'warning';

export interface ToastOptions {
  message: string;
  variant?: ToastVariant;
  durationMs?: number;
}

export interface ToastStateItem extends ToastOptions {
  id: number;
  closing?: boolean; // used to trigger fade-out before removal
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private _items = signal<ToastStateItem[]>([]);
  readonly items: Signal<ToastStateItem[]> = computed(() => this._items());

  // Default toast visibility duration updated to 10 seconds
  private readonly defaultDuration = 10000;
  private readonly fadeDurationMs = 300; // CSS transition must match

  show(options: ToastOptions) {
    const id = Date.now() + Math.random();
    const item: ToastStateItem = {
      id,
      message: options.message,
      variant: options.variant ?? 'info',
      durationMs: options.durationMs ?? this.defaultDuration,
      closing: false
    };
    this._items.update(list => [...list, item]);

    // Auto-dismiss after the configured duration with fade-out
    const duration = item.durationMs ?? this.defaultDuration;
    if (duration > 0) {
      setTimeout(() => this.startClosing(id), duration);
    }

    return id;
  }

  private startClosing(id: number) {
    // mark item as closing to trigger fade-out
    this._items.update(list => list.map(i => i.id === id ? { ...i, closing: true } : i));
    setTimeout(() => this.dismiss(id), this.fadeDurationMs);
  }

  success(message: string, durationMs?: number) {
    return this.show({message, variant: 'success', durationMs});
  }

  error(message: string, durationMs?: number) {
    return this.show({message, variant: 'error', durationMs});
  }

  info(message: string, durationMs?: number) {
    return this.show({message, variant: 'info', durationMs});
  }

  warning(message: string, durationMs?: number) {
    return this.show({message, variant: 'warning', durationMs});
  }

  dismiss(id: number) {
    this._items.update(list => list.filter(i => i.id !== id));
  }

  clear() {
    this._items.set([]);
  }
}
