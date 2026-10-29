import {inject, Injectable} from '@angular/core';
import {Observable} from 'rxjs';
import {CustomerService, FinancialService, CustomerFinancialDTO, FinancialTypeDTO} from '../../api/customer-service';

export interface FinancialExpenseFormValue {
  /** BE id of a saved row: sent back so a re-save updates it instead of adding a copy. */
  id?: number | null;
  /** Type the saved row had when loaded: the BE ignores type changes on an update. */
  savedTypeName?: string | null;
  financialTypeName: string | null;
  amount: number | null;
  description: string | null;
}

/** Financial type names the step uses for the two fixed amounts; every other row is an expense. */
const INCOME_TYPE = 'SALARY';
const INVESTMENTS_TYPE = 'INVESTMENTS';

/** Saved financials (CustomerDTO.customerFinancials) split back into the step's fields, keeping row ids. */
export interface SavedFinancials {
  annualIncome: number | null;
  incomeId: number | null;
  totalInvestments: number | null;
  investmentsId: number | null;
  expenses: FinancialExpenseFormValue[];
}

export function fromCustomerFinancials(rows: CustomerFinancialDTO[] | null | undefined): SavedFinancials {
  const all = rows ?? [];
  const income = all.find(r => r.financialType?.name === INCOME_TYPE);
  const investments = all.find(r => r.financialType?.name === INVESTMENTS_TYPE);
  return {
    annualIncome: income?.amount ?? null,
    incomeId: income?.id ?? null,
    totalInvestments: investments?.amount ?? null,
    investmentsId: investments?.id ?? null,
    expenses: all
      .filter(r => r !== income && r !== investments)
      .map(r => ({
        id: r.id ?? null,
        savedTypeName: r.financialType?.name ?? null,
        financialTypeName: r.financialType?.name ?? null,
        amount: r.amount ?? null,
        description: r.description ?? null
      }))
  };
}

@Injectable({providedIn: 'root'})
export class FinancialInformationService {
  private readonly customerApi = inject(CustomerService);
  private readonly financialApi = inject(FinancialService);

  getFinancialTypes(): Observable<FinancialTypeDTO[]> {
    return this.financialApi.getAllFinancialTypes();
  }

  buildCustomerFinancialPayload(
    annualIncomeEur: number,
    totalInvestmentsEur: number | null,
    expenses: FinancialExpenseFormValue[],
    ids: {income?: number | null; investments?: number | null} = {}
  ): CustomerFinancialDTO[] {
    const result: CustomerFinancialDTO[] = [];

    // Map annual income as an INCOME record
    result.push({
      ...(ids.income != null ? {id: ids.income} : {}),
      financialType: {
        name: INCOME_TYPE,
        type: 'INCOME',
        description: 'Annual income (EUR)'
      },
      amount: annualIncomeEur
    });

    // Optional investments as an ASSET/INCOME record (label can be refined when backend defines canonical types)
    if (totalInvestmentsEur != null) {
      result.push({
        ...(ids.investments != null ? {id: ids.investments} : {}),
        financialType: {
          name: INVESTMENTS_TYPE,
          type: 'INCOME',
          description: 'Total investments (EUR)'
        },
        amount: totalInvestmentsEur
      });
    }

    // Map each expense row into a record when amount is provided
    for (const e of expenses) {
      if (e.amount == null) continue;
      result.push({
        // A changed type is ignored on update by the BE: send the row as new, the old one gets deleted
        ...(e.id != null && (e.savedTypeName == null || e.savedTypeName === e.financialTypeName) ? {id: e.id} : {}),
        financialType: {
          name: e.financialTypeName || 'OTHER_EXPENSE',
          type: 'EXPENSE',
          description: e.description || undefined
        },
        amount: e.amount,
        description: e.description || undefined
      });
    }

    return result;
  }

  /** Replaces the customer's financials with `payload` (rows left out are deleted by the BE). */
  addCustomerFinancials(customerId: string, payload: CustomerFinancialDTO[]): Observable<void> {
    // We ignore the CustomerDTO body here; the component only needs to know the call succeeded.
    return this.customerApi.addCustomerFinancials(customerId, payload) as unknown as Observable<void>;
  }
}
