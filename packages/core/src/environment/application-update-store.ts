import { createMicroStore, type MicroStore } from "../store/micro-store";

export interface ApplicationUpdateSnapshot {
  hasNewVersion: boolean;
}

export interface ApplicationUpdateStoreOptions {
  /** Page to fingerprint. Defaults to `${location.origin}/index.html`, read at each check. */
  url?: string;
  /** Milliseconds between checks. Defaults to one hour. */
  interval?: number;
  /** Read at each check. `cache: "no-store"` always overrides it. */
  fetchOptions?: RequestInit | (() => RequestInit);
  /** Never fetch. Defaults to `false`. */
  disabled?: boolean;
  /** Called once, when the first change is seen. */
  onNewVersionAvailable?: () => void;
}

/** djb2, forced to an unsigned 32-bit integer. */
function hashText(text: string): number {
  let hash = 5381;
  for (let i = 0; i < text.length; i++) {
    hash = ((hash << 5) + hash + text.charCodeAt(i)) >>> 0;
  }
  return hash;
}

/**
 * Polls the deployed page and reports when its body differs from the first
 * one seen, which means a new build is live. Inert until subscribed. The
 * baseline survives detach and re-attach; polling stops for good once a change
 * is seen.
 */
export function createApplicationUpdateStore(
  options: ApplicationUpdateStoreOptions = {},
): MicroStore<ApplicationUpdateSnapshot> {
  const { interval = 3_600_000, disabled = false } = options;
  let baseline: number | undefined;
  /** Bumped on every detach so a check still in flight can tell it was dropped. */
  let attachment = 0;
  let stopPolling: (() => void) | undefined;

  const store = createMicroStore<ApplicationUpdateSnapshot>(
    { hasNewVersion: false },
    {
      onSubscribed() {
        if (disabled || store.getSnapshot().hasNewVersion) return;
        const current = ++attachment;
        const timer = setInterval(() => void check(current), interval);
        stopPolling = () => clearInterval(timer);
        void check(current);
        return () => {
          attachment++;
          stopPolling?.();
          stopPolling = undefined;
        };
      },
    },
  );

  async function check(current: number): Promise<void> {
    const url =
      options.url ??
      (typeof location === "undefined"
        ? undefined
        : `${location.origin}/index.html`);
    if (url === undefined) return;
    const { fetchOptions } = options;
    let text: string;
    try {
      const init =
        typeof fetchOptions === "function" ? fetchOptions() : fetchOptions;
      const response = await fetch(url, { ...init, cache: "no-store" });
      if (!response.ok) return;
      text = await response.text();
    } catch {
      return;
    }
    if (current !== attachment || store.getSnapshot().hasNewVersion) return;
    const hash = hashText(text);
    if (baseline === undefined) {
      baseline = hash;
      return;
    }
    if (hash === baseline) return;
    stopPolling?.();
    stopPolling = undefined;
    store.setState({ hasNewVersion: true });
    options.onNewVersionAvailable?.();
  }

  return store;
}
