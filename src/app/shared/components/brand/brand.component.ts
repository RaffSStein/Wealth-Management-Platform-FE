import {Component, input} from '@angular/core';
import {RouterLink} from '@angular/router';

/** WMP wordmark (bar-chart mark + "WMP"), linking to `link`. */
@Component({
  selector: 'app-brand',
  imports: [RouterLink],
  template: `
    <a class="brand" [routerLink]="link()" aria-label="WMP home">
      <svg [attr.width]="size()" [attr.height]="size()" viewBox="0 0 40 40" aria-hidden="true">
        <rect x="1" y="1" width="38" height="38" rx="7" fill="var(--wmp-surface)" stroke="var(--wmp-border)"/>
        <path d="M9 28h5V18H9zM17.5 28h5V12h-5zM26 28h5V22h-5z" fill="var(--wmp-primary)"/>
      </svg>
      <span class="brand__word">WMP</span>
    </a>
  `,
  styles: [`
    :host { display: inline-flex; }
    .brand { display: flex; align-items: center; gap: .5rem; color: var(--wmp-text); font-weight: 600; letter-spacing: .04em; text-decoration: none; }
    .brand:hover { text-decoration: none; }
  `]
})
export class BrandComponent {
  readonly link = input<string>('/');
  readonly size = input(28);
}
