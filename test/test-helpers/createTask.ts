import type { Clock } from "@sinonjs/fake-timers";


export function createTask<T>(returns: T, delayMs = 100, clock?: Clock): () => Promise<T> {
  if (clock) {
    return () => new Promise<T>(resolve => clock.setTimeout(() => resolve(returns), delayMs));
  }
  else {
    return () => new Promise<T>(resolve => setTimeout(() => resolve(returns), delayMs));
  }
}
