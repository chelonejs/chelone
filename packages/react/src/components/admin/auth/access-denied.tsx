/**
 * `<AccessDenied>` — full-page error screen shown when the current user lacks
 * permission to access a resource. Ported from shadmin
 * `admin/auth/access-denied.tsx`; the one seam (`shadmin-core`'s `useTranslate`)
 * is rewired to `@chelone/react`'s `useTranslate`.
 *
 * The default screen for the `<Admin.AccessDenied>` slot. Presentation-only:
 * an icon + a translated primary/secondary message pair.
 */

import { Lock } from "lucide-react";
import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useTranslate } from "../../../i18n-hooks";

export interface AccessDeniedProps extends HTMLAttributes<HTMLDivElement> {
  className?: string;
  icon?: ReactNode;
  /** i18n key for the heading. Defaults to `ra.page.access_denied`. */
  textPrimary?: string;
  /** i18n key for the sub-text. Defaults to `ra.message.access_denied`. */
  textSecondary?: string;
}

function AccessDenied({
  icon = <Lock className="size-32" />,
  textPrimary = "ra.page.access_denied",
  textSecondary = "ra.message.access_denied",
  className,
  ...rest
}: AccessDeniedProps) {
  const translate = useTranslate();
  return (
    <div
      className={cn(
        "flex flex-col justify-center items-center h-full",
        className,
      )}
      {...rest}
    >
      <div className="flex flex-col items-center text-center pt-4 pb-4 opacity-50">
        {icon}
        <h5 className="text-secondary-foreground text-2xl mt-3">
          {translate(textPrimary, { _: textPrimary })}
        </h5>
        <p className="text-sm">
          {translate(textSecondary, { _: textSecondary })}
        </p>
      </div>
    </div>
  );
}

export { AccessDenied };
