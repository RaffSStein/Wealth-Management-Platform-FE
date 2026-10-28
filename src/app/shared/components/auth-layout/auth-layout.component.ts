import {Component, inject, input} from '@angular/core';
import {ButtonDirective, ButtonIcon} from 'primeng/button';
import {ThemeService} from '../../../core/services/theme.service';
import {BrandComponent} from '../brand/brand.component';

/**
 * Public/auth page layout (sign in, sign up, password flows):
 * product hero on the left, projected form card on the right; stacks on small screens.
 */
@Component({
  selector: 'app-auth-layout',
  imports: [ButtonDirective, ButtonIcon, BrandComponent],
  template: `
    <div class="auth">
      <header class="auth__top">
        <app-brand link="/"/>
        <button pButton type="button" [text]="true" [rounded]="true" severity="secondary"
                [attr.aria-label]="theme.theme() === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'"
                (click)="theme.toggle()">
          <span pButtonIcon class="material-symbols-outlined" aria-hidden="true">
            {{ theme.theme() === 'dark' ? 'light_mode' : 'dark_mode' }}
          </span>
        </button>
      </header>

      <div class="auth__body">
        <section class="hero" aria-hidden="false">
          <h1 class="hero__title">{{ headline() }}</h1>
          <p class="hero__lead">{{ lead() }}</p>
          <ul class="hero__tiles">
            <li><span class="material-symbols-outlined" aria-hidden="true">query_stats</span>
              <span><strong>Live portfolio</strong>Positions, P/L and allocation in one place</span></li>
            <li><span class="material-symbols-outlined" aria-hidden="true">fact_check</span>
              <span><strong>MiFID-compliant</strong>Advice tailored to your investor profile</span></li>
            <li><span class="material-symbols-outlined" aria-hidden="true">support_agent</span>
              <span><strong>Advisor-ready</strong>Work with your advisor on proposals and reviews</span></li>
          </ul>
        </section>

        <main class="card">
          <ng-content/>
        </main>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }
    .auth { min-height: 100dvh; display: flex; flex-direction: column; background: var(--wmp-bg); color: var(--wmp-text); }
    .auth__top { display: flex; justify-content: space-between; align-items: center; padding: 1rem 1.5rem; }
    .material-symbols-outlined { font-size: 20px; }
    .auth__body {
      flex: 1; width: 100%; max-width: 1200px; margin: 0 auto; padding: 1.5rem 1.5rem 3rem; box-sizing: border-box;
      display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: 3rem;
    }
    .hero { flex: 1 1 420px; min-width: 0; max-width: 560px; display: grid; gap: 1.25rem; }
    .hero__title { margin: 0; font-size: clamp(2rem, 4vw, 2.9rem); font-weight: 600; letter-spacing: -.02em; line-height: 1.08; }
    .hero__lead { margin: 0; color: var(--wmp-text-muted); font-size: 1.05rem; line-height: 1.6; max-width: 34rem; }
    .hero__tiles {
      list-style: none; margin: .5rem 0 0; padding: 0; display: grid; gap: 1px;
      background: var(--wmp-border); border: 1px solid var(--wmp-border); border-radius: var(--wmp-radius-lg); overflow: hidden;
    }
    .hero__tiles li { display: flex; gap: .85rem; align-items: flex-start; padding: .9rem 1rem; background: var(--wmp-surface); font-size: .85rem; color: var(--wmp-text-muted); }
    .hero__tiles li .material-symbols-outlined { color: var(--wmp-primary); }
    .hero__tiles strong { display: block; color: var(--wmp-text); font-weight: 600; font-size: .9rem; }
    .card {
      flex: 0 1 440px; min-width: 0; box-sizing: border-box; padding: 2rem;
      background: var(--wmp-surface); border: 1px solid var(--wmp-border); border-radius: calc(var(--wmp-radius-lg) + 2px);
      box-shadow: var(--wmp-shadow);
    }
    @media (max-width: 899.98px) {
      .auth__body { gap: 1.5rem; padding-top: .5rem; }
      .hero__tiles { display: none; }
      .hero { text-align: left; }
    }
    @media (max-width: 479.98px) {
      .card { padding: 1.25rem; }
      .auth__top { padding: .75rem 1rem; }
      .auth__body { padding: .5rem 1rem 2rem; }
    }
  `]
})
export class AuthLayoutComponent {
  protected readonly theme = inject(ThemeService);
  readonly headline = input('Your portfolio. Live, precise, in your control.');
  readonly lead = input('Personalised strategies, portfolio oversight and clear analytics for investors and their advisors.');
}
