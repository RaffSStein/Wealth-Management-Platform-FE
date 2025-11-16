import {CommonModule} from '@angular/common';
import {ChangeDetectionStrategy, Component} from '@angular/core';
import {ToastService} from '../../services/toast.service';

@Component({
  selector: 'app-toast-host',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="toast-host">
      @for (t of toastService.items(); track t.id) {
        <div class="toast"
             [class.toast--success]="t.variant === 'success'"
             [class.toast--error]="t.variant === 'error'"
             [class.toast--info]="t.variant === 'info'"
             [class.toast--warning]="t.variant === 'warning'">
          <button type="button" class="toast__close" (click)="close(t.id)">
            ×
          </button>
          <div class="toast__content">
            {{ t.message }}
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .toast-host {
      position: fixed;
      inset: 0;
      pointer-events: none;
      z-index: 1000;
      display: flex;
      align-items: flex-end;
      justify-content: flex-end;
      padding: 1.5rem;
    }

    .toast {
      position: relative;
      min-width: 260px;
      max-width: 360px;
      margin-top: .5rem;
      padding: .75rem 1rem;
      border-radius: .5rem;
      background: rgba(15, 23, 42, 0.9);
      color: #fff;
      box-shadow: 0 4px 12px rgba(0,0,0,.25);
      font-size: .875rem;
      pointer-events: auto;
      overflow: hidden;
    }

    .toast__content {
      position: relative;
      z-index: 1;
      padding-right: 1.25rem;
    }

    .toast__close {
      position: absolute;
      top: 4px;
      right: 6px;
      border: none;
      background: transparent;
      color: inherit;
      font-size: 0.9rem;
      cursor: pointer;
      padding: 0;
      line-height: 1;
    }

    .toast--success {
      background: rgba(22, 163, 74, 0.92);
    }

    .toast--error {
      background: rgba(220, 38, 38, 0.92);
    }

    .toast--info {
      background: rgba(59, 130, 246, 0.92);
    }

    .toast--warning {
      background: rgba(234, 179, 8, 0.92);
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ToastHostComponent {
  constructor(public readonly toastService: ToastService) {}

  close(id: number) {
    this.toastService.dismiss(id);
  }
}
