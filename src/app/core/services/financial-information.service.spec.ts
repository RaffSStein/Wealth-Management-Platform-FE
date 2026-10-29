import { TestBed } from '@angular/core/testing';
import { CustomerService, FinancialService } from '../../api/customer-service';
import { FinancialInformationService, fromCustomerFinancials } from './financial-information.service';

describe('financial information mapping', () => {
  const saved = [
    { id: 1, financialType: { name: 'SALARY', type: 'INCOME' }, amount: 60000 },
    { id: 2, financialType: { name: 'INVESTMENTS', type: 'INCOME' }, amount: 15000 },
    { id: 3, financialType: { name: 'RENT', type: 'EXPENSE' }, amount: 9000, description: 'Flat' }
  ];

  it('splits saved financials into the step fields, keeping row ids', () => {
    expect(fromCustomerFinancials(saved)).toEqual({
      annualIncome: 60000,
      incomeId: 1,
      totalInvestments: 15000,
      investmentsId: 2,
      expenses: [{ id: 3, financialTypeName: 'RENT', amount: 9000, description: 'Flat' }]
    });
  });

  it('returns empty fields when nothing is saved', () => {
    expect(fromCustomerFinancials(undefined)).toEqual({
      annualIncome: null, incomeId: null, totalInvestments: null, investmentsId: null, expenses: []
    });
  });

  it('sends ids back for saved rows and none for new rows', () => {
    TestBed.configureTestingModule({
      providers: [{ provide: CustomerService, useValue: {} }, { provide: FinancialService, useValue: {} }]
    });
    const service = TestBed.inject(FinancialInformationService);
    const payload = service.buildCustomerFinancialPayload(60000, 15000, [
      { id: 3, financialTypeName: 'RENT', amount: 9500, description: 'Flat' },
      { financialTypeName: 'LOAN', amount: 2000, description: null }
    ], { income: 1, investments: 2 });
    expect(payload.map(p => p.id)).toEqual([1, 2, 3, undefined]);
  });
});
