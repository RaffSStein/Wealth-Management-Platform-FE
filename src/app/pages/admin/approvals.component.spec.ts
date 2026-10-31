import {ComponentFixture, TestBed} from '@angular/core/testing';
import {signal} from '@angular/core';
import {HttpErrorResponse} from '@angular/common/http';
import {of, throwError} from 'rxjs';
import {RoleAssignmentRequestDTO, RoleAssignmentService} from '../../api/profiler-service';
import {ReauthService} from '../../core/services/reauth.service';
import {UserSessionService} from '../../core/services/user-session.service';
import {ToastService} from '../../shared/services/toast.service';
import {ApprovalsComponent} from './approvals.component';

describe('ApprovalsComponent', () => {
  const request = (id: number, requestedBy: string, userEmail = `user${id}@bank.test`): RoleAssignmentRequestDTO => ({
    id, userEmail, requestedBy, role: 'ADVISOR', bankCode: 'BANK_A', branchCode: 'BR_01', status: 'PENDING',
    requestedAt: '2026-10-31T09:00:00Z'
  });
  let api: jasmine.SpyObj<RoleAssignmentService>;
  let toast: jasmine.SpyObj<ToastService>;
  let reauthRun: jasmine.Spy;
  let fixture: ComponentFixture<ApprovalsComponent>;

  beforeEach(async () => {
    api = jasmine.createSpyObj<RoleAssignmentService>('RoleAssignmentService',
      ['listRoleAssignmentRequests', 'approveRoleAssignmentRequest', 'rejectRoleAssignmentRequest']);
    api.listRoleAssignmentRequests.and.returnValue(of([request(1, 'other@bank.test'), request(2, 'me@bank.test')]) as any);
    api.approveRoleAssignmentRequest.and.returnValue(of({}) as any);
    toast = jasmine.createSpyObj<ToastService>('ToastService', ['success', 'error', 'warning', 'info']);
    reauthRun = jasmine.createSpy('run').and.callFake((call: () => Promise<unknown>) => call());
    await TestBed.configureTestingModule({
      imports: [ApprovalsComponent],
      providers: [
        {provide: RoleAssignmentService, useValue: api},
        {provide: ReauthService, useValue: {run: reauthRun}},
        {provide: ToastService, useValue: toast},
        {provide: UserSessionService, useValue: {profile: signal({email: 'Me@bank.test'})}}
      ]
    }).compileComponents();
    fixture = TestBed.createComponent(ApprovalsComponent);
    await fixture.whenStable();
    fixture.detectChanges();
  });

  const rows = () => [...fixture.nativeElement.querySelectorAll('tbody tr')] as HTMLElement[];
  const component = () => fixture.componentInstance as unknown as {
    approve(r: RoleAssignmentRequestDTO): Promise<void>;
  };

  it('lists pending requests and blocks the ones the admin made', () => {
    expect(api.listRoleAssignmentRequests).toHaveBeenCalledWith('PENDING');
    expect(rows().length).toBe(2);
    expect(rows()[0].textContent).toContain('Approve');
    expect(rows()[1].textContent).toContain('Needs another admin');
    expect(rows()[1].textContent).not.toContain('Approve');
  });

  it('approves through the re-sign-in prompt and reloads', async () => {
    await component().approve(request(1, 'other@bank.test'));
    expect(reauthRun).toHaveBeenCalled();
    expect(api.approveRoleAssignmentRequest).toHaveBeenCalledWith(1);
    expect(toast.success).toHaveBeenCalled();
    expect(api.listRoleAssignmentRequests).toHaveBeenCalledTimes(2);
  });

  it('says nothing when the re-sign-in is cancelled', async () => {
    reauthRun.and.resolveTo(undefined);
    await component().approve(request(1, 'other@bank.test'));
    expect(toast.success).not.toHaveBeenCalled();
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('reloads a request someone else already decided', async () => {
    api.approveRoleAssignmentRequest.and.returnValue(throwError(() => new HttpErrorResponse({status: 409})));
    await component().approve(request(1, 'other@bank.test'));
    expect(toast.warning).toHaveBeenCalledWith('This request was already decided or has expired.');
    expect(api.listRoleAssignmentRequests).toHaveBeenCalledTimes(2);
  });
});
