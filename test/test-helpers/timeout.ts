export function timeout<T>(fnOrPromise: Promise<T> | (() => Promise<T>), ms = 1000): Promise<T> {
  return Promise
    .race([
      typeof fnOrPromise === "function" ? fnOrPromise() : fnOrPromise,
      new Promise<T>((resolve, reject) => setTimeout(() => reject("timeout"), ms).unref())
    ]);
}
