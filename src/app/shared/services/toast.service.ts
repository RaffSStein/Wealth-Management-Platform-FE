import {Injectable, Signal, computed, signal} from '@angular/core';

export type ToastVariant = 'success' | 'error' | 'info' | 'warning';

export interface ToastOptions {
  message: string;
  variant?: ToastVariant;
  durationMs?: number;
}

export interface ToastStateItem extends ToastOptions {
  id: number;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private _items = signal<ToastStateItem[]>([]);
  readonly items: Signal<ToastStateItem[]> = computed(() => this._items());

  private readonly defaultDuration = 5000;

  show(options: ToastOptions) {
    const id = Date.now() + Math.random();
    const item: ToastStateItem = {
      id,
      message: options.message,
      variant: options.variant ?? 'info',
      durationMs: options.durationMs ?? this.defaultDuration
    };
    this._items.update(list => [...list, item]);
    return id;
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
