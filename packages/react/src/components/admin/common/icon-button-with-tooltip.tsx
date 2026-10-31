import type { ComponentProps, MouseEvent, ReactNode } from "react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useTranslate } from "../../../i18n-hooks";

type IconButtonWithTooltipProps = Omit<
  ComponentProps<typeof Button>,
  "title"
> & {
  /** Tooltip content. A string is translated and also names the button. */
  label: ReactNode;
};

/**
 * A ghost icon button with a tooltip. A click closes the tooltip first, so it
 * does not stay open over a button that moves.
 *
 * @example
 * import { IconButtonWithTooltip } from "@chelone/react";
 * import { Star } from "lucide-react";
 *
 * const StarButton = () => (
 *   <IconButtonWithTooltip label="Star">
 *     <Star />
 *   </IconButtonWithTooltip>
 * );
 */
function IconButtonWithTooltip({
  label,
  onClick,
  onMouseEnter,
  onMouseLeave,
  children,
  ...props
}: IconButtonWithTooltipProps) {
  const translate = useTranslate();
  const [open, setOpen] = useState(false);
  const translated =
    typeof label === "string" ? translate(label, { _: label }) : label;

  return (
    <Tooltip open={open}>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={
            typeof label === "string" ? String(translated) : undefined
          }
          {...props}
          onClick={(event: MouseEvent<HTMLButtonElement>) => {
            setOpen(false);
            onClick?.(event);
          }}
          onMouseEnter={(event: MouseEvent<HTMLButtonElement>) => {
            setOpen(true);
            onMouseEnter?.(event);
          }}
          onMouseLeave={(event: MouseEvent<HTMLButtonElement>) => {
            setOpen(false);
            onMouseLeave?.(event);
          }}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{translated}</TooltipContent>
    </Tooltip>
  );
}

export { IconButtonWithTooltip, type IconButtonWithTooltipProps };
