/**
 * `<Title>` — teleports a page title into the `<TitlePortal>` slot in the app
 * bar. Ported from shadmin `layout/title.tsx`; the ONE seam (shadmin-core's
 * `useTranslate`) is rewired to `@chelone/react`, and `TITLE_PORTAL_ID` resolves
 * to the layout-local `./title-portal-id` (not shadmin's `@/lib/*`).
 *
 * Mirrors the react-admin `<Title>` API so views declare their own page title
 * without knowing where it lives in the DOM. Strings are translated (via the
 * `_` fallback); React elements render as-is.
 */

import { type ReactElement, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { useTranslate } from "../../../i18n-hooks";
import { TITLE_PORTAL_ID } from "./title-portal-id";

interface TitleProps {
  /**
   * The title to display. If a string, it is translated using the i18n
   * provider. Pass a React element to render a custom title.
   */
  title?: string | ReactElement;
  /**
   * Fallback title used when `title` is undefined. Translated if a string.
   */
  defaultTitle?: string | ReactElement;
  /**
   * Optional CSS class applied to the rendered title element.
   */
  className?: string;
}

/**
 * Renders a page title inside the `<TitlePortal>` slot in the app bar.
 *
 * @example
 * import { Title } from "@chelone/react";
 *
 * const Dashboard = () => (
 *   <>
 *     <Title title="Dashboard" />
 *     <div>Welcome!</div>
 *   </>
 * );
 */
function Title({ title, defaultTitle, className }: TitleProps) {
  const translate = useTranslate();
  const [target, setTarget] = useState<HTMLElement | null>(() =>
    typeof document !== "undefined"
      ? document.getElementById(TITLE_PORTAL_ID)
      : null,
  );

  useEffect(() => {
    setTarget((current) => {
      const isInTheDom =
        typeof document !== "undefined" &&
        current !== null &&
        document.body.contains(current);
      if (current && isInTheDom) return current;
      return typeof document !== "undefined"
        ? document.getElementById(TITLE_PORTAL_ID)
        : null;
    });
  }, []);

  if (!target) return null;

  const value = title ?? defaultTitle ?? "";
  const node =
    typeof value === "string" ? (
      <h1 className={cn("text-lg font-semibold truncate", className)}>
        {value ? translate(value, { _: value }) : ""}
      </h1>
    ) : (
      value
    );

  return createPortal(node, target);
}

export { Title, type TitleProps };
