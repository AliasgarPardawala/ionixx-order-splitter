import { computeExecutionAt } from '../../src/services/executionScheduleService';
import { fixedClock } from '../../src/utils/clock';

describe('computeExecutionAt', () => {
  it('executes immediately when within market hours on a weekday', () => {
    const clock = fixedClock('2026-09-16T15:00:00.000Z'); // Wednesday
    expect(new Date(computeExecutionAt(clock)).toISOString()).toBe('2026-09-16T15:00:00.000Z');
  });

  it('rolls forward to the same day open when before market open', () => {
    const clock = fixedClock('2026-09-16T05:00:00.000Z');
    expect(new Date(computeExecutionAt(clock)).toISOString()).toBe('2026-09-16T13:30:00.000Z');
  });

  it('rolls forward to the next weekday open when after market close', () => {
    const clock = fixedClock('2026-09-16T21:00:00.000Z');
    expect(new Date(computeExecutionAt(clock)).toISOString()).toBe('2026-09-17T13:30:00.000Z');
  });

  it('rolls forward from a weekend to the following Monday open', () => {
    const clock = fixedClock('2026-09-19T12:00:00.000Z'); // Saturday
    expect(new Date(computeExecutionAt(clock)).toISOString()).toBe('2026-09-21T13:30:00.000Z');
  });

  it('executes immediately at the exact market-open instant (inclusive)', () => {
    const clock = fixedClock('2026-09-16T13:30:00.000Z');
    expect(new Date(computeExecutionAt(clock)).toISOString()).toBe('2026-09-16T13:30:00.000Z');
  });

  it('rolls forward at the exact market-close instant (exclusive)', () => {
    const clock = fixedClock('2026-09-16T20:00:00.000Z');
    expect(new Date(computeExecutionAt(clock)).toISOString()).toBe('2026-09-17T13:30:00.000Z');
  });
});
