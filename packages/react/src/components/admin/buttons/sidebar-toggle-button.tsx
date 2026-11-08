/**
 * `<SidebarToggleButton>` — a standalone button that opens/closes the sidebar.
 * Ported from shadmin `buttons/sidebar-toggle-button.tsx`; the ONE seam
 * (shadmin-core's `useTranslate`) is rewired to `@chelone/react`. A thin
 * wrapper over the shadcn `<SidebarTrigger>` for use in custom headers.
 */

import type { Ref } from "react";
import { SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useTranslate } from "../../../i18n-hooks";

export interface SidebarToggleButtonProps {
  className?: string;
  ref?: Ref<HTMLButtonElement>;
}

/**
 * A button that opens or closes the main sidebar.
 *
 * @example
 * import { SidebarToggleButton } from "@chelone/react";
 *
 * const CustomHeader = () => (
 *   <header>
 *     <SidebarToggleButton />
 *   </header>
 * );
 */
function SidebarToggleButton(props: SidebarToggleButtonProps) {
  const { className, ref } = props;
  const { open } = useSidebar();
  const translate = useTranslate();
  const tooltipText = open
    ? translate("chelone.action.close_menu", { _: "Close menu" })
    : translate("chelone.action.open_menu", { _: "Open menu" });

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <SidebarTrigger
          className={cn("scale-125 sm:scale-100", className)}
          ref={ref}
        />
      </TooltipTrigger>
      <TooltipContent>{tooltipText}</TooltipContent>
    </Tooltip>
  );
}

export { SidebarToggleButton };
