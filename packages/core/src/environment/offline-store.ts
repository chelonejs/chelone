import { createMicroStore, type MicroStore } from "../store/micro-store";

export interface OfflineSnapshot {
  isOffline: boolean;
}

const readIsOffline = (): boolean =>
  typeof navigator !== "undefined" && navigator.onLine === false;

/**
 * Whether the browser reports itself offline. Reads `navigator.onLine` rather
 * than assuming online until an event fires, so a page opened offline is
 * offline from the first snapshot. Inert until subscribed: nothing touches
 * `window` before then, so it is safe to build during SSR.
 */
export function createOfflineStore(): MicroStore<OfflineSnapshot> {
  const store = createMicroStore<OfflineSnapshot>(
    { isOffline: readIsOffline() },
    {
      onSubscribed() {
        // The connection may have changed while nothing was listening.
        store.setState({ isOffline: readIsOffline() });
        const goOffline = () => store.setState({ isOffline: true });
        const goOnline = () => store.setState({ isOffline: false });
        window.addEventListener("offline", goOffline);
        window.addEventListener("online", goOnline);
        return () => {
          window.removeEventListener("offline", goOffline);
          window.removeEventListener("online", goOnline);
        };
      },
    },
  );
  return store;
}
