import {Injectable} from '@angular/core';
import {Observable, of} from 'rxjs';
import type {AllocationSlice, PortfolioDataSource, PortfolioSummary, Position, Quote, ValuePoint, ValueRange} from './portfolio-data';

/** Deterministic PRNG (mulberry32) seeded from a string, so a customer always gets the same sample portfolio. */
export function seededRandom(seed: string): () => number {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let a = h >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const INSTRUMENTS: { name: string; isin: string; assetClass: string; price: number }[] = [
  {name: 'MSCI World UCITS ETF', isin: 'IE00B4L5Y983', assetClass: 'Equities', price: 98.4},
  {name: 'Euro Stoxx 50 UCITS ETF', isin: 'IE0008471009', assetClass: 'Equities', price: 51.2},
  {name: 'Euro Govt Bond 7-10Y ETF', isin: 'IE00B1FZS806', assetClass: 'Bonds', price: 182.6},
  {name: 'Euro Corporate Bond ETF', isin: 'IE00B3F81R35', assetClass: 'Bonds', price: 124.9},
  {name: 'Global Balanced Fund', isin: 'LU0072462426', assetClass: 'Funds', price: 64.3}
];

const DAYS: Record<ValueRange, number> = {'1M': 30, '3M': 91, '1Y': 365, 'MAX': 365 * 3};

const iso = (d: Date) => d.toISOString().slice(0, 10);

/**
 * Sample portfolio data (no BE yet). Values are illustrative only and flagged `isSample`.
 */
@Injectable({providedIn: 'root'})
export class MockPortfolioDataService implements PortfolioDataSource {
  readonly isSample = true;

  getPositions(customerId: string): Observable<Position[]> {
    return of(this.positions(customerId));
  }

  getAllocation(customerId: string): Observable<AllocationSlice[]> {
    const positions = this.positions(customerId);
    const cash = this.cash(customerId);
    // Fixed class order: chart colours follow the asset class, not its size
    const byClass = new Map<string, number>([['Equities', 0], ['Bonds', 0], ['Funds', 0]]);
    for (const p of positions) byClass.set(p.assetClass, (byClass.get(p.assetClass) ?? 0) + p.value);
    byClass.set('Cash', cash);
    const total = [...byClass.values()].reduce((s, v) => s + v, 0);
    return of([...byClass.entries()].map(([label, value]) => ({label, value, pct: (value / total) * 100})));
  }

  getSummary(customerId: string): Observable<PortfolioSummary> {
    const rnd = seededRandom(customerId + ':summary');
    const invested = this.positions(customerId).reduce((s, p) => s + p.value, 0);
    const cash = this.cash(customerId);
    const total = invested + cash;
    const dayPlPct = (rnd() - 0.4) * 1.6;
    return of({
      total, cash, dayPlPct,
      dayPl: (invested * dayPlPct) / 100,
      ytdPct: (rnd() - 0.25) * 14,
      isSample: true
    });
  }

  /** Random walk ending at today's total value. */
  getValueHistory(customerId: string, range: ValueRange): Observable<ValuePoint[]> {
    const rnd = seededRandom(customerId + ':history');
    const days = DAYS[range];
    const end = this.positions(customerId).reduce((s, p) => s + p.value, 0) + this.cash(customerId);
    const steps: number[] = [];
    for (let i = 0; i < DAYS.MAX; i++) steps.push((rnd() - 0.47) * 0.012);
    const relevant = steps.slice(DAYS.MAX - days);
    const points: ValuePoint[] = [];
    let value = end;
    const today = new Date();
    for (let i = 0; i < days; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      points.push({date: iso(d), value: Math.round(value * 100) / 100});
      value = value / (1 + relevant[days - 1 - i]);
    }
    return of(points.reverse());
  }

  getWatchlist(): Observable<Quote[]> {
    const rnd = seededRandom(iso(new Date()));
    const base = [['FTSE MIB', 34450], ['Euro Stoxx 50', 4960], ['S&P 500', 5710], ['MSCI World', 3610], ['EUR/USD', 1.084], ['Gold (USD/oz)', 2384]] as const;
    return of(base.map(([name, value]) => {
      const changePct = (rnd() - 0.45) * 2;
      return {name, value: value * (1 + changePct / 100), changePct};
    }));
  }

  private positions(customerId: string): Position[] {
    const rnd = seededRandom(customerId + ':positions');
    return INSTRUMENTS.map(i => {
      const qty = Math.round((200 + rnd() * 2400) / 10) * 10;
      const price = Math.round(i.price * (0.9 + rnd() * 0.2) * 100) / 100;
      return {...i, qty, price, value: Math.round(qty * price * 100) / 100, plPct: (rnd() - 0.35) * 24};
    }).sort((a, b) => b.value - a.value);
  }

  private cash(customerId: string): number {
    return Math.round((5000 + seededRandom(customerId + ':cash')() * 60000) / 100) * 100;
  }
}
