import {ComponentFixture, TestBed} from '@angular/core/testing';
import {signal} from '@angular/core';
import {HttpErrorResponse} from '@angular/common/http';
import {of, throwError} from 'rxjs';
import {BankService} from '../../api/bank-service';
import {RoleAssignmentDTO, RoleAssignmentService} from '../../api/profiler-service';
import {UserSummaryDTO} from '../../api/user-service';
import {ReauthService} from '../../core/services/reauth.service';
import {WmpRole} from '../../core/services/role-assignment';
import {UserSessionService} from '../../core/services/user-session.service';
import {ToastService} from '../../shared/services/toast.service';
import {PersonRolesComponent} from './person-roles.component';

describe('PersonRolesComponent', () => {
  const person: UserSummaryDTO = {id: 'u2', email: 'carl@bank.test', firstName: 'Carl', lastName: 'Lind'};
  const advisorAt = (id: number, branchCode: string): RoleAssignmentDTO =>
    ({id, userId: 'u2', role: 'ADVISOR', bankCode: 'BANK_A', branchCode, grantedAt: '2026-10-30T10:00:00Z'});
  let api: jasmine.SpyObj<RoleAssignmentService>;
  let bankApi: jasmine.SpyObj<BankService>;
  let toast: jasmine.SpyObj<ToastService>;
  let roles: ReturnType<typeof signal<ReadonlySet<WmpRole>>>;
  let fixture: ComponentFixture<PersonRolesComponent>;

  async function create(callerRoles: WmpRole[], bankCode = 'BANK_A') {
    roles = signal<ReadonlySet<WmpRole>>(new Set(callerRoles));
    await TestBed.configureTestingModule({
      imports: [PersonRolesComponent],
      providers: [
        {provide: RoleAssignmentService, useValue: api},
        {provide: BankService, useValue: bankApi},
        {provide: ReauthService, useValue: {run: (call: () => Promise<unknown>) => call()}},
        {provide: ToastService, useValue: toast},
        {
          provide: UserSessionService, useValue: {
            roles, profile: signal({id: 'u1'}),
            isPlatformAdmin: () => callerRoles.includes('PLATFORM_ADMIN'),
            activeBranch: signal({bankCode, branchCode: 'BR_01', roles: callerRoles})
          }
        }
      ]
    }).compileComponents();
    fixture = TestBed.createComponent(PersonRolesComponent);
    fixture.componentRef.setInput('person', person);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  beforeEach(() => {
    api = jasmine.createSpyObj<RoleAssignmentService>('RoleAssignmentService', ['listRoleAssignments', 'assignRole', 'revokeRoleAssignment']);
    api.listRoleAssignments.and.returnValue(of([advisorAt(5, 'BR_01')]) as any);
    api.assignRole.and.returnValue(of({outcome: 'ASSIGNED'}) as any);
    api.revokeRoleAssignment.and.returnValue(of(undefined) as any);
    bankApi = jasmine.createSpyObj<BankService>('BankService', ['getBanks', 'getBankBranches']);
    bankApi.getBanks.and.returnValue(throwError(() => new HttpErrorResponse({status: 500})));
    bankApi.getBankBranches.and.returnValue(throwError(() => new HttpErrorResponse({status: 500})));
    toast = jasmine.createSpyObj<ToastService>('ToastService', ['success', 'error', 'warning', 'info']);
  });

  const text = () => (fixture.nativeElement as HTMLElement).textContent!.replace(/\s+/g, ' ');
  const component = () => fixture.componentInstance as unknown as {
    form: {setValue(v: object): void};
    assign(): Promise<void>;
    revoking: {set(a: RoleAssignmentDTO): void};
    revoke(): Promise<void>;
  };

  it('lists the person roles from profiler-service, with revoke where the caller may', async () => {
    await create(['BANK_ADMIN']);
    expect(api.listRoleAssignments).toHaveBeenCalledWith('u2');
    expect(text()).toContain('Advisor');
    expect(text()).toContain('BANK_A / BR_01');
    expect(text()).toContain('Revoke');
  });

  it('hides revoke for roles the caller may not manage', async () => {
    await create(['PLATFORM_ADMIN']);
    expect(text()).not.toContain('Revoke');
  });

  it('links a customer to a branch of the admin bank, falling back to a typed branch code', async () => {
    await create(['BANK_ADMIN']);
    expect(fixture.nativeElement.querySelector('input#assign-branch')).not.toBeNull();
    component().form.setValue({role: 'CUSTOMER', bankCode: '', branchCode: ' br_02 '});
    await component().assign();
    expect(api.assignRole).toHaveBeenCalledWith({userId: 'u2', role: 'CUSTOMER', branchCode: 'BR_02', bankCode: undefined});
    expect(toast.success.calls.mostRecent().args[0]).toContain('is now Customer at BANK_A / BR_02');
    expect(api.listRoleAssignments).toHaveBeenCalledTimes(2);
  });

  it('sends the bank for a platform admin and reports a pending request', async () => {
    api.assignRole.and.returnValue(of({outcome: 'PENDING_APPROVAL'}) as any);
    await create(['PLATFORM_ADMIN'], 'PLATFORM');
    component().form.setValue({role: 'BANK_ADMIN', bankCode: 'bank_b', branchCode: 'BR_09'});
    await component().assign();
    expect(api.assignRole).toHaveBeenCalledWith({userId: 'u2', role: 'BANK_ADMIN', branchCode: 'BR_09', bankCode: 'BANK_B'});
    expect(toast.success.calls.mostRecent().args[0]).toContain('needs a second admin');
  });

  it('lets a platform admin pick the bank, then one of its active branches', async () => {
    bankApi.getBanks.and.returnValue(of([{bankCode: 'BANK_A', bankName: 'Banca A'}, {bankCode: 'BANK_B'}]) as any);
    bankApi.getBankBranches.and.returnValue(of({content: [
      {bankCode: 'BANK_B', branchCode: 'BR_09', branchName: 'Roma', status: 'ACTIVE', countryCode: 'IT'}
    ], page: {number: 0, totalPages: 1}}) as any);
    await create(['PLATFORM_ADMIN'], 'PLATFORM');
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('p-select[inputid="assign-bank"]')).not.toBeNull();
    expect(el.querySelector('input#assign-branch')).not.toBeNull(); // no bank chosen yet

    (fixture.componentInstance as unknown as {form: {controls: {bankCode: {setValue(v: string): void}}}})
      .form.controls.bankCode.setValue('BANK_B');
    await fixture.whenStable();
    fixture.detectChanges();
    expect(el.querySelector('p-select[inputid="assign-branch"]')).not.toBeNull();
    expect((fixture.componentInstance as unknown as {branches(): {code: string}[]}).branches().map(b => b.code)).toEqual(['BR_09']);
  });

  it('explains a duplicate assignment', async () => {
    api.assignRole.and.returnValue(throwError(() => new HttpErrorResponse({status: 409})));
    await create(['BANK_ADMIN']);
    component().form.setValue({role: 'ADVISOR', bankCode: '', branchCode: 'BR_01'});
    await component().assign();
    expect(toast.error.calls.mostRecent().args[0]).toContain('already have this role');
  });

  it('revokes an assignment and reloads the roles', async () => {
    await create(['BANK_ADMIN']);
    component().revoking.set(advisorAt(5, 'BR_01'));
    await component().revoke();
    expect(api.revokeRoleAssignment).toHaveBeenCalledWith(5);
    expect(toast.success.calls.mostRecent().args[0]).toContain('has been signed out');
  });
});
