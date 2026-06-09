export function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error(message)), ms);

    promise
      .then(resolve)
      .catch(reject)
      .finally(() => window.clearTimeout(timer));
  });
}
