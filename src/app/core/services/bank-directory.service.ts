import {Injectable, inject} from '@angular/core';
import {firstValueFrom} from 'rxjs';
import {BankBranchDto, BankService} from '../../api/bank-service';
import {PLATFORM_TENANT} from './role-assignment';

export interface BankOption {
  code: string;
  label: string;
}

export interface BranchOption {
  code: string;
  label: string;
}

const PAGE_SIZE = 100; // BE maximum
const MAX_PAGES = 20;

/**
 * Banks and branches for pickers (bank-service `GET /bank/banks` and `GET /bank/branches?status=ACTIVE`), cached for
 * the app's lifetime. The BE scopes both by role: a platform admin sees every bank, anyone else only the bank of its
 * token. Every method resolves to null when bank-service can't answer, so forms fall back to typed codes (the BE
 * validates them anyway).
 */
@Injectable({providedIn: 'root'})
export class BankDirectoryService {
  private readonly api = inject(BankService);
  private bankList: Promise<BankOption[] | null> | null = null;
  private readonly branchLists = new Map<string, Promise<BranchOption[] | null>>();

  /** Banks visible to the caller, by code; the platform pseudo bank is never listed. */
  banks(): Promise<BankOption[] | null> {
    this.bankList ??= firstValueFrom(this.api.getBanks())
      .then(banks => (banks ?? [])
        .filter(b => b.bankCode && b.bankCode !== PLATFORM_TENANT)
        .map(b => ({code: b.bankCode!, label: b.bankName ? `${b.bankCode} · ${b.bankName}` : b.bankCode!})))
      .catch(() => {
        this.bankList = null; // try again next time
        return null;
      });
    return this.bankList;
  }

  /** Active branches of a bank, by code. */
  branches(bankCode: string): Promise<BranchOption[] | null> {
    let list = this.branchLists.get(bankCode);
    if (!list) {
      list = this.activeBranches(bankCode)
        .then(branches => branches.map(b => ({code: b.branchCode, label: b.branchName ? `${b.branchCode} · ${b.branchName}` : b.branchCode})))
        .catch(() => {
          this.branchLists.delete(bankCode); // try again next time
          return null;
        });
      this.branchLists.set(bankCode, list);
    }
    return list;
  }

  /** Every page of a bank's active branches (100 per page, the BE maximum). */
  private async activeBranches(bankCode: string): Promise<BankBranchDto[]> {
    const all: BankBranchDto[] = [];
    for (let page = 0; page < MAX_PAGES; page++) {
      const result = await firstValueFrom(this.api.getBankBranches(page, PAGE_SIZE, 'branchCode,asc', 'ACTIVE', bankCode));
      all.push(...(result?.content ?? []));
      if (page + 1 >= (result?.page?.totalPages ?? 0)) break;
    }
    return all;
  }
}
