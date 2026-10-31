import {TestBed} from '@angular/core/testing';
import {HttpErrorResponse} from '@angular/common/http';
import {of, throwError} from 'rxjs';
import {BankService} from '../../api/bank-service';
import {BankDirectoryService} from './bank-directory.service';

describe('BankDirectoryService', () => {
  let api: jasmine.SpyObj<BankService>;
  let directory: BankDirectoryService;
  const branch = (branchCode: string, branchName?: string) =>
    ({bankCode: 'BANK_A', branchCode, branchName: branchName as string, status: 'ACTIVE', countryCode: 'IT'});

  beforeEach(() => {
    api = jasmine.createSpyObj<BankService>('BankService', ['getBanks', 'getBankBranches']);
    api.getBanks.and.returnValue(of([
      {bankCode: 'BANK_A', bankName: 'Banca A'}, {bankCode: 'BANK_B'}, {bankCode: 'PLATFORM', bankName: 'Platform'}
    ]) as any);
    api.getBankBranches.and.returnValue(of({content: [branch('BR_01', 'Milano'), branch('BR_02')], page: {number: 0, totalPages: 1}}) as any);
    TestBed.configureTestingModule({providers: [{provide: BankService, useValue: api}]});
    directory = TestBed.inject(BankDirectoryService);
  });

  it('lists the banks the caller may see, without the platform pseudo bank', async () => {
    expect(await directory.banks()).toEqual([{code: 'BANK_A', label: 'BANK_A · Banca A'}, {code: 'BANK_B', label: 'BANK_B'}]);
  });

  it('lists a bank active branches, once per bank', async () => {
    expect(await directory.branches('BANK_A')).toEqual([{code: 'BR_01', label: 'BR_01 · Milano'}, {code: 'BR_02', label: 'BR_02'}]);
    await directory.branches('BANK_A');
    expect(api.getBankBranches).toHaveBeenCalledOnceWith(0, 100, 'branchCode,asc', 'ACTIVE', 'BANK_A');
  });

  it('reads every page of a large bank', async () => {
    api.getBankBranches.and.callFake(((page: number) =>
      of({content: [branch(`BR_${page}`)], page: {number: page, totalPages: 3}})) as any);
    expect((await directory.branches('BANK_A'))!.map(b => b.code)).toEqual(['BR_0', 'BR_1', 'BR_2']);
  });

  it('resolves to null when bank-service fails, and tries again next time', async () => {
    api.getBanks.and.returnValue(throwError(() => new HttpErrorResponse({status: 500})));
    expect(await directory.banks()).toBeNull();
    api.getBanks.and.returnValue(of([{bankCode: 'BANK_A'}]) as any);
    expect((await directory.banks())!.length).toBe(1);
  });
});
