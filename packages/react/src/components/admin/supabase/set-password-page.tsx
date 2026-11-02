/**
 * `<SetPasswordPage>` — where a Supabase recovery or invite link ends. It
 * frames `<SetPasswordForm>` in `<AuthLayout>`; ported from shadmin
 * `supabase/set-password-page.tsx`.
 *
 * It takes no `aside`: compose `<AuthLayout aside={...}>` and the form for a
 * split screen. Register it as a route at `SetPasswordPage.path`.
 */

import { setPasswordPath } from "@chelone/supabase";
import type { HTMLAttributes, ReactNode } from "react";
import { AuthLayout } from "@/components/admin/auth/auth-layout";
import { useTranslate } from "../../../i18n-hooks";
import { SetPasswordForm } from "./set-password-form";

export interface SetPasswordPageProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  /** Custom content in place of the default `<SetPasswordForm>`. */
  children?: ReactNode;
}

function SetPasswordPage({ children, ...rest }: SetPasswordPageProps) {
  const translate = useTranslate();
  return (
    <AuthLayout
      title={translate("ra-supabase.set_password.new_password", {
        _: "Choose your password",
      })}
      {...rest}
    >
      {children ?? <SetPasswordForm />}
    </AuthLayout>
  );
}

SetPasswordPage.path = setPasswordPath;

export { SetPasswordPage };
