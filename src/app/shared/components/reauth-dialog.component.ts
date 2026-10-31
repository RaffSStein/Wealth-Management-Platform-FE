import {Component, effect, inject} from '@angular/core';
import {FormControl, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';
import {Button, ButtonDirective, ButtonLabel} from 'primeng/button';
import {Dialog} from 'primeng/dialog';
import {Message} from 'primeng/message';
import {Password} from 'primeng/password';
import {busyAction} from '../../core/services/busy-action';
import {ReauthService} from '../../core/services/reauth.service';

/** "Confirm it's you" prompt opened by `ReauthService` when an admin action needs a recent sign-in. */
@Component({
  selector: 'app-reauth-dialog',
  imports: [ReactiveFormsModule, Button, ButtonDirective, ButtonLabel, Dialog, Message, Password],
  template: `
    <p-dialog header="Confirm it's you" [modal]="true" [visible]="reauth.open()" (visibleChange)="!$event && reauth.cancel()"
              [draggable]="false" [closeOnEscape]="!confirm.pending()" [closable]="!confirm.pending()"
              [style]="{width: 'min(26rem, 94vw)'}">
      <form id="reauth-form" class="wmp-form" [formGroup]="form" (ngSubmit)="confirm()" novalidate>
        <p class="lead">This action needs a recent sign-in. Enter the password for
          <span class="email">{{ reauth.email() }}</span> to continue.</p>
        @if (reauth.error(); as error) {
          <p-message severity="error" [text]="error"/>
        }
        <div class="wmp-field">
          <label for="reauth-password">Password</label>
          <p-password inputId="reauth-password" formControlName="password" [feedback]="false" [toggleMask]="true"
                      autocomplete="current-password" [fluid]="true"/>
        </div>
      </form>
      <ng-template #footer>
        <p-button label="Cancel" severity="secondary" [text]="true" [disabled]="confirm.pending()" (onClick)="reauth.cancel()"/>
        <button pButton type="submit" form="reauth-form" [loading]="confirm.pending()" [disabled]="password.invalid">
          <span pButtonLabel>Confirm</span>
        </button>
      </ng-template>
    </p-dialog>
  `,
  styles: [`
    .lead { margin: 0; color: var(--wmp-text-muted); line-height: 1.5; }
    .email { color: var(--wmp-text); font-weight: 600; overflow-wrap: anywhere; }
  `]
})
export class ReauthDialogComponent {
  protected readonly reauth = inject(ReauthService);
  protected readonly password = new FormControl('', {nonNullable: true, validators: Validators.required});
  protected readonly form = new FormGroup({password: this.password});

  constructor() {
    // Never keep a typed password between prompts
    effect(() => {
      if (this.reauth.open()) this.password.reset();
    });
  }

  protected readonly confirm = busyAction(async () => {
    if (this.password.invalid) return;
    await this.reauth.confirm(this.password.value);
  });
}
