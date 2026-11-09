<script lang="ts">
/** Props for {@link SetPasswordForm}. */
export interface SetPasswordFormProps {
  /** Extra class names applied to the `<form>` element. */
  class?: string;
}
</script>

<script setup lang="ts">
/**
 * `<SetPasswordForm>` — finishes a Supabase password reset or invite. It reads
 * the access and refresh tokens from the emailed link and submits them with the
 * new password. The Vue twin of `@chelone/react`'s
 * `supabase/set-password-form.tsx`, built like `<LoginForm>`.
 *
 * With a token missing, the message stays on screen with a Back to login link
 * and no redirect (shared with the React twin).
 */

import { DEFAULT_LOGIN_PATH, errorMessageOf, required } from "@chelone/core";
import { computed } from "vue";
import { RouterLink } from "vue-router";
import { useCheloneNotifications } from "../../../context";
import { useForm } from "../../../form/use-form";
import { useTranslate } from "../../../i18n/use-translate";
import { cn } from "../../../lib/utils";
import Button from "../../ui/button.vue";
import Spinner from "../../ui/spinner.vue";
import PasswordInput from "../inputs/password-input.vue";
import { useSetPassword, useSupabaseUrlTokens } from "./use-password-recovery";

interface SetPasswordValues {
  password: string;
  confirmPassword: string;
}

// A template cannot pass a type argument, so the input is the same component at
// the form's own values: `source` checks against them, not the registry.
const NewPasswordInput = PasswordInput<SetPasswordValues>;

const props = defineProps<SetPasswordFormProps>();

const { accessToken, refreshToken } = useSupabaseUrlTokens();
const setPassword = useSetPassword();
const notifications = useCheloneNotifications();
const translate = useTranslate();

const hasTokens = computed(() => !!accessToken.value && !!refreshToken.value);

// Form level, so editing either field re-checks both and clears a stale error.
function validateMatch(values: SetPasswordValues) {
  if (values.password === values.confirmPassword) return undefined;
  return Object.fromEntries(
    (["password", "confirmPassword"] as const).map((source) => [
      source,
      {
        message: "ra-supabase.validation.password_mismatch",
        args: { _: "Passwords do not match" },
      },
    ]),
  );
}

async function save(values: SetPasswordValues): Promise<undefined> {
  if (!accessToken.value || !refreshToken.value) return undefined;
  try {
    await setPassword.mutateAsync({
      access_token: accessToken.value,
      refresh_token: refreshToken.value,
      password: values.password,
    });
  } catch (error) {
    const message = errorMessageOf(error);
    notifications?.notify(message ?? "chelone.notification.http_error_label", {
      type: "warning",
      messageArgs: message === undefined ? undefined : { _: message },
    });
  }
  return undefined;
}

const { submit, submitting } = useForm<SetPasswordValues>({
  record: { password: "", confirmPassword: "" },
  validate: validateMatch,
  onSubmit: save,
  // Standalone auth form: credentials, not the ambient resource's record.
  recordForm: false,
  resetOnSuccess: false,
});

function handleSubmit(event: Event): void {
  event.preventDefault();
  void submit();
}

const linkClass =
  "text-center text-sm text-muted-foreground underline underline-offset-4 hover:text-primary";
</script>

<template>
  <div v-if="!hasTokens" :class="cn('flex flex-col gap-8', props.class)">
    <p role="alert" class="text-center text-sm">
      {{
        translate("ra-supabase.auth.missing_tokens", {
          _: "Access and refresh tokens are missing from the link",
        })
      }}
    </p>
    <RouterLink :to="DEFAULT_LOGIN_PATH" :class="linkClass">
      {{ translate("ra-supabase.auth.back_to_login", { _: "Back to login" }) }}
    </RouterLink>
  </div>
  <form
    v-else
    :class="cn('flex flex-col gap-8', props.class)"
    novalidate
    @submit="handleSubmit"
  >
    <NewPasswordInput
      :label="translate('chelone.auth.password', { _: 'Password' })"
      source="password"
      autocomplete="new-password"
      autofocus
      :validate="required()"
    />
    <NewPasswordInput
      :label="
        translate('ra-supabase.auth.confirm_password', {
          _: 'Confirm password',
        })
      "
      source="confirmPassword"
      autocomplete="new-password"
      :validate="required()"
    />
    <Button type="submit" class="cursor-pointer" :disabled="submitting">
      <Spinner v-if="submitting" />
      {{ translate("chelone.action.save", { _: "Save" }) }}
    </Button>
  </form>
</template>
