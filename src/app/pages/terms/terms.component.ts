import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-terms',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="terms-shell">
      <div class="container">
        <h1>Terms of Service</h1>
        <p>
          This is a placeholder for the Terms of Service page. Replace this content with your
          actual legal text. You can style this page using your global styles.
        </p>
      </div>
    </section>
  `,
  styles: [`
    .terms-shell { min-height: 60dvh; display: grid; place-items: start center; padding: 2rem; }
    .container { width: 100%; max-width: 900px; }
  `]
})
export class TermsComponent {}

