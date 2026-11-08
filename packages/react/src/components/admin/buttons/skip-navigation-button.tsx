/**
 * `<SkipNavigationButton>` — an off-screen button that appears on focus and
 * moves keyboard focus to the page content (`#main-content`), past the menu.
 * Ported from shadmin `buttons/skip-navigation-button.tsx`; the ONE seam
 * (shadmin-core's `useTranslate`) is rewired to `@chelone/react`.
 */

import type { ComponentProps, Ref } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTranslate } from "../../../i18n-hooks";
import { warning } from "../../../util/warning";

interface SkipNavigationButtonProps
  extends Omit<ComponentProps<typeof Button>, "onClick" | "ref"> {
  /** An i18n key (contains a dot) or literal text. Default `chelone.navigation.skip_nav`. */
  label?: string;
  ref?: Ref<HTMLButtonElement>;
}

/**
 * A "skip to content" button, hidden above the viewport until it is focused.
 *
 * @example
 * import { SkipNavigationButton } from "@chelone/react";
 *
 * const CustomLayout = ({ children }) => (
 *   <main id="main-content">
 *     <SkipNavigationButton />
 *     {children}
 *   </main>
 * );
 */
function SkipNavigationButton(props: SkipNavigationButtonProps) {
  const {
    className,
    label = "chelone.navigation.skip_nav",
    ref,
    ...rest
  } = props;
  const translate = useTranslate();

  const handleClick = () => {
    const element = document.getElementById("main-content");
    if (!element) {
      warning(
        true,
        "No element with id 'main-content' found. To use the SkipNavigationButton, make sure your main content element has the id 'main-content'.",
      );
      return;
    }
    // Focus and blur the target so the next Tab lands on the first control in it.
    element.setAttribute("tabindex", "-1");
    element.focus();
    element.blur();
    element.removeAttribute("tabindex");
  };

  return (
    <Button
      type="button"
      {...rest}
      ref={ref}
      onClick={handleClick}
      className={cn(
        "fixed left-4 -top-24 z-5000 transition-all focus:top-4 duration-300 ease-in-out",
        className,
      )}
    >
      {label.includes(".") ? translate(label, { _: "Skip to content" }) : label}
    </Button>
  );
}

export { SkipNavigationButton, type SkipNavigationButtonProps };
