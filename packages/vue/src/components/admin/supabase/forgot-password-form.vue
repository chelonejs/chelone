<script lang="ts">
/** Props for {@link ForgotPasswordForm}. */
export interface ForgotPasswordFormProps {
  /** Extra class names applied to the `<form>` element. */
  class?: string;
}
</script>

<script setup lang="ts">
/**
 * `<ForgotPasswordForm>` — asks for the email a Supabase password reset is sent
 * to. The Vue twin of `@chelone/react`'s `supabase/forgot-password-form.tsx`,
 * built like `<LoginForm>` (`useForm` with `onSubmit`).
 *
 * A rejection from `resetPassword` becomes a warning notification carrying its
 * message, because the form `onSubmit` contract must resolve for provider
 * errors.
 */

import { DEFAULT_LOGIN_PATH, errorMessageOf, required } from "@chelone/core";
import { RouterLink } from "vue-router";
import { useCheloneNotifications } from "../../../context";
import { useForm } from "../../../form/use-form";
import { useTranslate } from "../../../i18n/use-translate";
import { cn } from "../../../lib/utils";
import Button from "../../ui/button.vue";
import Spinner from "../../ui/spinner.vue";
import TextInput from "../inputs/text-input.vue";
import { useResetPassword } from "./use-password-recovery";

interface ForgotPasswordValues {
  email: string;
}

const props = defineProps<ForgotPasswordFormProps>();

const resetPassword = useResetPassword();
const notifications = useCheloneNotifications();
const translate = useTranslate();

async function save(values: ForgotPasswordValues): Promise<undefined> {
  try {
    await resetPassword.mutateAsync({ email: values.email });
  } catch (error) {
    const message = errorMessageOf(error);
    notifications?.notify(message ?? "chelone.notification.http_error_label", {
      type: "warning",
      messageArgs: message === undefined ? undefined : { _: message },
    });
  }
  return undefined;
}

const { submit, submitting } = useForm<ForgotPasswordValues>({
  record: { email: "" },
  onSubmit: save,
  // Standalone auth form: credentials, not the ambient resource's record.
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
      :label="translate('ra-supabase.auth.email', { _: 'Email' })"
      source="email"
      type="email"
      autocomplete="email"
      autofocus
      :validate="required()"
    />
    <Button type="submit" class="cursor-pointer" :disabled="submitting">
      <Spinner v-if="submitting" />
      {{ translate("ra-supabase.auth.reset_password", { _: "Reset password" }) }}
    </Button>
    <RouterLink
      :to="DEFAULT_LOGIN_PATH"
      class="text-center text-sm text-muted-foreground underline underline-offset-4 hover:text-primary"
    >
      {{ translate("ra-supabase.auth.back_to_login", { _: "Back to login" }) }}
    </RouterLink>
  </form>
</template>
