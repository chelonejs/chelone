/**
 * `<ForgotPasswordForm>` — asks for the email a Supabase password reset is sent
 * to. Ported from shadmin `supabase/forgot-password-form.tsx`; built like
 * `<LoginForm>` (`useForm` + `CheloneFormProvider`).
 *
 * A rejection from `resetPassword` becomes a warning notification carrying its
 * message, because the form `save` contract must resolve for provider errors.
 */

import { DEFAULT_LOGIN_PATH, errorMessageOf, required } from "@chelone/core";
import { useCallback } from "react";
import { TextInput } from "@/components/admin/inputs/text-input";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { CheloneFormProvider } from "../../../form-context";
import { useForm } from "../../../form-hooks";
import { useTranslate } from "../../../i18n-hooks";
import { useNotify } from "../../../notification-hooks";
import { useRouterAdapter } from "../../../router/adapter";
import { useResetPassword } from "./use-password-recovery";

export interface ForgotPasswordFormProps {
  /** Extra class names applied to the `<form>` element. */
  className?: string;
}

interface ForgotPasswordValues {
  email: string;
}

function ForgotPasswordForm({ className }: ForgotPasswordFormProps) {
  const resetPassword = useResetPassword();
  const notify = useNotify();
  const translate = useTranslate();
  const { Link } = useRouterAdapter();

  const save = useCallback(
    async (values: ForgotPasswordValues) => {
      try {
        await resetPassword.mutateAsync({ email: values.email });
      } catch (error) {
        const message = errorMessageOf(error);
        notify(message ?? "chelone.notification.http_error_label", {
          type: "warning",
          messageArgs: message === undefined ? undefined : { _: message },
        });
      }
      return undefined;
    },
    [resetPassword, notify],
  );

  const { form, submit, isSubmitting } = useForm<ForgotPasswordValues>({
    defaultValues: { email: "" },
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

  return (
    <CheloneFormProvider form={form} submit={submit}>
      <form
        className={cn("flex flex-col gap-8", className)}
        onSubmit={handleSubmit}
        noValidate
      >
        <TextInput
          label={translate("ra-supabase.auth.email", { _: "Email" })}
          source="email"
          type="email"
          autoComplete="email"
          autoFocus
          validate={required()}
        />
        <Button
          type="submit"
          className="cursor-pointer"
          disabled={isSubmitting}
        >
          {isSubmitting ? <Spinner /> : null}
          {translate("ra-supabase.auth.reset_password", {
            _: "Reset password",
          })}
        </Button>
        <Link
          to={DEFAULT_LOGIN_PATH}
          className="text-center text-sm text-muted-foreground underline underline-offset-4 hover:text-primary"
        >
          {translate("ra-supabase.auth.back_to_login", {
            _: "Back to login",
          })}
        </Link>
      </form>
    </CheloneFormProvider>
  );
}

export { ForgotPasswordForm };
