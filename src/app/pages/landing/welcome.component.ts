import {Component} from '@angular/core';
import {CommonModule, NgOptimizedImage} from '@angular/common';
import {RouterLink} from '@angular/router';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, RouterLink, NgOptimizedImage],
  template: `
    <section class="landing-shell">
      <div class="content card">
        <div class="visual" aria-hidden="true">
          <img class="hero-img rounded" ngSrc="assets/brand/landing.png" alt="" width="520" height="400" priority/>
        </div>
        <div class="copy card--padded">
          <h1>Welcome to Wealth Management Platform</h1>
          <p>Your journey to financial success begins here. Our platform provides personalized investment strategies
            tailored to your unique goals.</p>
          <ul class="benefits">
            <li>
              <span class="icon-bg">
                <span class="icon-mask icon--xxl icon--primary"
                      style="--icon-src: url('assets/icons/sack-dollar-solid.svg');"></span>
                </span>
              <div class="text">
                <div class="benefit-title">Personalized Investment Advice</div>
                <div class="benefit-sub">Custom strategies based on your risk tolerance and financial goals</div>
              </div>
            </li>
            <li>
              <span class="icon-bg">
                <span class="icon-mask icon--xxl icon--primary"
                      style="--icon-src: url('assets/icons/wallet-solid.svg');"></span>
                </span>
              <div class="text">
                <div class="benefit-title">Portfolio Management</div>
                <div class="benefit-sub">Expert oversight and rebalancing to optimize your investments</div>
              </div>
            </li>
            <li>
              <span class="icon-bg">
                <span class="icon-mask icon--xxl icon--primary"
                      style="--icon-src: url('assets/icons/chart-solid.svg');"></span>
                </span>
              <div class="text">
                <div class="benefit-title">Advanced Analytics</div>
                <div class="benefit-sub">Comprehensive insights to track and improve performance</div>
              </div>
            </li>
          </ul>

          <button class="cta primary" type="button" [routerLink]="['/auth/sign-in']">Sign In or Sign Up</button>
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
      align-items: center;
      justify-items: center;
      padding: 2rem;
    }

    .content {
      width: fit-content;
      max-width: 1100px;
      height: fit-content;
      display: grid;
      gap: 0.5rem;
      align-items: stretch;
      align-content: stretch;
      grid-template-columns: 1fr;
    }

    @media (min-width: 900px) {
      .content {
        grid-template-columns: 1fr 1fr;
        align-items: start;
        grid-auto-rows: auto;
      }
    }

    .visual {
      align-items: center;
      justify-content: center;
    }

    .hero-img {
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

    .icon-bg {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 3.5rem;
      height: 3.5rem;
      border-radius: 50%;
      background-color: rgba(0, 123, 255, 0.1);
    }

    .icon-mask {
      width: 1.8rem;
      height: 1.8rem;
      display: inline-block;
      -webkit-mask-image: var(--icon-src);
      mask-repeat: no-repeat;
      -webkit-mask-repeat: no-repeat;
      mask-position: center;
      -webkit-mask-position: center;
      mask-size: contain;
      -webkit-mask-size: contain;
    }

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
      background: linear-gradient(180deg,
        color-mix(in oklab, var(--color-primary), black 6%),
        color-mix(in oklab, var(--color-primary), black 12%));
    }

    .tos {
      margin-top: 0.5rem;
      font-size: 0.85rem;
      opacity: 0.95;
      text-align: center;
    }

    .tos a {
      text-decoration: underline;
    }
  `]
})
export class WelcomeComponent {
}
