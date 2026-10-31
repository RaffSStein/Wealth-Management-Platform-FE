import {Component, computed, inject, signal} from '@angular/core';
import {DatePipe} from '@angular/common';
import {FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators} from '@angular/forms';
import {HttpErrorResponse} from '@angular/common/http';
import {firstValueFrom} from 'rxjs';
import {Button, ButtonDirective, ButtonLabel} from 'primeng/button';
import {Dialog} from 'primeng/dialog';
import {Message} from 'primeng/message';
import {SelectButton} from 'primeng/selectbutton';
import {Skeleton} from 'primeng/skeleton';
import {TableModule} from 'primeng/table';
import {Tag} from 'primeng/tag';
import {Textarea} from 'primeng/textarea';
import {
  RoleAssignmentRequestDTO,
  RoleAssignmentRequestStatusDTO,
  RoleAssignmentService
} from '../../api/profiler-service';
import {busyAction} from '../../core/services/busy-action';
import {ReauthService} from '../../core/services/reauth.service';
import {bankLabel, roleLabel} from '../../core/services/role-assignment';
import {UserSessionService} from '../../core/services/user-session.service';
import {ToastService} from '../../shared/services/toast.service';

type Status = RoleAssignmentRequestStatusDTO;

const STATUS_LABELS: Record<Status, string> = {
  PENDING: 'Pending', APPROVED: 'Approved', REJECTED: 'Rejected', EXPIRED: 'Expired'
};

/**
 * Four-eyes queue (/app/admin/approvals): staff role requests of the admin's bank (BANK_ADMIN) or of every bank
 * (PLATFORM_ADMIN), newest first. Deciding needs a second admin (never the requester or the target) and a recent
 * sign-in, so decisions go through `ReauthService`. The other statuses are the audit trail.
 */
@Component({
  selector: 'app-admin-approvals',
  imports: [DatePipe, FormsModule, ReactiveFormsModule, Button, ButtonDirective, ButtonLabel, Dialog, Message,
    SelectButton, Skeleton, TableModule, Tag, Textarea],
  template: `
    <section class="page">
      <header class="head">
        <div>
          <p class="muted">Administration</p>
          <h1>Approvals</h1>
          <p class="muted">Staff roles need a second admin. A new role applies at the person's next sign-in.</p>
        </div>
        <p-selectbutton [options]="statuses" [ngModel]="status()" (ngModelChange)="select($event)" [allowEmpty]="false"
                        optionLabel="label" optionValue="value" size="small" ariaLabelledBy="status-filter"/>
        <span id="status-filter" class="wmp-sr-only">Request status</span>
      </header>

      @if (error()) {
        <p-message severity="error">The requests could not be loaded. Try again in a moment.</p-message>
      } @else if (loading()) {
        <p-skeleton height="240px"/>
      } @else {
        <section class="card" [attr.aria-label]="statusLabel(status()) + ' requests'">
          <div class="table-wrap">
            <p-table [value]="requests()" [rows]="10" [paginator]="requests().length > 10" [tableStyle]="{'min-width': '48rem'}">
              <ng-template #header>
                <tr>
                  <th>Person</th><th>Role</th><th>Bank / branch</th><th>Requested by</th><th>Requested</th>
                  @if (pending()) { <th><span class="wmp-sr-only">Actions</span></th> }
                  @else { <th>Decided by</th><th>Status</th> }
                </tr>
              </ng-template>
              <ng-template #body let-r>
                <tr>
                  <td class="email">{{ r.userEmail }}</td>
                  <td>{{ roleLabel(r.role) }}</td>
                  <td class="num">{{ bankLabel(r.bankCode) }} / {{ r.branchCode }}</td>
                  <td class="email">{{ r.requestedBy }}</td>
                  <td class="num">{{ r.requestedAt | date:'d MMM y, HH:mm' }}</td>
                  @if (pending()) {
                    <td class="r">
                      @if (blockedReason(r); as reason) {
                        <span class="muted">{{ reason }}</span>
                      } @else {
                        <span class="actions">
                          <p-button label="Reject" size="small" severity="secondary" [outlined]="true"
                                    [disabled]="deciding() !== null" (onClick)="openReject(r)"/>
                          <p-button label="Approve" size="small" [loading]="deciding() === r.id"
                                    [disabled]="deciding() !== null && deciding() !== r.id" (onClick)="approve(r)"/>
                        </span>
                      }
                    </td>
                  } @else {
                    <td class="email">{{ r.decidedBy ?? '—' }}</td>
                    <td>
                      <p-tag [value]="statusLabel(r.status)" [severity]="r.status === 'APPROVED' ? 'success' : 'secondary'"/>
                      @if (r.reason) { <span class="reason">{{ r.reason }}</span> }
                    </td>
                  }
                </tr>
              </ng-template>
              <ng-template #emptymessage>
                <tr><td [attr.colspan]="pending() ? 6 : 7" class="muted">
                  {{ pending() ? 'No requests are waiting for a decision.' : 'No ' + statusLabel(status()).toLowerCase() + ' requests.' }}
                </td></tr>
              </ng-template>
            </p-table>
          </div>
        </section>
      }
    </section>

    <p-dialog header="Reject request" [modal]="true" [visible]="!!rejecting()" (visibleChange)="!$event && closeReject()"
              [draggable]="false" [closable]="!reject.pending()" [style]="{width: 'min(30rem, 94vw)'}">
      @if (rejecting(); as r) {
        <form id="reject-form" class="wmp-form" [formGroup]="rejectForm" (ngSubmit)="reject()" novalidate>
          <p class="muted">{{ roleLabel(r.role) }} for {{ r.userEmail }} at {{ bankLabel(r.bankCode ?? '') }} / {{ r.branchCode }}.
            The requester sees your reason.</p>
          <div class="wmp-field">
            <label for="reject-reason">Reason</label>
            <textarea pTextarea id="reject-reason" formControlName="reason" rows="3" maxlength="500"></textarea>
          </div>
        </form>
      }
      <ng-template #footer>
        <p-button label="Cancel" severity="secondary" [text]="true" [disabled]="reject.pending()" (onClick)="closeReject()"/>
        <button pButton type="submit" form="reject-form" severity="danger" [loading]="reject.pending()" [disabled]="reason.invalid">
          <span pButtonLabel>Reject</span>
        </button>
      </ng-template>
    </p-dialog>
  `,
  styles: [`
    .page { padding: 1.5rem; display: grid; gap: 1rem; max-width: 1440px; }
    .head { display: flex; justify-content: space-between; align-items: flex-end; gap: 1rem; flex-wrap: wrap; }
    h1 { margin: .15rem 0 .25rem; font-size: 1.6rem; font-weight: 600; }
    .muted { margin: 0; color: var(--wmp-text-muted); font-size: .85rem; }
    .card {
      background: var(--wmp-surface); border: 1px solid var(--wmp-border); border-radius: var(--wmp-radius-lg);
      padding: 1rem 1.25rem;
    }
    .table-wrap { overflow-x: auto; }
    .r { text-align: right; }
    .actions { display: inline-flex; gap: .5rem; }
    .email { overflow-wrap: anywhere; }
    .reason { display: block; margin-top: .25rem; color: var(--wmp-text-muted); font-size: .8rem; }
  `]
})
export class ApprovalsComponent {
  private readonly api = inject(RoleAssignmentService);
  private readonly reauth = inject(ReauthService);
  private readonly userSession = inject(UserSessionService);
  private readonly toast = inject(ToastService);

