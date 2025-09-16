import {Component, Input, signal, computed, DestroyRef, inject} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormGroup, ReactiveFormsModule} from '@angular/forms';

/* Reusable password strength + confirmation + guidelines component
 * Expected form group structure:
 * group:{ password: FormControl<string>, confirmPassword: FormControl<string> }
 * Parent is responsible for validators (required, minlength, custom match, complexity, etc.)
 */
@Component({
  selector: 'app-password-strength-field',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="two-cols" [formGroup]="group">
      <div class="field">
        <label for="password">Password *</label>
        <input id="password" type="password" formControlName="password" autocomplete="new-password"/>
      </div>
      <div class="field">
        <label for="confirmPassword">Confirm *</label>
        <input id="confirmPassword" type="password" formControlName="confirmPassword" autocomplete="new-password"
               [class.invalid-mismatch]="confirmMismatch()" [attr.aria-invalid]="confirmMismatch() ? 'true' : null" aria-describedby="password-mismatch-error"/>
      </div>
    </div>

    @if (showMismatch()) {
      <div class="group-error" role="alert" aria-live="assertive" id="password-mismatch-error"><small class="error">Passwords do not match</small></div>
    }

    <div class="password-strength-wrapper" aria-live="polite">
      <div class="pw-strength">
        <div class="pw-bar" role="progressbar" aria-label="Password strength"
             [attr.aria-valuenow]="strengthPercent()" aria-valuemin="0" aria-valuemax="100"
             [attr.aria-valuetext]="strengthLabel()">
          <div class="pw-bar__fill" [style.width.%]="strengthPercent()" [ngClass]="strengthClass()"></div>
        </div>
        <div class="pw-strength-label">{{ strengthLabel() }}</div>
      </div>

      <ul class="pw-guidelines">
        <li [class.ok]="hasMinLength()">Minimum 8 characters</li>
        <li [class.ok]="hasUpper()">At least one uppercase letter</li>
        <li [class.ok]="hasNumber()">At least one number</li>
        <li [class.ok]="hasSymbol()">At least one symbol</li>
      </ul>

      @if (submitted && passwordCtrl?.invalid) {
        <ul class="pw-errors">
          @if (passwordCtrl?.errors?.['minlength']) { <li>Minimum length not met</li> }
          @if (passwordCtrl?.errors?.['missingUppercase']) { <li>Missing uppercase letter</li> }
          @if (passwordCtrl?.errors?.['missingNumber']) { <li>Missing number</li> }
          @if (passwordCtrl?.errors?.['missingSymbol']) { <li>Missing symbol</li> }
        </ul>
      }
    </div>
  `,
  styles: [`
    .password-strength-wrapper {
      display: grid;
      gap: .4rem;
      margin-top: .75rem;
    }

    .group-error {
      margin-top: .35rem;
      color: var(--color-danger);
      background: #fee4e2;
      border: 1px solid #fecdca;
      padding: 0.4rem 0.5rem;
      border-radius: var(--radius);
    }

    .pw-strength {
      display: flex;
      align-items: center;
      gap: .6rem;
    }

    .pw-bar {
      flex: 1;
      height: 6px;
      background: var(--color-border);
      border-radius: 4px;
      overflow: hidden;
      position: relative;
    }

    .pw-bar__fill {
      height: 100%;
      width: 0;
      transition: width .35s ease, background-color .35s ease;
    }

    .pw-bar__fill.pw-weak { background: #dc2626; }
    .pw-bar__fill.pw-fair { background: #f59e0b; }
    .pw-bar__fill.pw-good { background: #eab308; }
    .pw-bar__fill.pw-strong { background: #16a34a; }

    .pw-strength-label {
      font-size: .65rem;
      font-weight: 700;
      letter-spacing: .5px;
      text-transform: uppercase;
      color: var(--color-text-muted);
      min-width: 52px;
      text-align: right;
    }

    .pw-guidelines {
      list-style: none;
      margin: .35rem 0 .15rem;
      padding: 0;
      font-size: .55rem;
      line-height: 1.2;
      color: var(--color-text-muted);
      display: grid;
      gap: 2px;
    }

    .pw-guidelines li { position: relative; padding-left: 14px; }
    .pw-guidelines li::before { content: '•'; position: absolute; left: 0; top: 0; opacity: .5; }
    .pw-guidelines li.ok { color: var(--color-success, #0f7b3e); }
    .pw-guidelines li.ok::before { content: '✔'; opacity: 1; font-size: .55rem; top: 1px; }

    .pw-errors { margin: .25rem 0 0; padding-left: 16px; color: var(--color-danger); font-size: .55rem; display: grid; gap: 2px; }
    .pw-errors li { list-style: disc; }

    .invalid-mismatch { border-color: var(--color-danger) !important; outline: none; }
    .invalid-mismatch:focus { box-shadow: 0 0 0 1px var(--color-danger); }

    @media (prefers-reduced-motion: reduce) { .pw-bar__fill { transition: none; } }
  `]
})
export class PasswordStrengthFieldComponent {
  private _group!: FormGroup;
  private destroyRef = inject(DestroyRef);
  private passwordSub: any = null;
  @Input({required: true}) set group(g: FormGroup) {
    if (!g) return;
    this._group = g;
    this.bindPasswordListener();
  }
  get group(): FormGroup { return this._group; }

  @Input() submitted = false;

  private pwdValue = signal('');
  private passwordBound = false;

  private bindPasswordListener() {
    const ctrl = this._group?.get('password');
    if (!ctrl) return;
    if (this.passwordSub) {
      this.passwordSub.unsubscribe();
      this.passwordSub = null;
    }
    this.passwordBound = true;
    this.passwordSub = ctrl.valueChanges.subscribe(v => this.pwdValue.set(v || ''));
    this.destroyRef.onDestroy(() => this.passwordSub?.unsubscribe());
    this.pwdValue.set(ctrl.value || '');
  }

  strengthPercent = computed(() => computePasswordPercent(this.pwdValue()));

  strengthLabel = computed(() => {
    const p = this.strengthPercent();
    if (!this.pwdValue()) return 'Enter a password';
    if (p < 30) return 'Weak';
    if (p < 55) return 'Fair';
    if (p < 80) return 'Good';
    return 'Strong';
  });

  strengthClass = computed(() => {
    const l = this.strengthLabel();
    return {
      'pw-weak': l === 'Weak',
      'pw-fair': l === 'Fair',
      'pw-good': l === 'Good',
      'pw-strong': l === 'Strong'
    };
  });

  hasMinLength = computed(() => this.pwdValue().length >= 8);
  hasUpper = computed(() => /[A-Z]/.test(this.pwdValue()));
  hasNumber = computed(() => /\d/.test(this.pwdValue()));
  hasSymbol = computed(() => /[^A-Za-z0-9]/.test(this.pwdValue()));

  get passwordCtrl() { return this._group?.get('password'); }
  get confirmPasswordCtrl() { return this._group?.get('confirmPassword'); }

  confirmMismatch(): boolean {
    const pwd = this.passwordCtrl?.value || '';
    const conf = this.confirmPasswordCtrl?.value || '';
    if (!conf || !pwd) return false;
    return pwd !== conf;
  }

  showMismatch(): boolean {
    if (this.confirmMismatch()) return true;
    const grp = this._group;
    return !!(grp && grp.errors?.['passwordMismatch'] && this.confirmPasswordCtrl?.value);
  }
}

export function computePasswordPercent(pwd: string): number {
  if (!pwd) return 0;
  let pct = 0;
  pct += (Math.min(pwd.length, 12) / 12) * 40;
  if (/[A-Z]/.test(pwd)) pct += 15;
  if (/\d/.test(pwd)) pct += 15;
  if (/[^A-Za-z0-9]/.test(pwd)) pct += 15;
  if (pwd.length >= 12) pct += 15;
  return Math.min(100, Math.round(pct));
}
