<script lang="ts">
import type { FunctionalComponent } from "vue";

/** Props for {@link AuthenticationError}. */
export interface AuthenticationErrorProps {
  /** Override the default warning-triangle glyph. */
  icon?: FunctionalComponent;
  /** i18n key for the heading. Defaults to `chelone.page.authentication_error`. */
  textPrimary?: string;
  /** i18n key for the sub-text. Defaults to `chelone.message.authentication_error_detail`. */
  textSecondary?: string;
  class?: string;
}
</script>

<script setup lang="ts">
/**
 * `<AuthenticationError>` — full-page error screen shown when authentication
 * fails (e.g. an expired session). The Vue twin of `@chelone/react`'s
 * `auth/authentication-error.tsx`; mirrors `<AccessDenied>` with a warning icon
 * and different default keys. The default screen for the
 * `<Admin.AuthenticationError>` slot.
 *
 * Chelone divergence (shared with the React twin): the shadmin original wraps a
 * `<Title>` to set the browser-tab title; that chrome is dropped here — the
 * visible screen is `<AccessDenied>` with the authentication-error defaults.
 */

import { computed } from "vue";
import AccessDenied from "./access-denied.vue";
import { TriangleAlertIcon } from "./icons";

const props = withDefaults(defineProps<AuthenticationErrorProps>(), {
  textPrimary: "chelone.page.authentication_error",
  textSecondary: "chelone.message.authentication_error_detail",
});

const iconComponent = computed(() => props.icon ?? TriangleAlertIcon);
</script>

<template>
  <AccessDenied
    :icon="iconComponent"
    :text-primary="props.textPrimary"
    :text-secondary="props.textSecondary"
    :class="props.class"
  />
</template>
