/**
 * `<AuthError>` — the auth-failure screen. Ported from shadmin
 * `admin/auth/auth-error.tsx`; the seams (`shadmin-core`'s `useTranslate` +
 * `<Translate>` and react-router's `<Link>`) are rewired to `@chelone/react`
 * (`useTranslate` + the router adapter's `Link`).
 *
 * Used as the fallback rendered by `<AuthCallback>` when an OAuth callback
 * errors, and composable as a standalone auth-error page. Links back to
 * `/login`.
 *
 * Chelone divergence: shadmin renders the heading via the `<Translate>`
 * component; chelone has no such component, so the heading is resolved through
 * `useTranslate`. The `<Link>` comes from `useRouterAdapter().Link` (the
 * framework-swappable routing seam), not react-router directly.
 */

import { DEFAULT_LOGIN_PATH } from "@chelone/core";
import { CircleAlert, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTranslate } from "../../../i18n-hooks";
import { useRouterAdapter } from "../../../router/adapter";

export interface AuthErrorProps {
  className?: string;
  /** i18n key for the heading. Defaults to `chelone.page.error`. */
  title?: string;
  /** i18n key (or raw message) for the body. Defaults to `chelone.message.auth_error`. */
  message?: string;
}

function AuthError(props: AuthErrorProps) {
  const {
    className,
    title = "chelone.page.error",
    message = "chelone.message.auth_error",
    ...rest
  } = props;

  const translate = useTranslate();
  const { Link } = useRouterAdapter();
  return (
    <div
      className={cn(
        "flex flex-col justify-center items-center h-full",
        className,
      )}
      {...rest}
    >
      <h1 className="flex items-center text-3xl my-5 gap-3" role="alert">
        <CircleAlert className="w-[2em] h-[2em]" />
        {translate(title, { _: title })}
      </h1>
      <p className="my-5">{translate(message, { _: message })}</p>
      <Button asChild>
        <Link to={DEFAULT_LOGIN_PATH}>
          <Lock /> {translate("chelone.auth.sign_in", { _: "Sign in" })}
        </Link>
      </Button>
    </div>
  );
}

export { AuthError };
