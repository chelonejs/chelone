import { Offline } from "@chelone/react";
import { type ReactNode, useEffect } from "react";

/**
 * `<Offline>` reads `navigator.onLine`, which is true for anyone reading these
 * docs. This fires the `offline` event the component listens for while the
 * preview is mounted, and `online` again when it unmounts.
 */
function SimulateOffline({ children }: { children: ReactNode }) {
  useEffect(() => {
    window.dispatchEvent(new Event("offline"));
    return () => {
      window.dispatchEvent(new Event("online"));
    };
  }, []);
  return <>{children}</>;
}

/** `<Offline>` with children renders them in place of the default fixed banner, so the warning sits where the app puts it. */
export default function OfflineDemo() {
  return (
    <SimulateOffline>
      <Offline>
        <div className="rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm">
          No connection. The list is showing cached posts.
        </div>
      </Offline>
    </SimulateOffline>
  );
}
