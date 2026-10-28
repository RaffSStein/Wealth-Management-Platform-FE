import {Component, Input, signal, computed, DestroyRef, inject} from '@angular/core';
import {NgClass} from '@angular/common';
import {Password} from 'primeng/password';
import {FormGroup, ReactiveFormsModule} from '@angular/forms';

/* Reusable password strength + confirmation + guidelines component
 * Expected form group structure:
 * group:{ password: FormControl<string>, confirmPassword: FormControl<string> }
 * Parent is responsible for validators (required, minlength, custom match, complexity, etc.)
 */
@Component({
  selector: 'app-password-strength-field',
  standalone: true,
  imports: [NgClass, ReactiveFormsModule, Password],
  template: `
    <div class="wmp-form-grid" [formGroup]="group">
      <div class="wmp-field">
        <label for="password">Password<span class="wmp-req" aria-hidden="true">*</span></label>
        <p-password inputId="password" formControlName="password" [toggleMask]="true" [feedback]="false"
                    autocomplete="new-password" [fluid]="true"/>
      </div>
      <div class="wmp-field">
        <label for="confirmPassword">Confirm password<span class="wmp-req" aria-hidden="true">*</span></label>
        <p-password inputId="confirmPassword" formControlName="confirmPassword" [toggleMask]="true" [feedback]="false"
                    autocomplete="new-password" [fluid]="true" [class.is-mismatch]="confirmMismatch()"/>
        @if (showMismatch()) {
          <small class="wmp-field__error" role="alert" id="password-mismatch-error">Passwords do not match</small>
        }
      </div>
    </div>

    <div class="strength" aria-live="polite">
      <div class="strength__row">
        <div class="strength__bar" role="progressbar" aria-label="Password strength"
             [attr.aria-valuenow]="strengthPercent()" aria-valuemin="0" aria-valuemax="100"
             [attr.aria-valuetext]="strengthLabel()">
          <div class="strength__fill" [style.width.%]="strengthPercent()" [ngClass]="strengthClass()"></div>
        </div>
        <span class="strength__label">{{ strengthLabel() }}</span>
      </div>

      <ul class="rules">
        <li [class.ok]="hasMinLength()"><span class="material-symbols-outlined" aria-hidden="true">{{ hasMinLength() ? 'check_circle' : 'radio_button_unchecked' }}</span>Minimum 8 characters</li>
        <li [class.ok]="hasUpper()"><span class="material-symbols-outlined" aria-hidden="true">{{ hasUpper() ? 'check_circle' : 'radio_button_unchecked' }}</span>One uppercase letter</li>
        <li [class.ok]="hasNumber()"><span class="material-symbols-outlined" aria-hidden="true">{{ hasNumber() ? 'check_circle' : 'radio_button_unchecked' }}</span>One number</li>
        <li [class.ok]="hasSymbol()"><span class="material-symbols-outlined" aria-hidden="true">{{ hasSymbol() ? 'check_circle' : 'radio_button_unchecked' }}</span>One symbol</li>
      </ul>

      @if (submitted && passwordCtrl?.invalid) {
        <ul class="errors">
          @if (passwordCtrl?.errors?.['minlength']) { <li>Minimum length not met</li> }
          @if (passwordCtrl?.errors?.['missingUppercase']) { <li>Missing uppercase letter</li> }
          @if (passwordCtrl?.errors?.['missingNumber']) { <li>Missing number</li> }
          @if (passwordCtrl?.errors?.['missingSymbol']) { <li>Missing symbol</li> }
        </ul>
      }
    </div>
  `,
  styles: [`
    :host { display: grid; gap: .75rem; }
    .strength { display: grid; gap: .6rem; }
    .strength__row { display: flex; align-items: center; gap: .75rem; }
    .strength__bar { flex: 1; height: 6px; background: var(--wmp-surface-raised); border-radius: 3px; overflow: hidden; }
    .strength__fill { height: 100%; width: 0; transition: width .3s ease, background-color .3s ease; }
    .strength__fill.pw-weak { background: var(--wmp-danger); }
    .strength__fill.pw-fair { background: var(--wmp-warning); }
    .strength__fill.pw-good { background: var(--wmp-primary); }
    .strength__fill.pw-strong { background: var(--wmp-gain); }
    .strength__label { min-width: 7rem; text-align: right; font-family: var(--wmp-font-mono); font-size: .75rem; color: var(--wmp-text-muted); }
    .rules { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: .35rem 1rem; font-size: .8rem; color: var(--wmp-text-muted); }
    .rules li { display: flex; align-items: center; gap: .4rem; }
    .rules li.ok { color: var(--wmp-gain); }
    .rules .material-symbols-outlined { font-size: 16px; }
    .errors { margin: 0; padding-left: 1rem; color: var(--wmp-danger); font-size: .8rem; display: grid; gap: 2px; }
    :host ::ng-deep .is-mismatch .p-password-input { border-color: var(--wmp-danger); }
    @media (prefers-reduced-motion: reduce) { .strength__fill { transition: none; } }
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
