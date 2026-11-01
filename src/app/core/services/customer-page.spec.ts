import {Subject, of, throwError} from 'rxjs';
import {CustomerService, PageCustomerSummaryDTO} from '../../api/customer-service';
import {CustomerPage} from './customer-page';

describe('CustomerPage', () => {
  const result = (id: string, totalElements = 25) => ({content: [{id}], page: {totalElements}}) as PageCustomerSummaryDTO;
  let getCustomers: jasmine.Spy;
  let page: CustomerPage;

  beforeEach(() => {
    getCustomers = jasmine.createSpy().and.returnValue(of(result('c1')));
    page = new CustomerPage({getCustomers} as unknown as CustomerService, 10, ['DRAFT']);
  });

  it('asks for the page that holds the first row, with its filters', async () => {
    await page.load(20, 'ada');
    expect(getCustomers).toHaveBeenCalledWith(2, 10, undefined, 'ada', ['DRAFT']);
    expect(page.rows()).toEqual([{id: 'c1'}]);
    expect(page.total()).toBe(25);
    expect(page.first()).toBe(20);
    expect(page.loading()).toBeFalse();
  });

  it('sends no query when the search is empty', async () => {
    await page.load(0, '');
    expect(getCustomers).toHaveBeenCalledWith(0, 10, undefined, undefined, ['DRAFT']);
  });

  it('reports a failure', async () => {
    getCustomers.and.returnValue(throwError(() => new Error('down')));
    await page.load();
    expect(page.failed()).toBeTrue();
    expect(page.loading()).toBeFalse();
  });

  it('drops a response that a newer load has overtaken', async () => {
    const slow = new Subject<PageCustomerSummaryDTO>();
    getCustomers.and.returnValues(slow, of(result('new')));
    const first = page.load(0, 'a');
    await page.load(0, 'ab');
    slow.next(result('old'));
    slow.complete();
    await first;
    expect(page.rows()).toEqual([{id: 'new'}]);
    expect(page.loading()).toBeFalse();
  });
});
