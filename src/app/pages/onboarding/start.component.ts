import {Component, inject, OnInit} from '@angular/core';
import {Router} from '@angular/router';
import {OnboardingProgressService} from '../../core/services/onboarding-progress.service';

@Component({
  selector: 'app-onboarding-start',
  standalone: true,
  template: `
    <section class="auth-shell placeholder">
      <div class="card">
        <h1>Onboarding</h1>
        <p>Redirecting to your next step...</p>
      </div>
    </section>
  `,
  styles: [`
    .auth-shell { min-height: 100dvh; display: grid; place-items: center; padding: 2rem; }
    .card { max-width: 520px; width: 100%; border: 1px solid var(--color-border); background: var(--color-surface); padding: 1.5rem; border-radius: var(--radius); display: grid; gap: 0.75rem; }
    h1 { margin: 0; font-size: 1.5rem; }
    p { margin: 0; font-size: 0.875rem; opacity: 0.8; }
  `]
})
export class OnboardingStartComponent implements OnInit {
  private readonly progress: OnboardingProgressService = inject(OnboardingProgressService);
  private readonly router = inject(Router);

  ngOnInit(): void {
    const target = this.progress.firstIncompletePath();
    queueMicrotask(() => {
      this.router.navigateByUrl(target).catch(() => {});
    });
  }
}
