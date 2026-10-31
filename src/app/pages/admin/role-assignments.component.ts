import {Component, computed, inject, signal} from '@angular/core';
import {FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators} from '@angular/forms';
import {HttpErrorResponse} from '@angular/common/http';
import {firstValueFrom} from 'rxjs';
import {ButtonDirective, ButtonLabel} from 'primeng/button';
import {InputText} from 'primeng/inputtext';
import {Message} from 'primeng/message';
import {SelectButton} from 'primeng/selectbutton';
import {TableLazyLoadEvent, TableModule} from 'primeng/table';
import {Tag} from 'primeng/tag';
import {UserService, UserSummaryDTO} from '../../api/user-service';
import {bankLabel, roleLabel} from '../../core/services/role-assignment';
import {UserSessionService} from '../../core/services/user-session.service';
import {PersonRolesComponent} from './person-roles.component';

type LinkedFilter = 'all' | 'linked' | 'unlinked';

const PAGE_SIZE = 20;
const MIN_QUERY = 3;

/**
 * Admin "Role assignments" (/app/admin/assignments): find people (user-service `GET /user/search`, email or name,
 * scoped by the BE to what the admin may see) and manage their roles in the side panel. "Not linked yet" lists
 * self-registered users without a bank: a bank admin links them by giving them CUSTOMER at a branch.
 */
@Component({
  selector: 'app-admin-role-assignments',
  imports: [FormsModule, ReactiveFormsModule, ButtonDirective, ButtonLabel, InputText, Message, SelectButton, TableModule,
    Tag, PersonRolesComponent],
  template: `
    <section class="page">
      <header class="head">
        <div>
          <p class="muted">Administration</p>
          <h1>Role assignments</h1>
          <p class="muted">{{ intro() }}</p>
        </div>
      </header>

      <form class="search" [formGroup]="form" (ngSubmit)="search()" novalidate role="search">
        <div class="wmp-field search__field">
          <label for="people-query">Email or name</label>
          <input pInputText id="people-query" formControlName="query" type="search" autocomplete="off"
                 placeholder="At least 3 characters" aria-describedby="people-query-hint"/>
        </div>
        <span id="linked-filter" class="wmp-sr-only">Show</span>
        <p-selectbutton [options]="filters" [ngModel]="linked()" [ngModelOptions]="{standalone: true}"
                        (ngModelChange)="setLinked($event)" [allowEmpty]="false" optionLabel="label" optionValue="value"
                        size="small" ariaLabelledBy="linked-filter"/>
        <button pButton type="submit" [disabled]="form.invalid"><span pButtonLabel>Search</span></button>
        <small id="people-query-hint" class="muted">Searches emails and names. Only people you may manage are listed.</small>
      </form>

      <div class="layout" [class.has-panel]="!!selected()">
        <section class="card" aria-label="People">
          @if (error()) {
            <p-message severity="error">{{ error() }}</p-message>
          } @else if (!searched()) {
            <p class="muted empty">{{ linked() === 'unlinked'
              ? 'Search for people who signed up but are not linked to a bank yet, then give them a customer role at a branch.'
              : 'Search for a person to see and change their roles.' }}</p>
          } @else {
            <div class="table-wrap">
              <p-table [value]="people()" [lazy]="true" (onLazyLoad)="page($event)" [paginator]="total() > pageSize"
                       [rows]="pageSize" [totalRecords]="total()" [first]="first()" [loading]="loading()"
                       [tableStyle]="{'min-width': '36rem'}">
                <ng-template #header><tr><th>Name</th><th>Email</th><th>Roles</th><th><span class="wmp-sr-only">Actions</span></th></tr></ng-template>
                <ng-template #body let-p>
                  <tr [class.is-selected]="selected()?.id === p.id">
                    <td>{{ name(p) }}</td>
                    <td class="email">{{ p.email }}</td>
                    <td>
                      @for (a of p.roleAssignments ?? []; track a.id ?? $index) {
                        <p-tag [value]="roleLabel(a.role) + ' · ' + bankLabel(a.bankCode ?? '') + '/' + a.branchCode" severity="secondary" class="chip"/>
                      } @empty {
                        <span class="muted">Not linked</span>
                      }
                    </td>
                    <td class="r">
                      <button pButton type="button" size="small" [outlined]="true" (click)="selected.set(p)"
                              [attr.aria-label]="'Manage roles of ' + (p.email ?? name(p))">
                        <span pButtonLabel>Manage</span>
                      </button>
                    </td>
                  </tr>
                </ng-template>
                <ng-template #emptymessage>
                  <tr><td colspan="4" class="muted">No one matches. Check the spelling, or try the other filter.</td></tr>
                </ng-template>
              </p-table>
            </div>
          }
        </section>

        @if (selected(); as person) {
          <app-person-roles [person]="person" (changed)="refresh()" (closed)="selected.set(null)"/>
        }
      </div>
    </section>
  `,
  styles: [`
    .page { padding: 1.5rem; display: grid; gap: 1rem; max-width: 1440px; }
    h1 { margin: .15rem 0 .25rem; font-size: 1.6rem; font-weight: 600; }
    .muted { margin: 0; color: var(--wmp-text-muted); font-size: .85rem; line-height: 1.5; }
    .search { display: flex; flex-wrap: wrap; align-items: flex-end; gap: .75rem; }
    .search__field { flex: 1 1 18rem; max-width: 28rem; margin: 0; }
    .search small { flex-basis: 100%; }
    .layout { display: grid; gap: 1rem; align-items: start; }
    .layout.has-panel { grid-template-columns: minmax(0, 1.6fr) minmax(20rem, 1fr); }
    @media (max-width: 1100px) { .layout.has-panel { grid-template-columns: 1fr; } }
    .card {
      background: var(--wmp-surface); border: 1px solid var(--wmp-border); border-radius: var(--wmp-radius-lg);
      padding: 1rem 1.25rem; min-width: 0;
    }
    .empty { padding: 1rem 0; }
    .table-wrap { overflow-x: auto; }
    .email { overflow-wrap: anywhere; }
    .chip { margin: 0 .35rem .25rem 0; }
    .r { text-align: right; }
    tr.is-selected td { background: var(--wmp-surface-raised); }
  `]
})
export class RoleAssignmentsComponent {
  private readonly api = inject(UserService);
  private readonly userSession = inject(UserSessionService);

