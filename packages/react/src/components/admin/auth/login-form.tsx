/**
 * `<LoginForm>` — the email + password sign-in form used by `<LoginPage>` and
 * composable inside any custom auth layout. Ported from shadmin
 * `admin/auth/login-form.tsx`.
 *
 * Chelone divergences (the RHF → chelone-form rewrite):
 * - shadmin's `<Form onSubmit>` (react-hook-form) is replaced by chelone's
 *   `useForm({ save })` (a resource-less form controller) wrapped in a
 *   `CheloneFormProvider`, so the bare `<TextInput>` children bind to it.
 * - shadmin's imperative `useLogin()` (a promise-returning fn) is chelone's
 *   `useLogin()` (a `useMutation`); the form `save` handler calls
 *   `login.mutateAsync(values)`.
 * - The submit `save` contract must NOT reject for provider errors, so the
 *   login rejection is caught here and surfaced via `useNotify()` — the
 *   `notifyAuthError` inline (chelone has no `notify-auth-error` lib; the
 *   notify payload is an i18n key + a raw-message fallback under `_`).
 */

import { errorMessageOf, required } from "@chelone/core";
import { useCallback } from "react";
import { TextInput } from "@/components/admin/inputs/text-input";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { useLogin } from "../../../auth-hooks";
import { CheloneFormProvider } from "../../../form-context";
import { useForm } from "../../../form-hooks";
import { useTranslate } from "../../../i18n-hooks";
import { useNotify } from "../../../notification-hooks";

export interface LoginFormProps {
  /**
   * Path the user is redirected to after a successful sign in. Passed through
   * to `authProvider.login({ ...values, redirectTo })`.
   */
  redirectTo?: string;
  /** Extra class names applied to the `<form>` element. */
  className?: string;
}

/** Credentials the form collects. */
interface LoginValues {
  email: string;
  password: string;
}

function LoginForm(props: LoginFormProps) {
  const { redirectTo, className } = props;
  const login = useLogin();
  const notify = useNotify();
  const translate = useTranslate();

  // The form `save` contract must resolve (never reject) for provider errors —
  // catch the login rejection and surface it via `useNotify`.
  const save = useCallback(
    async (values: LoginValues) => {
      try {
        await login.mutateAsync(
          redirectTo != null ? { ...values, redirectTo } : { ...values },
        );
      } catch (error) {
        const message = errorMessageOf(error);
        notify(message ?? "chelone.auth.sign_in_error", {
          type: "error",
          messageArgs: message === undefined ? undefined : { _: message },
        });
      }
      return undefined;
    },
    [login, notify, redirectTo],
  );

  const { form, submit, isSubmitting } = useForm<LoginValues>({
    defaultValues: { email: "", password: "" },
    save,
    // Standalone auth form: don't rebaseline defaults on success.
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
          label="Email"
          source="email"
          type="email"
          autoComplete="email"
          autoFocus
          validate={required()}
        />
        <TextInput
          label="Password"
          source="password"
          type="password"
          autoComplete="current-password"
          validate={required()}
        />
        <Button
          type="submit"
          className="cursor-pointer"
          disabled={isSubmitting}
        >
          {isSubmitting ? <Spinner /> : null}
          {translate("chelone.auth.sign_in", { _: "Sign in" })}
        </Button>
      </form>
    </CheloneFormProvider>
  );
}

export { LoginForm };
