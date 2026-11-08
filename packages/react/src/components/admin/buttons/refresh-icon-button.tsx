/**
 * `<RefreshIconButton>` — a ghost icon button with a tooltip that reloads the
 * current view's data. Ported from shadmin `buttons/refresh-icon-button.tsx`;
 * unlike `<RefreshButton>` it has no loading state.
 */

import { RotateCw } from "lucide-react";
import type { ComponentProps, MouseEvent, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useRefresh } from "../../../compat-hooks";
import { useTranslate } from "../../../i18n-hooks";

const defaultLabel = "chelone.action.refresh";
const defaultIcon = <RotateCw />;

interface RefreshIconButtonProps
  extends Omit<ComponentProps<typeof Button>, "onClick" | "children"> {
  /** A message key, translated with itself as the fallback. */
  label?: string;
  icon?: ReactNode;
  onClick?: (event: MouseEvent<HTMLButtonElement>) => void;
}

/**
 * An icon button that invalidates every query so the active ones refetch.
 *
 * @example
 * import { RefreshIconButton } from "@chelone/react";
 *
 * const MyActions = () => <RefreshIconButton />;
 */
function RefreshIconButton({
  label = defaultLabel,
  icon = defaultIcon,
  onClick,
  ...rest
}: RefreshIconButtonProps) {
  const translate = useTranslate();
  const refresh = useRefresh();
  const text = translate(label, {
    _: label === defaultLabel ? "Refresh" : label,
  });

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    refresh();
    onClick?.(event);
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={text}
          {...rest}
          onClick={handleClick}
        >
          {icon}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{text}</TooltipContent>
    </Tooltip>
  );
}

export { RefreshIconButton, type RefreshIconButtonProps };
