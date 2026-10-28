import {Injectable, inject} from '@angular/core';
import {MessageService} from 'primeng/api';

export type ToastVariant = 'success' | 'error' | 'info' | 'warning';

export interface ToastOptions {
  message: string;
  variant?: ToastVariant;
  durationMs?: number;
}

const SEVERITY: Record<ToastVariant, string> = {
  success: 'success',
  error: 'error',
  info: 'info',
  warning: 'warn'
};

/**
 * App-wide feedback toasts.
 * Thin facade over PrimeNG's MessageService (rendered by <p-toast> in app.html), so feature code
 * keeps a small, library-agnostic API.
 */
@Injectable({providedIn: 'root'})
export class ToastService {
  private readonly messages = inject(MessageService);

  // Default toast visibility duration: 10 seconds
  private readonly defaultDuration = 10000;

  show(options: ToastOptions): void {
    this.messages.add({
      severity: SEVERITY[options.variant ?? 'info'],
      detail: options.message,
      life: options.durationMs ?? this.defaultDuration
    });
  }

  success(message: string, durationMs?: number): void {
    this.show({message, variant: 'success', durationMs});
  }

  error(message: string, durationMs?: number): void {
    this.show({message, variant: 'error', durationMs});
  }

  info(message: string, durationMs?: number): void {
    this.show({message, variant: 'info', durationMs});
  }

  warning(message: string, durationMs?: number): void {
    this.show({message, variant: 'warning', durationMs});
  }

  clear(): void {
    this.messages.clear();
  }
}