  protected readonly statuses = (Object.keys(STATUS_LABELS) as Status[]).map(value => ({value, label: STATUS_LABELS[value]}));
  protected readonly status = signal<Status>('PENDING');
  protected readonly pending = computed(() => this.status() === 'PENDING');
  protected readonly requests = signal<RoleAssignmentRequestDTO[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal(false);
  protected readonly deciding = signal<number | null>(null);
  protected readonly rejecting = signal<RoleAssignmentRequestDTO | null>(null);
  protected readonly reason = new FormControl('', {nonNullable: true, validators: [Validators.required, Validators.maxLength(500)]});
  protected readonly rejectForm = new FormGroup({reason: this.reason});

  protected readonly roleLabel = roleLabel;
  protected readonly bankLabel = bankLabel;
  protected readonly statusLabel = (s: Status | undefined) => s ? STATUS_LABELS[s] : '';

  private readonly myEmail = computed(() => this.userSession.profile()?.email?.toLowerCase() ?? '');

  constructor() {
    void this.load();
  }

  protected select(status: Status): void {
    this.status.set(status);
    void this.load();
  }

  /** Requests this admin may not decide (the BE would answer 403): their own, or their own role. */
  protected blockedReason(r: RoleAssignmentRequestDTO): string | null {
    const me = this.myEmail();
    if (!me) return null;
    if (r.requestedBy?.toLowerCase() === me) return 'Needs another admin';
    if (r.userEmail?.toLowerCase() === me) return 'Your own role';
    return null;
  }

  protected async approve(r: RoleAssignmentRequestDTO): Promise<void> {
    if (r.id == null || this.deciding() !== null) return;
    this.deciding.set(r.id);
    try {
      const done = await this.reauth.run(() => firstValueFrom(this.api.approveRoleAssignmentRequest(r.id!)));
      if (done === undefined) return;
      this.toast.success(`${r.userEmail} is now ${roleLabel(r.role)} at ${bankLabel(r.bankCode ?? '')} / ${r.branchCode}. It applies at their next sign-in.`);
      await this.load();
    } catch (e) {
      await this.decisionFailed(e);
    } finally {
      this.deciding.set(null);
    }
  }

  protected openReject(r: RoleAssignmentRequestDTO): void {
    this.reason.reset();
    this.rejecting.set(r);
  }

  protected closeReject(): void {
    if (!this.reject.pending()) this.rejecting.set(null);
  }

  protected readonly reject = busyAction(async () => {
    const r = this.rejecting();
    if (r?.id == null || this.reason.invalid) return;
    try {
      const done = await this.reauth.run(() =>
        firstValueFrom(this.api.rejectRoleAssignmentRequest(r.id!, {reason: this.reason.value.trim()})));
      if (done === undefined) return;
      this.rejecting.set(null);
      this.toast.success(`Request for ${r.userEmail} rejected.`);
      await this.load();
    } catch (e) {
      this.rejecting.set(null);
      await this.decisionFailed(e);
    }
  });

  private async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(false);
    try {
      this.requests.set(await firstValueFrom(this.api.listRoleAssignmentRequests(this.status())) ?? []);
    } catch {
      this.error.set(true);
    } finally {
      this.loading.set(false);
    }
  }

  private async decisionFailed(e: unknown): Promise<void> {
    const status = e instanceof HttpErrorResponse ? e.status : 0;
    if (status === 409 || status === 404) {
      this.toast.warning('This request was already decided or has expired.');
      await this.load();
    } else if (status === 403) {
      this.toast.error("You can't decide this request.");
    } else if (status === 503) {
      this.toast.error('Nothing was changed: a service is unavailable. Try again in a moment.');
    } else {
      this.toast.error("The decision couldn't be saved. Try again in a moment.");
    }
  }
}
