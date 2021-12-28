import { clock } from "../integration/tests.js";

export function createTask<T>(returns: T, delayMs = 100, useMockedClock = false): () => Promise<T> {
  if (useMockedClock) {
    return async() => await new Promise<T>(resolve => clock.setTimeout(() => resolve(returns), delayMs));
  }
  else {
    return async() => await new Promise<T>(resolve => setTimeout(() => resolve(returns), delayMs));
  }
}
