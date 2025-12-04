import {inject, Injectable} from '@angular/core';
import {Observable} from 'rxjs';
import {CustomerService, FinancialService, CustomerFinancialDTO, FinancialTypeDTO} from '../../api/customer-service';

export interface FinancialExpenseFormValue {
  financialTypeName: string | null;
  amount: number | null;
  description: string | null;
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
    expenses: FinancialExpenseFormValue[]
  ): CustomerFinancialDTO[] {
    const result: CustomerFinancialDTO[] = [];

    // Map annual income as an INCOME record
    result.push({
      financialType: {
        name: 'SALARY',
        type: 'INCOME',
        description: 'Annual income (EUR)'
      },
      amount: annualIncomeEur
    });

    // Optional investments as an ASSET/INCOME record (label can be refined when backend defines canonical types)
    if (totalInvestmentsEur != null) {
      result.push({
        financialType: {
          name: 'INVESTMENTS',
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

  addCustomerFinancials(customerId: string, payload: CustomerFinancialDTO[]): Observable<void> {
    // We ignore the CustomerDTO body here; the component only needs to know the call succeeded.
    return this.customerApi.addCustomerFinancials(customerId, payload) as unknown as Observable<void>;
  }
}
