<script lang="ts">
/** Props for {@link AuthError}. */
export interface AuthErrorProps {
  /** i18n key for the heading. Defaults to `chelone.page.error`. */
  title?: string;
  /** i18n key (or raw message) for the body. Defaults to `chelone.message.auth_error`. */
  message?: string;
  class?: string;
}
</script>

<script setup lang="ts">
/**
 * `<AuthError>` — the auth-failure screen. The Vue twin of `@chelone/react`'s
 * `auth/auth-error.tsx`. Used as the fallback rendered by `<AuthCallback>` when
 * an OAuth callback errors, and composable as a standalone auth-error page.
 * Links back to `/login`.
 *
 * Chelone divergences (shared with the React twin): the heading is resolved
 * through `useTranslate` (no `<Translate>` component). Vue-specific: the "Sign
 * in" link is a vue-router `<RouterLink>` styled with the shadcn
 * `buttonVariants` recipe (the same anchor-as-button idiom the nav buttons use),
 * rather than the React `<Button asChild><Link>`.
 */

import { DEFAULT_LOGIN_PATH } from "@chelone/core";
import { computed } from "vue";
import { RouterLink } from "vue-router";
import { useTranslate } from "../../../i18n/use-translate";
import { cn } from "../../../lib/utils";
import { buttonVariants } from "../../ui/button-variants";
import { CircleAlertIcon, LockIcon } from "./icons";

const props = withDefaults(defineProps<AuthErrorProps>(), {
  title: "chelone.page.error",
  message: "chelone.message.auth_error",
});

const translate = useTranslate();
const linkClasses = computed(() => buttonVariants({ variant: "default" }));
</script>

<template>
  <div
    :class="cn('flex flex-col justify-center items-center h-full', props.class)"
  >
    <h1 class="flex items-center text-3xl my-5 gap-3" role="alert">
      <CircleAlertIcon class="w-[2em] h-[2em]" />
      {{ translate(props.title, { _: props.title }) }}
    </h1>
    <p class="my-5">{{ translate(props.message, { _: props.message }) }}</p>
    <RouterLink :to="DEFAULT_LOGIN_PATH" :class="linkClasses" data-slot="auth-error-signin">
      <LockIcon class="size-4" /> {{ translate("chelone.auth.sign_in", { _: "Sign in" }) }}
    </RouterLink>
  </div>
</template>
