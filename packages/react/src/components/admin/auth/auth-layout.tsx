/**
 * `<AuthLayout>` — page shell for custom authentication flows (login, signup,
 * password reset). Ported verbatim from shadmin `admin/auth/auth-layout.tsx`;
 * the ONE seam is the `<Notification>` import, which now resolves to
 * `@chelone/react`'s notification component (sonner over the chelone store).
 *
 * Renders a centered single-column form by default; pass an `aside` to opt into
 * a two-column layout with brand/marketing content on the left. Mounts
 * `<Notification>` at the root because it renders OUTSIDE the main `<Layout>` —
 * without it, `useNotify()` errors from a login form would have no sink.
 */

import type { HTMLAttributes, ReactNode } from "react";
import { Notification } from "@/components/admin/feedback/notification";
import { cn } from "@/lib/utils";

export interface AuthLayoutProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  /** Main-pane content — typically a login / signup / password-reset form. */
  children: ReactNode;
  /** Heading shown above the main-pane content. */
  title?: ReactNode;
  /** Subtitle shown below the heading. */
  subtitle?: ReactNode;
  /**
   * Left-pane content (e.g. brand logo + testimonial). When omitted, the
   * layout renders the main pane full-width.
   */
  aside?: ReactNode;
  className?: string;
}

function AuthLayout(props: AuthLayoutProps) {
  const { children, title, subtitle, aside, className, ...rest } = props;
  const hasAside = aside != null;
  return (
    <div className={cn("min-h-screen flex", className)} {...rest}>
      <div
        className={cn(
          "container relative grid flex-col items-center justify-center sm:max-w-none lg:px-0",
          hasAside && "lg:grid-cols-2",
        )}
      >
        {hasAside && (
          <div className="relative hidden h-full flex-col bg-zinc-900 p-10 text-white dark:border-r lg:flex">
            {aside}
          </div>
        )}
        <div className="lg:p-8">
          <div className="mx-auto flex w-full flex-col justify-center gap-y-6 sm:w-87.5">
            {(title || subtitle) && (
              <div className="flex flex-col gap-y-2 text-center">
                {title && (
                  <h1 className="text-2xl font-semibold tracking-tight">
                    {title}
                  </h1>
                )}
                {subtitle && (
                  <p className="text-sm leading-normal text-muted-foreground">
                    {subtitle}
                  </p>
                )}
              </div>
            )}
            {children}
          </div>
        </div>
      </div>
      <Notification />
    </div>
  );
}

export { AuthLayout };
