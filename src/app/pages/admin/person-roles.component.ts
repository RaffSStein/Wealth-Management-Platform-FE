import {Component, computed, effect, inject, input, output, signal, untracked} from '@angular/core';
import {DatePipe} from '@angular/common';
import {FormControl, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {firstValueFrom} from 'rxjs';
import {Button, ButtonDirective, ButtonIcon, ButtonLabel} from 'primeng/button';
import {Dialog} from 'primeng/dialog';
import {InputText} from 'primeng/inputtext';
import {Message} from 'primeng/message';
import {Select} from 'primeng/select';
import {Skeleton} from 'primeng/skeleton';
import {RoleAssignmentDTO, RoleAssignmentService} from '../../api/profiler-service';
import {UserSummaryDTO} from '../../api/user-service';
import {BankDirectoryService, BankOption, BranchOption} from '../../core/services/bank-directory.service';
import {ReauthService} from '../../core/services/reauth.service';
import {WmpRole, bankLabel, roleLabel} from '../../core/services/role-assignment';
import {assignableRoles, canRevoke, needsApproval, roleAssignmentErrorMessage} from '../../core/services/role-assignment-policy';
import {UserSessionService} from '../../core/services/user-session.service';
import {ToastService} from '../../shared/services/toast.service';

/**
 * One person's role assignments (profiler-service, the source of truth) with revoke and assign, for the admin
 * "Role assignments" page. Changes take effect at the person's next sign-in; a revoke signs them out everywhere.
 * Staff roles become a request for a second admin. Both actions may need a recent sign-in (`ReauthService`).
 */
@Component({
  selector: 'app-person-roles',
  imports: [DatePipe, ReactiveFormsModule, Button, ButtonDirective, ButtonIcon, ButtonLabel, Dialog, InputText, Message, Select, Skeleton],
  template: `
    <section class="card" [attr.aria-label]="'Roles of ' + displayName()">
      <header class="card__head">
        <div>
          <h2>{{ displayName() }}</h2>
          <p class="muted email">{{ person().email }}</p>
        </div>
        <button pButton type="button" [text]="true" [rounded]="true" severity="secondary" aria-label="Close"
                (click)="closed.emit()">
          <span pButtonIcon class="material-symbols-outlined" aria-hidden="true">close</span>
        </button>
      </header>

      <h3>Current roles</h3>
      @if (loadError()) {
        <p-message severity="error">The roles could not be loaded. Try again in a moment.</p-message>
      } @else if (assignments() === null) {
        <p-skeleton height="3rem"/>
      } @else {
        <ul class="roles">
          @for (a of assignments(); track a.id) {
            <li>
              <span class="roles__main">
                <strong>{{ roleLabel(a.role) }}</strong>
                <span class="num">{{ bankLabel(a.bankCode ?? '') }} / {{ a.branchCode }}</span>
              </span>
              <span class="muted small">Since {{ a.grantedAt | date:'d MMM y' }}{{ a.grantedBy ? ' · by ' + a.grantedBy : '' }}</span>
              @if (!isMe() && canRevoke(a)) {
                <p-button label="Revoke" size="small" severity="danger" [outlined]="true" (onClick)="revoking.set(a)"/>
              }
            </li>
          } @empty {
            <li class="muted">{{ isMe() ? 'No roles.' : 'No role you can see. They are not linked to a branch of yours yet.' }}</li>
          }
        </ul>
      }

      @if (isMe()) {
        <p class="muted">This is you. Another admin manages your roles.</p>
      } @else if (roles().length) {
        <h3>Give a role</h3>
        <form id="assign-form" class="wmp-form" [formGroup]="form" (ngSubmit)="assign()" novalidate>
          <div class="grid">
            <div class="wmp-field">
              <label for="assign-role">Role</label>
              <p-select inputId="assign-role" formControlName="role" [options]="roleOptions()" optionLabel="label"
                        optionValue="value" [fluid]="true"/>
            </div>
            @if (needsBank()) {
              <div class="wmp-field">
                <label for="assign-bank">Bank</label>
                @if (banks(); as options) {
                  <p-select inputId="assign-bank" formControlName="bankCode" [options]="options" optionLabel="label"
                            optionValue="code" [filter]="options.length > 8" placeholder="Choose a bank" [fluid]="true"/>
                } @else {
                  <input pInputText id="assign-bank" formControlName="bankCode" placeholder="BANK_A" autocomplete="off"/>
                }
              </div>
            }
            <div class="wmp-field">
              <label for="assign-branch">Branch</label>
              @if (branches(); as options) {
                <p-select inputId="assign-branch" formControlName="branchCode" [options]="options" optionLabel="label"
                          optionValue="code" [filter]="options.length > 8" [fluid]="true"
                          [placeholder]="options.length ? 'Choose a branch' : 'No active branch'"/>
              } @else {
                <input pInputText id="assign-branch" formControlName="branchCode" placeholder="BR_01" autocomplete="off"/>
              }
            </div>
          </div>
          <p class="muted small">{{ assignHint() }}</p>
          <button pButton type="submit" form="assign-form" [loading]="pending()" [disabled]="form.invalid || pending()" class="cta">
            <span pButtonLabel>{{ approvalNeeded() ? 'Request role' : 'Give role' }}</span>
          </button>
        </form>
      }
    </section>

    <p-dialog header="Revoke role" [modal]="true" [visible]="!!revoking()" (visibleChange)="!$event && closeRevoke()"
              [draggable]="false" [closable]="!pending()" [style]="{width: 'min(28rem, 94vw)'}">
      @if (revoking(); as a) {
        <p class="lead">Remove <strong>{{ roleLabel(a.role) }}</strong> at {{ bankLabel(a.bankCode ?? '') }} / {{ a.branchCode }}
          from {{ displayName() }}?</p>
        <p class="lead">They are signed out everywhere right away, and keep only their other roles.</p>
      }
      <ng-template #footer>
        <p-button label="Cancel" severity="secondary" [text]="true" [disabled]="pending()" (onClick)="closeRevoke()"/>
        <p-button label="Revoke" severity="danger" [loading]="pending()" (onClick)="revoke()"/>
      </ng-template>
    </p-dialog>
  `,
  styles: [`
    .card {
      background: var(--wmp-surface); border: 1px solid var(--wmp-border); border-radius: var(--wmp-radius-lg);
      padding: 1rem 1.25rem; display: grid; gap: .75rem; align-content: start;
    }
    .card__head { display: flex; justify-content: space-between; align-items: flex-start; gap: .75rem; }
    h2 { margin: 0; font-size: 1.05rem; font-weight: 600; }
    h3 { margin: .5rem 0 0; font-size: .85rem; font-weight: 600; color: var(--wmp-text-muted); text-transform: uppercase; letter-spacing: .04em; }
    .muted { margin: 0; color: var(--wmp-text-muted); font-size: .85rem; line-height: 1.5; }
    .small { font-size: .78rem; }
    .email { overflow-wrap: anywhere; }
    .roles { list-style: none; margin: 0; padding: 0; display: grid; gap: .5rem; }
    .roles li {
      display: grid; grid-template-columns: 1fr auto; gap: .15rem .75rem; align-items: center;
      padding: .6rem .75rem; border: 1px solid var(--wmp-border); border-radius: var(--wmp-radius);
    }
    .roles li.muted { display: block; border-style: dashed; }
    .roles__main { display: flex; gap: .75rem; align-items: baseline; flex-wrap: wrap; }
    .roles li p-button { grid-row: 1 / span 2; grid-column: 2; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr)); gap: .75rem; }
    .cta { justify-self: start; }
    .lead { margin: 0 0 .5rem; line-height: 1.5; }
  `]
})
export class PersonRolesComponent {
  readonly person = input.required<UserSummaryDTO>();
  /** Emitted after a successful assign or revoke, so the list can refresh the person's roles. */
  readonly changed = output<void>();
  readonly closed = output<void>();

  private readonly api = inject(RoleAssignmentService);
  private readonly directory = inject(BankDirectoryService);
  private readonly reauth = inject(ReauthService);
  private readonly userSession = inject(UserSessionService);
  private readonly toast = inject(ToastService);

  protected readonly roleLabel = roleLabel;
  protected readonly bankLabel = bankLabel;

  /** null while loading. */
  protected readonly assignments = signal<RoleAssignmentDTO[] | null>(null);
  protected readonly loadError = signal(false);
  protected readonly revoking = signal<RoleAssignmentDTO | null>(null);
  protected readonly pending = signal(false);
  /** Banks to pick from (platform admins), or null to type the code (list unavailable). */
  protected readonly banks = signal<BankOption[] | null>(null);
  /** Active branches of the chosen bank, or null to type the code (no bank yet, or list unavailable). */
  protected readonly branches = signal<BranchOption[] | null>(null);

  protected readonly roles = computed(() => assignableRoles(this.userSession.roles()));
  protected readonly roleOptions = computed(() => this.roles().map(value => ({value, label: roleLabel(value)})));
  /** Only a platform admin names the bank; everyone else assigns in the bank of their token. */
  protected readonly needsBank = computed(() => this.userSession.isPlatformAdmin());
  private readonly personId = computed(() => this.person().id);
  protected readonly isMe = computed(() => !!this.person().id && this.person().id === this.userSession.profile()?.id);
  protected readonly displayName = computed(() => {
    const p = this.person();
    return `${p.firstName ?? ''} ${p.lastName ?? ''}`.trim() || p.email || 'This person';
  });

  protected readonly form = new FormGroup({
    role: new FormControl<WmpRole | null>(null, Validators.required),
    bankCode: new FormControl('', {nonNullable: true}),
    branchCode: new FormControl('', {nonNullable: true, validators: Validators.required})
  });
  private readonly selectedRole = signal<WmpRole | null>(null);
  protected readonly approvalNeeded = computed(() => {
    const role = this.selectedRole();
    return !!role && needsApproval(role);
  });
  protected readonly assignHint = computed(() => this.approvalNeeded()
    ? 'A second admin has to approve it. It applies at their next sign-in.'
    : 'No approval needed. It applies at their next sign-in.');

  constructor() {
    this.form.controls.role.valueChanges.pipe(takeUntilDestroyed()).subscribe(role => this.selectedRole.set(role));
    effect(() => {
      // Keyed on the id: a refreshed copy of the same person keeps the form and the loaded roles
      const id = this.personId();
      untracked(() => {
        this.resetForm();
        void this.load(id);
      });
    });
    effect(() => {
      // A platform admin assigns in any bank: the bank code is then required
      const bank = this.form.controls.bankCode;
      bank.setValidators(this.needsBank() ? Validators.required : null);
      bank.updateValueAndValidity({emitEvent: false});
    });
    // The branch list follows the bank: the admin's own, or the one a platform admin picks
    this.form.controls.bankCode.valueChanges.pipe(takeUntilDestroyed()).subscribe(bank => {
      if (!this.needsBank()) return;
      this.form.controls.branchCode.reset('');
      void this.loadBranches(bank.trim().toUpperCase());
    });
    if (this.needsBank()) {
      void this.directory.banks().then(banks => this.banks.set(banks));
    } else {
      void this.loadBranches(this.userSession.activeBranch()?.bankCode ?? '');
    }
  }

  protected canRevoke(a: RoleAssignmentDTO): boolean {
    return canRevoke(this.userSession.roles(), a.role);
  }

  protected closeRevoke(): void {
    if (!this.pending()) this.revoking.set(null);
  }

  protected async assign(): Promise<void> {
    const {role, bankCode, branchCode} = this.form.getRawValue();
    const userId = this.person().id;
    if (this.form.invalid || !role || !userId || this.pending()) return;
    const bank = this.needsBank() ? bankCode.trim().toUpperCase() : undefined;
    const branch = branchCode.trim().toUpperCase();
    this.pending.set(true);
    try {
      const result = await this.reauth.run(() => firstValueFrom(this.api.assignRole({userId, role, branchCode: branch, bankCode: bank})));
      if (!result) return;
      const where = `${bankLabel(bank ?? this.userSession.activeBranch()?.bankCode ?? '')} / ${branch}`;
      this.toast.success(result.outcome === 'PENDING_APPROVAL'
        ? `Request sent: ${roleLabel(role)} at ${where} for ${this.displayName()} now needs a second admin.`
        : `${this.displayName()} is now ${roleLabel(role)} at ${where}. It applies at their next sign-in.`);
      this.resetForm();
      await this.load(userId);
      this.changed.emit();
    } catch (e) {
      this.toast.error(roleAssignmentErrorMessage(e));
    } finally {
      this.pending.set(false);
    }
  }

  protected async revoke(): Promise<void> {
    const a = this.revoking();
    const userId = this.person().id;
    if (a?.id == null || this.pending()) return;
    this.pending.set(true);
    try {
      const done = await this.reauth.run(async () => {
        await firstValueFrom(this.api.revokeRoleAssignment(a.id!));
        return true;
      });
      if (!done) return;
      this.revoking.set(null);
      this.toast.success(`${roleLabel(a.role)} at ${bankLabel(a.bankCode ?? '')} / ${a.branchCode} removed. ${this.displayName()} has been signed out.`);
      await this.load(userId);
      this.changed.emit();
    } catch (e) {
      this.revoking.set(null);
      this.toast.error(roleAssignmentErrorMessage(e));
    } finally {
      this.pending.set(false);
    }
  }

  private async load(userId: string | undefined): Promise<void> {
    this.assignments.set(null);
    this.loadError.set(false);
    if (!userId) {
      this.assignments.set([]);
      return;
    }
    try {
      const list = await firstValueFrom(this.api.listRoleAssignments(userId));
      if (this.person().id === userId) this.assignments.set(list ?? []);
    } catch {
      if (this.person().id === userId) this.loadError.set(true);
    }
  }

  /** Picks from the bank's active branches; while that list is unknown the branch code is typed. */
  private async loadBranches(bankCode: string): Promise<void> {
    this.branches.set(null);
    if (!bankCode) return;
    const branches = await this.directory.branches(bankCode);
    // A slower answer for a bank the admin has since changed is dropped
    const current = this.needsBank() ? this.form.controls.bankCode.value.trim().toUpperCase() : bankCode;
    if (current === bankCode) this.branches.set(branches);
  }

  private resetForm(): void {
    const roles = this.roles();
    this.form.reset({role: roles.length === 1 ? roles[0] : null, bankCode: '', branchCode: ''});
    this.selectedRole.set(this.form.controls.role.value);
  }
}
