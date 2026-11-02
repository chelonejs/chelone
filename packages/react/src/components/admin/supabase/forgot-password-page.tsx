/**
 * `<ForgotPasswordPage>` — the page a user lands on to ask for a password reset
 * email. `<AuthLayout>` around `<ForgotPasswordForm>`; ported from shadmin
 * `supabase/forgot-password-page.tsx`.
 *
 * It takes no `aside`: compose `<AuthLayout aside={...}>` and the form for a
 * split screen. Register it as a route at `ForgotPasswordPage.path`.
 */

import { forgotPasswordPath } from "@chelone/supabase";
import type { HTMLAttributes, ReactNode } from "react";
import { AuthLayout } from "@/components/admin/auth/auth-layout";
import { useTranslate } from "../../../i18n-hooks";
import { ForgotPasswordForm } from "./forgot-password-form";

export interface ForgotPasswordPageProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  /** Custom content in place of the default `<ForgotPasswordForm>`. */
  children?: ReactNode;
}

function ForgotPasswordPage({ children, ...rest }: ForgotPasswordPageProps) {
  const translate = useTranslate();
  return (
    <AuthLayout
      title={translate("ra-supabase.reset_password.forgot_password", {
        _: "Forgot your password?",
      })}
      subtitle={translate("ra-supabase.reset_password.forgot_password_details", {
        _: "Enter your email to receive a link to reset your password.",
      })}
      {...rest}
    >
      {children ?? <ForgotPasswordForm />}
    </AuthLayout>
  );
}

ForgotPasswordPage.path = forgotPasswordPath;

export { ForgotPasswordPage };
