/**
 * `<RefreshButton>` — reloads the current view's data. Ported from shadmin
 * `buttons/refresh-button.tsx`; the seam is unchanged — chelone already exports
 * `useRefresh` (invalidate-all → active queries refetch) and `useLoading`
 * (global fetching/mutating flag) from `compat-hooks`, so this is a mechanical
 * import repoint. Labels flow through `translate(key, { _: fallback })`.
 */

import { RotateCw } from "lucide-react";
import type { ReactNode, Ref } from "react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useLoading, useRefresh } from "../../../compat-hooks";
import { useTranslate } from "../../../i18n-hooks";

const defaultIcon = <RotateCw />;

interface RefreshButtonProps {
  ref?: Ref<HTMLButtonElement>;
  label?: ReactNode;
  icon?: ReactNode;
  onClick?: () => void;
}

/**
 * A button that refreshes the current view's data.
 *
 * When clicked, invalidates every query so the active ones refetch. Shows a
 * spinner while any query or mutation is in flight.
 *
 * @example
 * import { RefreshButton } from "@chelone/react";
 *
 * const MyActions = () => <RefreshButton />;
 */
function RefreshButton({
  ref,
  label,
  icon = defaultIcon,
  onClick,
}: RefreshButtonProps = {}) {
  const refresh = useRefresh();
  const loading = useLoading();
  const translate = useTranslate();

  const handleRefresh = () => {
    refresh();
    if (onClick) {
      onClick();
    }
  };

  const defaultLabel = translate("chelone.action.refresh", { _: "Refresh" });
  const ariaLabel = label != null ? String(label) : defaultLabel;

  return (
    <Button
      ref={ref}
      onClick={handleRefresh}
      variant="ghost"
      size="icon"
      className="hidden sm:inline-flex"
      aria-label={ariaLabel}
      disabled={loading}
    >
      {loading ? <Spinner /> : icon}
    </Button>
  );
}

export { RefreshButton, type RefreshButtonProps };
