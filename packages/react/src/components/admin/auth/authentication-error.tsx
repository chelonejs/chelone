/**
 * `<AuthenticationError>` — full-page error screen shown when authentication
 * fails (e.g. an expired session). Ported from shadmin
 * `admin/auth/authentication-error.tsx`; mirrors `<AccessDenied>` with a warning
 * icon and different default keys.
 *
 * The default screen for the `<Admin.AuthenticationError>` slot.
 *
 * Chelone divergence: shadmin wraps a `<Title defaultTitle={useDefaultTitle()}>`
 * to set the browser-tab title. Chelone has no `useDefaultTitle` hook, so that
 * chrome is dropped: the visible screen is `<AccessDenied>` with the
 * authentication-error defaults.
 */

import { TriangleAlert } from "lucide-react";
import type { HTMLAttributes, ReactNode } from "react";
import { AccessDenied } from "./access-denied";

export interface AuthenticationErrorProps
  extends HTMLAttributes<HTMLDivElement> {
  className?: string;
  icon?: ReactNode;
  /** i18n key for the heading. Defaults to `chelone.page.authentication_error`. */
  textPrimary?: string;
  /** i18n key for the sub-text. Defaults to `chelone.message.authentication_error_detail`. */
  textSecondary?: string;
}

function AuthenticationError({
  icon = <TriangleAlert className="size-32" />,
  textPrimary = "chelone.page.authentication_error",
  textSecondary = "chelone.message.authentication_error_detail",
  ...rest
}: AuthenticationErrorProps) {
  return (
    <AccessDenied
      icon={icon}
      textPrimary={textPrimary}
      textSecondary={textSecondary}
      {...rest}
    />
  );
}

export { AuthenticationError };