  protected readonly pageSize = PAGE_SIZE;
  protected readonly roleLabel = roleLabel;
  protected readonly bankLabel = bankLabel;
  protected readonly filters: {value: LinkedFilter; label: string}[] = [
    {value: 'all', label: 'All'}, {value: 'linked', label: 'Linked'}, {value: 'unlinked', label: 'Not linked yet'}
  ];

  protected readonly form = new FormGroup({
    query: new FormControl('', {nonNullable: true, validators: [Validators.required, Validators.minLength(MIN_QUERY)]})
  });
  protected readonly linked = signal<LinkedFilter>('all');
  protected readonly people = signal<UserSummaryDTO[]>([]);
  protected readonly total = signal(0);
  protected readonly first = signal(0);
  protected readonly loading = signal(false);
  protected readonly searched = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly selected = signal<UserSummaryDTO | null>(null);
  /** The query of the results on screen (the field may have changed since). */
  private readonly activeQuery = signal('');

  protected readonly intro = computed(() => this.userSession.isPlatformAdmin()
    ? 'Find anyone on the platform and make them bank admin of a bank. It needs a second platform admin.'
    : 'Find people in your bank, link new customers to a branch, and request advisor roles.');

  protected name(p: UserSummaryDTO): string {
    return `${p.firstName ?? ''} ${p.lastName ?? ''}`.trim() || '—';
  }

  protected search(): void {
    if (this.form.invalid) return;
    this.activeQuery.set(this.form.controls.query.value.trim());
    this.selected.set(null);
    void this.load(0);
  }

  protected setLinked(value: LinkedFilter): void {
    this.linked.set(value);
    if (this.searched()) void this.load(0);
  }

  protected page(event: TableLazyLoadEvent): void {
    const first = event.first ?? 0;
    if (first !== this.first()) void this.load(first);
  }

  /** After an assign or revoke: reload the current page so the person's roles stay in sync. */
  protected refresh(): void {
    void this.load(this.first(), true);
  }

  private async load(first: number, keepSelection = false): Promise<void> {
    const query = this.activeQuery();
    if (query.length < MIN_QUERY) return;
    const linked = this.linked() === 'all' ? undefined : this.linked() === 'linked';
    this.loading.set(true);
    this.error.set(null);
    try {
      const result = await firstValueFrom(this.api.searchUsers(query, linked, Math.floor(first / PAGE_SIZE), PAGE_SIZE));
      this.people.set(result?.content ?? []);
      this.total.set(result?.totalElements ?? 0);
      this.first.set(first);
      this.searched.set(true);
      if (keepSelection) {
        const id = this.selected()?.id;
        const fresh = this.people().find(p => p.id === id);
        if (fresh) this.selected.set(fresh);
      }
    } catch (e) {
      this.error.set(e instanceof HttpErrorResponse && e.status === 400
        ? 'Type at least 3 characters of an email or name.'
        : 'The search could not be run. Try again in a moment.');
    } finally {
      this.loading.set(false);
    }
  }
}
