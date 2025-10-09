import {Component, Input} from '@angular/core';
import {CommonModule} from '@angular/common';
import {NavigationHistoryService} from '../../../core/services/navigation-history.service';

@Component({
  selector: 'app-back-button',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (history.canGoBack$ | async) {
      <button type="button"
              class="back-btn"
              (click)="onClick()"
              [attr.aria-label]="ariaLabel"
              [title]="ariaLabel">
        <svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path d="M15.41 7.41 14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
        </svg>
        @if (showLabel) { <span class="text">{{ label }}</span> }
      </button>
    }
  `,
  styles: [`
    .back-btn {
      --_size: 2.25rem;
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      padding: 0 0.75rem 0 0.5rem;
      height: var(--_size);
      border-radius: var(--radius);
      border: 1px solid var(--color-border);
      background: var(--color-surface);
      color: var(--color-text);
      cursor: pointer;
      font: inherit;
      line-height: 1;
      transition: background .15s, border-color .15s;
    }
    .back-btn:hover { background: var(--color-surface-alt, #f5f5f6); }
    .back-btn:active { background: var(--color-surface); border-color: var(--color-primary); }
    .icon { width: 1.1rem; height: 1.1rem; fill: currentColor; }
    .text { font-size: .85rem; font-weight: 600; }
  `]
})
export class BackButtonComponent {
  @Input() fallback: string = '/';
  @Input() showLabel = false;
  @Input() label = 'Back';
  @Input() ariaLabel = 'Go back';

  constructor(public history: NavigationHistoryService) {}

  onClick() {
    // Explicitly ignore the returned Promise (navigation outcome not critical here)
    void this.history.back(this.fallback);
  }
}
