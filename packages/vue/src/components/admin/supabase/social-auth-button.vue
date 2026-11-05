<script lang="ts">
import type { SupabaseOAuthProvider } from "@chelone/supabase";

export type { SupabaseOAuthProvider };

/** Props for {@link SocialAuthButton}. */
export interface SocialAuthButtonProps {
  provider: SupabaseOAuthProvider;
  /** Where the provider sends the user back. Defaults to the current URL. */
  redirect?: string;
  disabled?: boolean;
  /** Extra class names applied to the `<button>` element. */
  class?: string;
}
</script>

<script setup lang="ts">
/**
 * `<SocialAuthButton>` — one OAuth sign-in button. A click calls `useLogin()`
 * with the provider and a redirect URL; the Supabase auth provider turns that
 * into `signInWithOAuth`. The default slot is the label. The Vue twin of
 * `@chelone/react`'s `supabase/social-auth-button.tsx`.
 */

import { errorMessageOf } from "@chelone/core";
import { useCheloneNotifications } from "../../../context";
import { useLogin } from "../../../auth/auth-hooks";
import { cn } from "../../../lib/utils";
import Button from "../../ui/button.vue";

const props = defineProps<SocialAuthButtonProps>();

const login = useLogin();
const notifications = useCheloneNotifications();

async function handleClick(): Promise<void> {
  try {
    await login.mutateAsync({
      provider: props.provider,
      redirectTo: props.redirect ?? window.location.toString(),
    });
  } catch (error) {
    // A rejection with nothing is a custom provider declining to start OAuth.
    const message = errorMessageOf(error);
    if (message) {
      notifications?.notify(message, {
        type: "error",
        messageArgs: { _: message },
      });
    }
  }
}
</script>

<template>
  <Button
    type="button"
    variant="outline"
    :class="cn('cursor-pointer', props.class)"
    :disabled="props.disabled || login.isPending.value"
    @click="handleClick"
  >
    <slot />
  </Button>
</template>
