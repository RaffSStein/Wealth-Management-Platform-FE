import { groupByDay } from './notification-bell.component';
import { AppNotification } from '../../../core/services/notification.service';

describe('groupByDay', () => {
  const now = new Date(2026, 9, 29, 10, 0);
  const at = (id: string, date: Date): AppNotification => ({id, title: id, message: '', timestamp: date, read: false});

  it('splits notifications into Today, Yesterday and Earlier, keeping their order', () => {
    const groups = groupByDay([
      at('a', new Date(2026, 9, 29, 9, 30)),
      at('b', new Date(2026, 9, 29, 0, 5)),
      at('c', new Date(2026, 9, 28, 23, 59)),
      at('d', new Date(2026, 9, 20))
    ], now);
    expect(groups.map(g => [g.label, g.items.map(n => n.id)])).toEqual([
      ['Today', ['a', 'b']],
      ['Yesterday', ['c']],
      ['Earlier', ['d']]
    ]);
  });

  it('skips empty groups', () => {
    expect(groupByDay([at('d', new Date(2026, 9, 1))], now).map(g => g.label)).toEqual(['Earlier']);
    expect(groupByDay([], now)).toEqual([]);
  });
});
