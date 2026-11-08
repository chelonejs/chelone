/**
 * `<ThemeModeToggle>` — switch between light / dark / system modes. Ported from
 * shadmin `layout/theme-mode-toggle.tsx`; the seams (shadmin-core's
 * `useTranslate` + the shadmin `useTheme`) are rewired to `@chelone/react`'s
 * i18n hook + the local store-backed `useTheme`.
 */

import { Check, Moon, Sun } from "lucide-react";
import type { Ref } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useTranslate } from "../../../i18n-hooks";
import { useTheme } from "./use-theme";

export interface ThemeModeToggleProps {
  ref?: Ref<HTMLButtonElement>;
}

/**
 * Toggle button that lets users switch between light, dark, and system UI
 * themes. The selection is persisted via the store (see `<ThemeProvider>`).
 * Automatically included in the default `<Layout>` header.
 */
function ThemeModeToggle({ ref }: ThemeModeToggleProps = {}) {
  const [theme, setTheme] = useTheme();
  const translate = useTranslate();

  return (
    <DropdownMenu data-theme-mode-toggle modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="hidden sm:inline-flex relative"
          ref={ref}
        >
          <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">
            {translate("chelone.action.toggle_theme", { _: "Toggle theme" })}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme("light")}>
          {translate("chelone.theme.light", { _: "Light" })}
          <Check className={cn("ml-auto", theme !== "light" && "hidden")} />
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")}>
          {translate("chelone.theme.dark", { _: "Dark" })}
          <Check className={cn("ml-auto", theme !== "dark" && "hidden")} />
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("system")}>
          {translate("chelone.theme.system", { _: "System" })}
          <Check className={cn("ml-auto", theme !== "system" && "hidden")} />
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export { ThemeModeToggle };
