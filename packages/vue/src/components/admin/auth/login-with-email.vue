<script lang="ts">
/** Credentials the form collects. */
export interface LoginWithEmailValues {
  email: string;
  password: string;
}

/** Props for {@link LoginWithEmail}. */
export interface LoginWithEmailProps {
  /**
   * Called with the credentials instead of `authProvider.login`. A rejection
   * is shown as an error notification. A function prop and not an emit, so the
   * form can await it and catch its rejection.
   */
  onSubmit?: (values: LoginWithEmailValues) => void | Promise<void>;
  /** Disables the button and shows a spinner from outside the form. */
  loading?: boolean;
  /**
   * Path the user is redirected to after a successful sign in. Passed to
   * `authProvider.login`; ignored when `onSubmit` is set.
   */
  redirectTo?: string;
  /** Button text. Defaults to the translated `ra.auth.sign_in`. */
  submitLabel?: string;
  /** Extra class names applied to the `<form>` element. */
  class?: string;
}
</script>

<script setup lang="ts">
/**
 * `<LoginWithEmail>` — an email + password sign-in form that takes an optional
 * `onSubmit`, so a custom backend can sign in without an `authProvider.login`.
 * The Vue twin of `@chelone/react`'s `auth/login-with-email.tsx`; built like
 * `<LoginForm>` (a resource-less `useForm`, errors through the notification
 * store).
 *
 * Chelone divergences:
 * - The spinner also shows while an `onSubmit` handler runs, not only for the
 *   `loading` prop.
 * - The login mutation is built inline rather than with `useLogin()`, so the
 *   form renders with `onSubmit` and no `authProvider`.
 * - The error-to-message rule is a copy of `<LoginForm>`'s, to keep that file
 *   out of the change.
 *
 * @example
 * <LoginWithEmail :on-submit="({ email, password }) => myBackend.signIn(email, password)" />
 */

import { errorMessageOf, required } from "@chelone/core";
import { useMutation } from "@tanstack/vue-query";
import { useCheloneContext, useCheloneNotifications } from "../../../context";
import { useForm } from "../../../form/use-form";
import { useTranslate } from "../../../i18n/use-translate";
import { cn } from "../../../lib/utils";
import Button from "../../ui/button.vue";
import Spinner from "../../ui/spinner.vue";
import PasswordInput from "../inputs/password-input.vue";
import TextInput from "../inputs/text-input.vue";
import { LogInIcon } from "./icons";

const props = withDefaults(defineProps<LoginWithEmailProps>(), {
  loading: false,
});

const { authProvider } = useCheloneContext();
// `useLogin()` throws without an authProvider, which would crash the form for
// a custom backend that signs in through `onSubmit` alone. The same mutation,
// built here, only needs the provider when a submit uses it.
const login = useMutation({
  mutationFn: (params: Record<string, unknown>) => {
    if (!authProvider) {
      throw new Error(
        "LoginWithEmail: pass an onSubmit or an authProvider to <Admin>.",
      );
    }
    return authProvider.login(params);
  },
});
const notifications = useCheloneNotifications();
const translate = useTranslate();

// The form `onSubmit` contract must resolve (never reject) for provider
// errors, so the rejection is caught here and surfaced via the notification
// store.
async function save(values: LoginWithEmailValues): Promise<undefined> {
  try {
    if (props.onSubmit) {
      await props.onSubmit(values);
    } else {
      await login.mutateAsync({ ...values, redirectTo: props.redirectTo });
    }
  } catch (error) {
    const message = errorMessageOf(error);
    notifications?.notify(message ?? "ra.auth.sign_in_error", {
      type: "error",
      messageArgs: message === undefined ? undefined : { _: message },
    });
  }
  return undefined;
}

const { submit, submitting } = useForm<LoginWithEmailValues>({
  record: { email: "", password: "" },
  onSubmit: save,
  // Standalone auth form: credentials, not the ambient resource's record, so
  // no registry schema applies and nothing rebaselines on success.
  recordForm: false,
  resetOnSuccess: false,
});

function handleSubmit(event: Event): void {
  event.preventDefault();
  void submit();
}
</script>

<template>
  <form
    :class="cn('flex flex-col gap-8', props.class)"
    novalidate
    @submit="handleSubmit"
  >
    <TextInput
      label="Email"
      source="email"
      type="email"
      :validate="required()"
    />
    <PasswordInput label="Password" source="password" :validate="required()" />
    <Button
      type="submit"
      class="cursor-pointer"
      :disabled="props.loading || submitting"
    >
      <Spinner v-if="props.loading || submitting" />
      <LogInIcon v-else class="size-4" />
      {{ props.submitLabel ?? translate("ra.auth.sign_in", { _: "Sign in" }) }}
    </Button>
  </form>
</template>
