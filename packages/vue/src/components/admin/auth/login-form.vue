<script lang="ts">
/** Props for {@link LoginForm}. */
export interface LoginFormProps {
  /**
   * Path the user is redirected to after a successful sign in. Passed through
   * to `authProvider.login({ ...values, redirectTo })`.
   */
  redirectTo?: string;
  /** Extra class names applied to the `<form>` element. */
  class?: string;
}
</script>

<script setup lang="ts">
/**
 * `<LoginForm>` — the email + password sign-in form used by `<LoginPage>` and
 * composable inside any custom auth layout. The Vue twin of `@chelone/react`'s
 * `auth/login-form.tsx`.
 *
 * Chelone divergences (shared with the React twin — RHF → chelone-form):
 * - The form is a resource-less `useForm({ onSubmit })`; the bare `<TextInput>`
 *   children bind to the form it provides to descendants (no explicit provider).
 * - `useLogin()` is a `useMutation`; the `onSubmit` handler calls
 *   `login.mutateAsync(values)`.
 * - The submit contract must NOT reject for provider errors, so the login
 *   rejection is caught here and surfaced via the notification store (an i18n
 *   key + a raw-message fallback under `_`).
 *
 * Vue-specific divergence: the React twin uses a `useNotify()` composable;
 * `@chelone/vue` reads the notification store directly off the context
 * (`useCheloneNotifications`), the same idiom the delete/bulk buttons use. The
 * store is optional — errors are simply not surfaced when none is configured.
 */

import { errorMessageOf, required } from "@chelone/core";
import { useCheloneNotifications } from "../../../context";
import { useForm } from "../../../form/use-form";
import { useTranslate } from "../../../i18n/use-translate";
import { cn } from "../../../lib/utils";
import { useLogin } from "../../../auth/auth-hooks";
import Button from "../../ui/button.vue";
import Spinner from "../../ui/spinner.vue";
import TextInput from "../inputs/text-input.vue";

interface LoginValues {
  email: string;
  password: string;
}

const props = defineProps<LoginFormProps>();

const login = useLogin();
const notifications = useCheloneNotifications();
const translate = useTranslate();

// The `onSubmit` contract must resolve (never reject) for provider errors —
// catch the login rejection and surface it via the notification store.
async function save(values: LoginValues): Promise<undefined> {
  try {
    await login.mutateAsync(
      props.redirectTo != null
        ? { ...values, redirectTo: props.redirectTo }
        : { ...values },
    );
  } catch (error) {
    const message = errorMessageOf(error);
    notifications?.notify(message ?? "ra.auth.sign_in_error", {
      type: "error",
      messageArgs: message === undefined ? undefined : { _: message },
    });
  }
  return undefined;
}

const { submit, submitting } = useForm<LoginValues>({
  record: { email: "", password: "" },
  // Credentials, not the ambient resource's record: no registry schema applies.
  recordForm: false,
  // A signed-in form has nothing to rebaseline from the credentials it sent.
  resetOnSuccess: false,
  onSubmit: save,
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
    <TextInput
      label="Password"
      source="password"
      type="password"
      :validate="required()"
    />
    <Button type="submit" class="cursor-pointer" :disabled="submitting">
      <Spinner v-if="submitting" />
      {{ translate("ra.auth.sign_in", { _: "Sign in" }) }}
    </Button>
  </form>
</template>
