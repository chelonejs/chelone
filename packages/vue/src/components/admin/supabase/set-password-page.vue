<script lang="ts">
/** Props for {@link SetPasswordPage}. */
export interface SetPasswordPageProps {
  class?: string;
}
</script>

<script setup lang="ts">
/**
 * `<SetPasswordPage>` — where a Supabase recovery or invite link ends. It
 * frames `<SetPasswordForm>` in `<AuthLayout>`; the Vue twin of
 * `@chelone/react`'s `supabase/set-password-page.tsx`.
 *
 * It takes no `aside`: compose `<AuthLayout>` with an `#aside` slot and the
 * form for a split screen. A `.vue` component cannot carry a static `path`, so
 * register the route at `setPasswordPath` from `@chelone/supabase`.
 */

import { useTranslate } from "../../../i18n/use-translate";
import AuthLayout from "../auth/auth-layout.vue";
import SetPasswordForm from "./set-password-form.vue";

const props = defineProps<SetPasswordPageProps>();

defineSlots<{
  /** Custom content in place of the default `<SetPasswordForm>`. */
  default?: () => unknown;
}>();

const translate = useTranslate();
</script>

<template>
  <AuthLayout
    :title="
      translate('ra-supabase.set_password.new_password', {
        _: 'Choose your password',
      })
    "
    :class="props.class"
  >
    <slot>
      <SetPasswordForm />
    </slot>
  </AuthLayout>
</template>
