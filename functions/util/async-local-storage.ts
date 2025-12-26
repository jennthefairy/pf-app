type Store = unknown;

// Minimal AsyncLocalStorage polyfill (mirrors @better-auth/core's "pure" implementation).
// It is intended for runtimes without node:async_hooks (e.g., Cloudflare Workers).
class AsyncLocalStoragePolyfill<T = Store> {
  #current: T | undefined;

  run<R>(store: T, fn: () => R): R {
    const prev = this.#current;
    this.#current = store;
    const result = fn();
    if (result instanceof Promise) {
      return result.finally(() => {
        this.#current = prev;
      }) as unknown as R;
    }
    this.#current = prev;
    return result;
  }

  getStore(): T | undefined {
    return this.#current;
  }
}

export function ensureAsyncLocalStorage(): void {
  const globalAny = globalThis as any;
  if (globalAny.AsyncLocalStorage) return;
  globalAny.AsyncLocalStorage = AsyncLocalStoragePolyfill;
}
