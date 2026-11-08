/**
 * `<Offline>` — tells the user the browser has lost its connection. Ported
 * from shadmin `feedback/offline.tsx`; ra-core's `useIsOffline` is rewired to
 * the compat hook and `<Translate>` to `translate(key, { _: fallback })`.
 */

import { WifiOff } from "lucide-react";
import type { ComponentProps } from "react";
import { useIsOffline } from "../../../compat-hooks";
import { useTranslate } from "../../../i18n-hooks";

/**
 * Renders nothing while online. Offline, it renders `children` in a `div`, or
 * a fixed top banner when there are none. Not mounted by `<Layout>`: place it
 * where the app wants the warning.
 *
 * @example
 * import { Offline } from "@chelone/react";
 *
 * const App = () => (
 *   <>
 *     <Offline />
 *     <Admin dataProvider={dp} />
 *   </>
 * );
 */
function Offline({ children, className, ...rest }: OfflineProps) {
  const isOffline = useIsOffline();
  const translate = useTranslate();
  if (!isOffline) return null;
  if (children) {
    return (
      <div className={className} {...rest}>
        {children}
      </div>
    );
  }
  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed top-0 inset-x-0 z-50 bg-destructive text-white px-4 py-2 flex items-center justify-center gap-2 text-sm${className ? ` ${className}` : ""}`}
      {...rest}
    >
      <WifiOff className="size-4" />
      {translate("chelone.notification.offline", { _: "You are offline" })}
    </div>
  );
}

type OfflineProps = ComponentProps<"div">;

export { Offline, type OfflineProps };
