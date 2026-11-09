/**
 * `<LoginWithEmail>` — an email + password sign-in form that takes an optional
 * `onSubmit`, so a custom backend can sign in without an `authProvider.login`.
 * Ported from shadmin `auth/login-with-email.tsx`; built like `<LoginForm>`
 * (`useForm` + `CheloneFormProvider`, errors through `useNotify()`).
 *
 * Chelone divergences:
 * - The spinner also shows while an `onSubmit` handler runs, not only for the
 *   `loading` prop.
 * - The login mutation is built inline rather than with `useLogin()`, so the
 *   form renders with `onSubmit` and no `authProvider`.
 * - The error-to-message rule is a copy of `<LoginForm>`'s, to keep that file
 *   out of the change.
 */

import { errorMessageOf, required } from "@chelone/core";
import { useMutation } from "@tanstack/react-query";
import { LogIn } from "lucide-react";
import { useCallback } from "react";
import { PasswordInput } from "@/components/admin/inputs/password-input";
import { TextInput } from "@/components/admin/inputs/text-input";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { useCheloneContext } from "../../../context";
import { CheloneFormProvider } from "../../../form-context";
import { useForm } from "../../../form-hooks";
import { useTranslate } from "../../../i18n-hooks";
import { useNotify } from "../../../notification-hooks";

/** Credentials the form collects. */
interface LoginWithEmailValues {
  email: string;
  password: string;
}

interface LoginWithEmailProps {
  /**
   * Called with the credentials instead of `authProvider.login`. A rejection
   * is shown as an error notification.
   */
  onSubmit?: (values: LoginWithEmailValues) => void | Promise<void>;
  /** Disables the button and shows a spinner from outside the form. */
  loading?: boolean;
  /**
   * Path the user is redirected to after a successful sign in. Passed to
   * `authProvider.login`; ignored when `onSubmit` is set.
   */
  redirectTo?: string;
  /** Button text. Defaults to the translated `chelone.auth.sign_in`. */
  submitLabel?: string;
  /** Extra class names applied to the `<form>` element. */
  className?: string;
}

/**
 * @example
 * import { LoginWithEmail } from "@chelone/react";
 *
 * const SignIn = () => (
 *   <LoginWithEmail onSubmit={({ email, password }) => myBackend.signIn(email, password)} />
 * );
 */
function LoginWithEmail(props: LoginWithEmailProps) {
  const {
    onSubmit,
    loading = false,
    redirectTo,
    submitLabel,
    className,
  } = props;
  const { authProvider } = useCheloneContext();
  // `useLogin()` throws without an authProvider, which would crash the form
  // for a custom backend that signs in through `onSubmit` alone. The same
  // mutation, built here, only needs the provider when a submit uses it.
  const login = useMutation({
    mutationFn: (params: Record<string, unknown>) => {
      if (!authProvider) {
        throw new Error(
          "LoginWithEmail: pass an onSubmit or an authProvider to <CheloneProvider>.",
        );
      }
      return authProvider.login(params);
    },
  });
  const notify = useNotify();
  const translate = useTranslate();

  // The form `save` contract must resolve (never reject) for provider errors,
  // so the rejection is caught here and surfaced via `useNotify`.
  const save = useCallback(
    async (values: LoginWithEmailValues) => {
      try {
        if (onSubmit) {
          await onSubmit(values);
        } else {
          await login.mutateAsync({ ...values, redirectTo });
        }
      } catch (error) {
        const message = errorMessageOf(error);
        notify(message ?? "chelone.auth.sign_in_error", {
          type: "error",
          messageArgs: message === undefined ? undefined : { _: message },
        });
      }
      return undefined;
    },
    [onSubmit, login, notify, redirectTo],
  );

  const { form, submit, isSubmitting } = useForm<LoginWithEmailValues>({
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

  const busy = loading || isSubmitting;

  return (
    <CheloneFormProvider form={form} submit={submit}>
      <form
        className={cn("flex flex-col gap-8", className)}
        onSubmit={handleSubmit}
        noValidate
      >
        <TextInput<LoginWithEmailValues>
          label="Email"
          source="email"
          type="email"
          autoComplete="email"
          autoFocus
          validate={required()}
        />
        <PasswordInput<LoginWithEmailValues>
          label="Password"
          source="password"
          autoComplete="current-password"
          validate={required()}
        />
        <Button type="submit" className="cursor-pointer" disabled={busy}>
          {busy ? <Spinner /> : <LogIn />}
          {submitLabel ?? translate("chelone.auth.sign_in", { _: "Sign in" })}
        </Button>
      </form>
    </CheloneFormProvider>
  );
}

export { LoginWithEmail, type LoginWithEmailProps };
