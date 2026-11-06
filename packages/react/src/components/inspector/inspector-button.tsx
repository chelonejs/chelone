/**
 * `<InspectorButton>` — a ghost icon button with a tooltip that turns the
 * inspector's configure mode on and off. Ported from shadmin
 * `buttons/inspector-button.tsx`. It renders nothing where no `<Inspector>` is
 * mounted, so a shared toolbar can hold it in every app.
 */

import { SlidersHorizontal } from "lucide-react";
import type { ComponentProps, MouseEvent, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useTranslate } from "../../i18n-hooks";
import { useInspector } from "./inspector";

const defaultLabel = "chelone.inspector.configure_mode";

interface InspectorButtonProps
  extends Omit<ComponentProps<typeof Button>, "children"> {
  /** A message key, translated with itself as the fallback. */
  label?: string;
  icon?: ReactNode;
}

/**
 * A toggle for configure mode. `onClick` runs first and its `preventDefault`
 * keeps the mode as it is.
 *
 * @example
 * import { InspectorButton } from "@chelone/react/inspector";
 *
 * const MyActions = () => <InspectorButton />;
 */
function InspectorButton({
  label,
  icon = <SlidersHorizontal />,
  onClick,
  ...rest
}: InspectorButtonProps) {
  const translate = useTranslate();
  const inspector = useInspector();
  if (!inspector) return null;

  const text = translate(label ?? defaultLabel, {
    _: label === undefined ? "Configure mode" : label,
  });
  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    onClick?.(event);
    if (!event.defaultPrevented) inspector.toggle();
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
          aria-pressed={inspector.enabled}
          onClick={handleClick}
        >
          {icon}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{text}</TooltipContent>
    </Tooltip>
  );
}

export { InspectorButton, type InspectorButtonProps };
