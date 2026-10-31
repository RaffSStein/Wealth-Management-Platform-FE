import {ComponentFixture, TestBed} from '@angular/core/testing';
import {signal} from '@angular/core';
import {of} from 'rxjs';
import {BankService} from '../../api/bank-service';
import {RoleAssignmentService} from '../../api/profiler-service';
import {UserService} from '../../api/user-service';
import {ReauthService} from '../../core/services/reauth.service';
import {UserSessionService} from '../../core/services/user-session.service';
import {ToastService} from '../../shared/services/toast.service';
import {RoleAssignmentsComponent} from './role-assignments.component';

describe('RoleAssignmentsComponent', () => {
  let api: jasmine.SpyObj<UserService>;
  let fixture: ComponentFixture<RoleAssignmentsComponent>;

  beforeEach(async () => {
    api = jasmine.createSpyObj<UserService>('UserService', ['searchUsers']);
    api.searchUsers.and.returnValue(of({
      content: [
        {id: 'u2', email: 'carl@bank.test', firstName: 'Carl', lastName: 'Lind',
          roleAssignments: [{id: 5, bankCode: 'BANK_A', branchCode: 'BR_01', role: 'ADVISOR'}]},
        {id: 'u3', email: 'new@mail.test', roleAssignments: []}
      ],
      totalElements: 2, page: 0, size: 20, totalPages: 1
    }) as any);
    await TestBed.configureTestingModule({
      imports: [RoleAssignmentsComponent],
      providers: [
        {provide: UserService, useValue: api},
        {provide: RoleAssignmentService, useValue: jasmine.createSpyObj('RoleAssignmentService', {listRoleAssignments: of([])})},
        {provide: BankService, useValue: jasmine.createSpyObj('BankService', {getBankBranches: of({content: []})})},
        {provide: ReauthService, useValue: {run: (call: () => Promise<unknown>) => call()}},
        {provide: ToastService, useValue: jasmine.createSpyObj('ToastService', ['success', 'error'])},
        {
          provide: UserSessionService, useValue: {
            roles: signal(new Set(['BANK_ADMIN'])), profile: signal({id: 'u1'}), isPlatformAdmin: () => false,
            activeBranch: signal({bankCode: 'BANK_A', branchCode: 'BR_01', roles: ['BANK_ADMIN']})
          }
        }
      ]
    }).compileComponents();
    fixture = TestBed.createComponent(RoleAssignmentsComponent);
    fixture.detectChanges();
  });

  const component = () => fixture.componentInstance as unknown as {
    form: {controls: {query: {setValue(v: string): void}}};
    search(): void;
    setLinked(v: string): void;
  };
  const text = () => (fixture.nativeElement as HTMLElement).textContent!.replace(/\s+/g, ' ');

  async function searchFor(query: string) {
    component().form.controls.query.setValue(query);
    component().search();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  it('does not search with fewer than 3 characters', async () => {
    await searchFor('ab');
    expect(api.searchUsers).not.toHaveBeenCalled();
  });

  it('searches people and shows their roles in scope', async () => {
    await searchFor(' carl ');
    expect(api.searchUsers).toHaveBeenCalledWith('carl', undefined, 0, 20);
    expect(text()).toContain('Advisor · BANK_A/BR_01');
    expect(text()).toContain('Not linked');
  });

  it('lists people not linked to a bank yet', async () => {
    await searchFor('mail');
    component().setLinked('unlinked');
    await fixture.whenStable();
    expect(api.searchUsers).toHaveBeenCalledWith('mail', false, 0, 20);
  });

  it('opens the person panel from a result', async () => {
    await searchFor('carl');
    (fixture.nativeElement.querySelector('tbody button') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-person-roles')).not.toBeNull();
  });
});
