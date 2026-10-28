import {InjectionToken, inject} from '@angular/core';
import {Observable} from 'rxjs';
import {MockPortfolioDataService} from './mock-portfolio-data.service';

export type ValueRange = '1M' | '3M' | '1Y' | 'MAX';

export interface PortfolioSummary {
  total: number;
  cash: number;
  dayPl: number;
  dayPlPct: number;
  ytdPct: number;
  isSample: boolean;
}

export interface ValuePoint {
  date: string; // yyyy-mm-dd
  value: number;
}

export interface Position {
  name: string;
  isin: string;
  assetClass: string;
  qty: number;
  price: number;
  value: number;
  plPct: number;
}

export interface AllocationSlice {
  label: string;
  value: number;
  pct: number;
}

export interface Quote {
  name: string;
  value: number;
  changePct: number;
}

/**
 * Portfolio & market data for the dashboards. The BE has no portfolio/market services yet, so the default
 * implementation is a deterministic mock (`isSample`); swap the provider for a BE-backed one when they exist.
 */
export interface PortfolioDataSource {
  readonly isSample: boolean;
  getSummary(customerId: string): Observable<PortfolioSummary>;
  getValueHistory(customerId: string, range: ValueRange): Observable<ValuePoint[]>;
  getPositions(customerId: string): Observable<Position[]>;
  getAllocation(customerId: string): Observable<AllocationSlice[]>;
  getWatchlist(): Observable<Quote[]>;
}

export const PORTFOLIO_DATA = new InjectionToken<PortfolioDataSource>('PORTFOLIO_DATA', {
  providedIn: 'root',
  factory: () => inject(MockPortfolioDataService)
});
