/**
 * `<TitlePortal>` — the render target for a page `<Title>`, placed in the app
 * bar. Ported from shadmin `layout/title-portal.tsx` (no shadmin-core seam —
 * pure DOM slot). The default `<Layout>` includes it inside `<AppBar>`.
 */

import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { TITLE_PORTAL_ID } from "./title-portal-id";

export type TitlePortalProps = HTMLAttributes<HTMLDivElement>;

/**
 * Reserves the DOM slot where page titles (and breadcrumbs) are teleported.
 *
 * @example
 * import { TitlePortal } from "@chelone/react";
 *
 * const CustomHeader = () => (
 *   <header className="flex items-center px-4 h-12">
 *     <TitlePortal />
 *   </header>
 * );
 */
function TitlePortal({ className, ...rest }: TitlePortalProps) {
  return (
    <div
      id={TITLE_PORTAL_ID}
      className={cn("flex flex-1 items-center min-w-0", className)}
      {...rest}
    />
  );
}

export { TitlePortal };
