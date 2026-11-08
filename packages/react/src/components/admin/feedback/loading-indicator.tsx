import { RotateCw } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { useLoading, useRefresh } from "../../../compat-hooks";
import { useTranslate } from "../../../i18n-hooks";
import { IconButtonWithTooltip } from "../common/icon-button-with-tooltip";

interface LoadingIndicatorProps {
  className?: string;
  /** Called after the queries are refreshed. */
  onClick?: () => void;
}

/**
 * A refresh button that shows a spinner over itself while any query or
 * mutation is in flight. The button fades out instead of unmounting, so the
 * layout does not shift. The wrapper is 16px; the larger icon button is centred
 * on it and overflows, so the spinner lands on the icon.
 *
 * @example
 * import { LoadingIndicator } from "@chelone/react";
 *
 * const AppBarActions = () => <LoadingIndicator />;
 */
function LoadingIndicator({ className, onClick }: LoadingIndicatorProps) {
  const loading = useLoading();
  const refresh = useRefresh();
  const translate = useTranslate();

  const handleClick = () => {
    refresh();
    onClick?.();
  };

  return (
    <div className={cn("relative size-4", className)}>
      <IconButtonWithTooltip
        label="chelone.action.refresh"
        onClick={handleClick}
        className={cn(
          "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
          loading && "pointer-events-none opacity-0",
        )}
        tabIndex={loading ? -1 : undefined}
        aria-hidden={loading || undefined}
      >
        <RotateCw />
      </IconButtonWithTooltip>
      {loading && (
        <Spinner
          aria-label={translate("chelone.page.loading", { _: "Loading" })}
          className="absolute inset-0"
        />
      )}
    </div>
  );
}

export { LoadingIndicator, type LoadingIndicatorProps };
