<script lang="ts">
/** Props for {@link ForgotPasswordPage}. */
export interface ForgotPasswordPageProps {
  class?: string;
}
</script>

<script setup lang="ts">
/**
 * `<ForgotPasswordPage>` — the page a user lands on to ask for a password reset
 * email. `<AuthLayout>` around `<ForgotPasswordForm>`; the Vue twin of
 * `@chelone/react`'s `supabase/forgot-password-page.tsx`.
 *
 * It takes no `aside`: compose `<AuthLayout>` with an `#aside` slot and the
 * form for a split screen. A `.vue` component cannot carry a static `path`, so
 * register the route at `forgotPasswordPath` from `@chelone/supabase`.
 */

import type { VNode } from "vue";
import { useTranslate } from "../../../i18n/use-translate";
import AuthLayout from "../auth/auth-layout.vue";
import ForgotPasswordForm from "./forgot-password-form.vue";

const props = defineProps<ForgotPasswordPageProps>();

defineSlots<{
  /** Custom content in place of the default `<ForgotPasswordForm>`. */
  default?: () => VNode[];
}>();

const translate = useTranslate();
</script>

<template>
  <AuthLayout
    :title="
      translate('ra-supabase.reset_password.forgot_password', {
        _: 'Forgot your password?',
      })
    "
    :subtitle="
      translate('ra-supabase.reset_password.forgot_password_details', {
        _: 'Enter your email to receive a link to reset your password.',
      })
    "
    :class="props.class"
  >
    <slot>
      <ForgotPasswordForm />
    </slot>
  </AuthLayout>
</template>
