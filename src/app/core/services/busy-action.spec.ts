import { busyAction } from './busy-action';

describe('busyAction', () => {
  it('is pending only while the action runs', async () => {
    let release!: () => void;
    const action = busyAction(() => new Promise<void>(resolve => (release = resolve)));
    expect(action.pending()).toBeFalse();
    const run = action();
    expect(action.pending()).toBeTrue();
    release();
    await run;
    expect(action.pending()).toBeFalse();
  });

  it('ignores calls while pending (no double submit)', async () => {
    let calls = 0;
    let release!: () => void;
    const action = busyAction(() => { calls++; return new Promise<void>(resolve => (release = resolve)); });
    const first = action();
    await action();
    expect(calls).toBe(1);
    release();
    await first;
    const second = action();
    expect(calls).toBe(2);
    release();
    await second;
  });

  it('passes arguments through', async () => {
    const seen: string[] = [];
    const action = busyAction(async (id: string) => { seen.push(id); });
    await action('c1');
    expect(seen).toEqual(['c1']);
  });

  it('resets and rethrows when the action fails', async () => {
    const action = busyAction(() => Promise.reject(new Error('boom')));
    await expectAsync(action()).toBeRejectedWithError('boom');
    expect(action.pending()).toBeFalse();
  });
});
