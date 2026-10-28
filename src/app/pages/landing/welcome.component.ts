import {Component, inject} from '@angular/core';
import {RouterLink} from '@angular/router';
import {ButtonDirective, ButtonIcon, ButtonLabel} from 'primeng/button';
import {ThemeService} from '../../core/services/theme.service';
import {BrandComponent} from '../../shared/components/brand/brand.component';

interface Feature {
  icon: string;
  title: string;
  text: string;
}

/** Public landing page (/). */
@Component({
  selector: 'app-landing',
  imports: [RouterLink, ButtonDirective, ButtonIcon, ButtonLabel, BrandComponent],
  template: `
    <div class="landing">
      <header class="top">
        <app-brand link="/"/>
        <nav class="top__actions" aria-label="Account">
          <button pButton type="button" [text]="true" [rounded]="true" severity="secondary"
                  [attr.aria-label]="theme.theme() === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'"
                  (click)="theme.toggle()">
            <span pButtonIcon class="material-symbols-outlined" aria-hidden="true">
              {{ theme.theme() === 'dark' ? 'light_mode' : 'dark_mode' }}
            </span>
          </button>
          <a pButton routerLink="/auth/sign-in" [text]="true" severity="secondary"><span pButtonLabel>Sign in</span></a>
          <a pButton routerLink="/onboarding/start"><span pButtonLabel>Open an account</span></a>
        </nav>
      </header>

      <main>
        <section class="hero">
          <p class="eyebrow num">WEALTH MANAGEMENT PLATFORM</p>
          <h1>Every number, in real time.<br>Built for investors and their advisors.</h1>
          <p class="lead">Personalised strategies based on your MiFID profile, portfolio oversight and clear analytics,
            in one dark, data-dense workspace.</p>
          <div class="hero__cta">
            <a pButton routerLink="/onboarding/start" size="large"><span pButtonLabel>Open an account</span></a>
            <a pButton routerLink="/auth/sign-in" size="large" severity="secondary" [outlined]="true"><span pButtonLabel>Sign in</span></a>
          </div>
        </section>

        <section class="features" aria-label="What you get">
          @for (f of features; track f.title) {
            <article class="feature">
              <span class="material-symbols-outlined" aria-hidden="true">{{ f.icon }}</span>
              <h2>{{ f.title }}</h2>
              <p>{{ f.text }}</p>
            </article>
          }
        </section>

        <section class="advisors">
          <span class="material-symbols-outlined" aria-hidden="true">support_agent</span>
          <p><strong>Are you an advisor?</strong> Sign in to your workspace to manage clients, MiFID reviews and proposals.</p>
          <a routerLink="/auth/sign-in">Advisor sign in →</a>
        </section>
      </main>

      <footer class="foot">
        <span>© WMP</span>
        <a routerLink="/terms">Terms of Service</a>
      </footer>
    </div>
  `,
  styles: [`
    :host { display: block; }
    .landing { min-height: 100dvh; display: flex; flex-direction: column; background: var(--wmp-bg); color: var(--wmp-text); }
    .material-symbols-outlined { font-size: 22px; }
    .top {
      display: flex; justify-content: space-between; align-items: center; gap: 1rem;
      padding: .75rem 1.5rem; border-bottom: 1px solid var(--wmp-border);
    }
    .top__actions { display: flex; align-items: center; gap: .5rem; }
    main { flex: 1; width: 100%; max-width: 1200px; margin: 0 auto; padding: 0 1.5rem; box-sizing: border-box; }
    .hero { padding: 5rem 0 3rem; display: grid; gap: 1.25rem; max-width: 52rem; }
    .eyebrow { margin: 0; font-size: .75rem; letter-spacing: .12em; color: var(--wmp-primary); }
    .hero h1 { margin: 0; font-size: clamp(2.1rem, 5vw, 3.4rem); line-height: 1.06; font-weight: 600; letter-spacing: -.025em; }
    .lead { margin: 0; font-size: 1.1rem; line-height: 1.6; color: var(--wmp-text-muted); max-width: 40rem; }
    .hero__cta { display: flex; gap: .75rem; flex-wrap: wrap; margin-top: .5rem; }
    .features {
      display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 1px;
      background: var(--wmp-border); border: 1px solid var(--wmp-border); border-radius: var(--wmp-radius-lg); overflow: hidden;
    }
    .feature { background: var(--wmp-surface); padding: 1.5rem; display: grid; gap: .5rem; align-content: start; }
    .feature .material-symbols-outlined { color: var(--wmp-primary); font-size: 26px; }
    .feature h2 { margin: 0; font-size: 1.05rem; font-weight: 600; }
    .feature p { margin: 0; color: var(--wmp-text-muted); font-size: .9rem; line-height: 1.55; }
    .advisors {
      margin: 2rem 0 4rem; display: flex; align-items: center; gap: 1rem; flex-wrap: wrap; padding: 1rem 1.25rem;
      border: 1px solid var(--wmp-border); border-radius: var(--wmp-radius-lg); background: var(--wmp-primary-soft);
    }
    .advisors .material-symbols-outlined { color: var(--wmp-primary); }
    .advisors p { margin: 0; flex: 1; min-width: 14rem; }
    .foot {
      display: flex; justify-content: space-between; gap: 1rem; padding: 1rem 1.5rem;
      border-top: 1px solid var(--wmp-border); color: var(--wmp-text-muted); font-size: .85rem;
    }
    @media (max-width: 599.98px) {
      .top { padding: .5rem 1rem; }
      .top__actions a:first-of-type { display: none; }
      main { padding: 0 1rem; }
      .hero { padding: 2.5rem 0 2rem; }
    }
  `]
})
export class WelcomeComponent {
  protected readonly theme = inject(ThemeService);

  protected readonly features: Feature[] = [
    {icon: 'query_stats', title: 'Your whole portfolio', text: 'Positions, P/L, allocation and cash across your accounts, updated as markets move.'},
    {icon: 'fact_check', title: 'Advice that fits you', text: 'Recommendations matched to your MiFID investor profile, goals and risk tolerance.'},
    {icon: 'swap_horiz', title: 'Act in one place', text: 'Orders, transfers, tax documents and market news without switching tools.'}
  ];
}
