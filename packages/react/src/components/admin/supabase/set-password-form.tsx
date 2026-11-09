/**
 * `<SetPasswordForm>` — finishes a Supabase password reset or invite. It reads
 * the access and refresh tokens from the emailed link and submits them with the
 * new password.
 *
 * Ported from shadmin `supabase/set-password-form.tsx`. Divergence: with a
 * token missing, shadmin redirected to `/` and the message flashed; here the
 * message stays on screen with a Back to login link and no redirect.
 */

import { DEFAULT_LOGIN_PATH, errorMessageOf, required } from "@chelone/core";
import { useCallback } from "react";
import { PasswordInput } from "@/components/admin/inputs/password-input";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { CheloneFormProvider } from "../../../form-context";
import { useForm } from "../../../form-hooks";
import { useTranslate } from "../../../i18n-hooks";
import { useNotify } from "../../../notification-hooks";
import { useRouterAdapter } from "../../../router/adapter";
import { useSetPassword, useSupabaseUrlTokens } from "./use-password-recovery";

export interface SetPasswordFormProps {
  /** Extra class names applied to the `<form>` element. */
  className?: string;
}

interface SetPasswordValues {
  password: string;
  confirmPassword: string;
}

// Form level, so editing either field re-checks both and clears a stale error.
const validateMatch = (values: SetPasswordValues) =>
  values.password === values.confirmPassword
    ? undefined
    : Object.fromEntries(
        (["password", "confirmPassword"] as const).map((source) => [
          source,
          {
            message: "ra-supabase.validation.password_mismatch",
            args: { _: "Passwords do not match" },
          },
        ]),
      );

function SetPasswordForm({ className }: SetPasswordFormProps) {
  const { accessToken, refreshToken } = useSupabaseUrlTokens();
  const setPassword = useSetPassword();
  const notify = useNotify();
  const translate = useTranslate();
  const { Link } = useRouterAdapter();

  const save = useCallback(
    async (values: SetPasswordValues) => {
      if (!accessToken || !refreshToken) return undefined;
      try {
        await setPassword.mutateAsync({
          access_token: accessToken,
          refresh_token: refreshToken,
          password: values.password,
        });
      } catch (error) {
        const message = errorMessageOf(error);
        notify(message ?? "chelone.notification.http_error_label", {
          type: "warning",
          messageArgs: message === undefined ? undefined : { _: message },
        });
      }
      return undefined;
    },
    [accessToken, refreshToken, setPassword, notify],
  );

  const { form, submit, isSubmitting } = useForm<SetPasswordValues>({
    defaultValues: { password: "", confirmPassword: "" },
    validate: validateMatch,
    save,
    resetOnSuccess: false,
  });

  const handleSubmit = useCallback(
    (event: React.FormEvent) => {
      event.preventDefault();
      void submit();
    },
    [submit],
  );

  const backToLogin = (
    <Link
      to={DEFAULT_LOGIN_PATH}
      className="text-center text-sm text-muted-foreground underline underline-offset-4 hover:text-primary"
    >
      {translate("ra-supabase.auth.back_to_login", { _: "Back to login" })}
    </Link>
  );

  if (!accessToken || !refreshToken) {
    return (
      <div className={cn("flex flex-col gap-8", className)}>
        <p role="alert" className="text-center text-sm">
          {translate("ra-supabase.auth.missing_tokens", {
            _: "Access and refresh tokens are missing from the link",
          })}
        </p>
        {backToLogin}
      </div>
    );
  }

  return (
    <CheloneFormProvider form={form} submit={submit}>
      <form
        className={cn("flex flex-col gap-8", className)}
        onSubmit={handleSubmit}
        noValidate
      >
        <PasswordInput<SetPasswordValues>
          label={translate("chelone.auth.password", { _: "Password" })}
          source="password"
          autoComplete="new-password"
          autoFocus
          validate={required()}
        />
        <PasswordInput<SetPasswordValues>
          label={translate("ra-supabase.auth.confirm_password", {
            _: "Confirm password",
          })}
          source="confirmPassword"
          autoComplete="new-password"
          validate={required()}
        />
        <Button
          type="submit"
          className="cursor-pointer"
          disabled={isSubmitting}
        >
          {isSubmitting ? <Spinner /> : null}
          {translate("chelone.action.save", { _: "Save" })}
        </Button>
      </form>
    </CheloneFormProvider>
  );
}

export { SetPasswordForm };
