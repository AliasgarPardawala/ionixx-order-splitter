import { Clock, systemClock } from '../utils/clock';
import { config } from '../config';

function parseHm(hm: string): { hours: number; minutes: number } {
  const [hours, minutes] = hm.split(':').map((n) => Number.parseInt(n, 10));
  return { hours, minutes };
}

function atUtcTime(ts: number, hm: string): number {
  const { hours, minutes } = parseHm(hm);
  const d = new Date(ts);
  d.setUTCHours(hours, minutes, 0, 0);
  return d.getTime();
}

function isWeekday(ts: number): boolean {
  const day = new Date(ts).getUTCDay(); // 0 = Sunday, 6 = Saturday
  return day >= 1 && day <= 5;
}

function addUtcDays(ts: number, days: number): number {
  const d = new Date(ts);
  d.setUTCDate(d.getUTCDate() + days);
  return d.getTime();
}

/**
 * Market-hours-aware execution timestamp, UTC only (no DST, no holiday
 * calendar — a documented simplification). If `now` falls on Mon-Fri within
 * [marketOpenUtc, marketCloseUtc), executes immediately; otherwise rolls
 * forward to the next Mon-Fri's market-open time.
 */
export function computeExecutionAt(clock: Clock = systemClock): number {
  const now = clock.now();
  const open = atUtcTime(now, config.marketOpenUtc);
  const close = atUtcTime(now, config.marketCloseUtc);

  if (isWeekday(now) && now >= open && now < close) {
    return now;
  }

  let candidate = isWeekday(now) && now < open ? now : addUtcDays(now, 1);
  while (!isWeekday(candidate)) {
    candidate = addUtcDays(candidate, 1);
  }

  return atUtcTime(candidate, config.marketOpenUtc);
}
