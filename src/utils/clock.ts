/** Injectable "now" provider so tests can use a fixed timestamp instead of the system clock. */
export interface Clock {
  now(): number; // epoch millis
}

export const systemClock: Clock = {
  now: () => Date.now(),
};

export function fixedClock(at: number | string | Date): Clock {
  const ts = typeof at === 'number' ? at : new Date(at).getTime();
  return { now: () => ts };
}
