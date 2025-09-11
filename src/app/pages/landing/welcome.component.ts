import {Component} from '@angular/core';
import {CommonModule, NgOptimizedImage} from '@angular/common';
import {RouterLink} from '@angular/router';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, RouterLink, NgOptimizedImage],
  template: `
    <section class="landing-shell">
      <div class="content card card--padded">
        <div class="visual" aria-hidden="true">
          <!-- uso width/height per evitare layout shift e garantire visibilità -->
          <img class="hero-img rounded" ngSrc="assets/brand/landing.png" alt="" width="520" height="400" priority/>
        </div>
        <div class="copy">
          <h1>Welcome to Wealth Management Platform</h1>
          <p>Your journey to financial success begins here. Our platform provides personalized investment strategies
            tailored to your unique goals.</p>
          <ul class="benefits">
            <li>
              <span class="icon-mask icon--lg icon--primary"
                    style="--icon-src: url('assets/icons/sack-dollar-solid.svg');"></span>
              <div class="text">
                <div class="benefit-title">Personalized Investment Advice</div>
                <div class="benefit-sub">A short placeholder description that explains this benefit in one or two
                  lines.
                </div>
              </div>
            </li>
            <li>
              <span class="icon-mask icon--lg icon--primary"
                    style="--icon-src: url('assets/icons/wallet-solid.svg');"></span>
              <div class="text">
                <div class="benefit-title">Portfolio Management</div>
                <div class="benefit-sub">Manage, rebalance, and optimize your portfolio effortlessly over time.</div>
              </div>
            </li>
            <li>
              <span class="icon-mask icon--lg icon--primary"
                    style="--icon-src: url('assets/icons/chart-solid.svg');"></span>
              <div class="text">
                <div class="benefit-title">Advanced Analytics</div>
                <div class="benefit-sub">Insights and metrics that help you make better financial decisions.</div>
              </div>
            </li>
          </ul>

          <button class="cta primary" type="button" [routerLink]="['/login']">sign in or sign up</button>
          <p class="tos">
            By continuing, you agree to our <a [routerLink]="['/terms']">Terms of Service</a>
          </p>
        </div>
      </div>
    </section>
  `,
  styles: [`
    .landing-shell {
      min-height: 100dvh;
      display: grid;
      /* permetti al figlio (.content) di occupare tutta l'altezza disponibile */
      align-items: stretch;
      justify-items: center;
      padding: 2rem;
    }

    .content {
      width: 100%;
      max-width: 1100px;
      height: 100%; /* consente ai figli con height:100% di estendersi */
      display: grid;
      gap: 2rem;
      align-items: stretch; /* i figli (visual, copy) si estendono alla stessa altezza */
      align-content: stretch; /* allunga la riga alla piena altezza disponibile */
      grid-template-columns: 1fr;
    }

    @media (min-width: 900px) {
      .content {
        grid-template-columns: 1fr 1fr;
        grid-auto-rows: 1fr; /* forza la riga a occupare tutta l'altezza su desktop */
      }
    }

    .visual {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100%;
    }

    .hero-img {
      max-width: 520px;
      width: 100%;
      height: auto;
      display: block;
    }

    .copy {
      height: 100%;
      display: flex;
      flex-direction: column;
      justify-content: center;
    }

    .copy h1 {
      margin: 0 0 0.5rem;
    }

    .copy p {
      margin: 0 0 1rem;
    }

    .benefits {
      list-style: none;
      padding: 0;
      margin: 0 0 1.25rem;
      display: grid;
      gap: 0.9rem;
    }

    .benefits li {
      display: grid;
      grid-template-columns: auto 1fr;
      align-items: start;
      gap: 0.75rem;
    }

    .benefit-title {
      font-weight: 700;
      font-size: 1.05rem;
      line-height: 1.2;
    }

    .benefit-sub {
      font-weight: 400;
      font-size: 0.9rem;
      color: var(--color-text-muted);
      line-height: 1.3;
    }

    /* Icone: usa utility globali .icon + .icon--lg per dimensioni; niente sizing locale qui */

    .cta {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      height: 48px;
      padding: 0 1.1rem;
      border-radius: var(--radius);
      text-transform: none;
      font-weight: 600;
      border: 1px solid transparent;
      align-self: stretch;
    }

    .primary {
      color: var(--color-primary-contrast);
      background: linear-gradient(180deg, color-mix(in oklab, var(--color-primary), white 8%), var(--color-primary));
      border-color: color-mix(in oklab, var(--color-primary), black 6%);
    }

    .primary:hover {
      background:
        linear-gradient(180deg,
          color-mix(in oklab, var(--color-primary), black 6%),
          color-mix(in oklab, var(--color-primary), black 12%));
    }

    .tos {
      margin-top: 0.5rem;
      font-size: 0.85rem;
      opacity: 0.95;
    }

    .tos a {
      text-decoration: underline;
    }
  `]
})
export class WelcomeComponent {
}
