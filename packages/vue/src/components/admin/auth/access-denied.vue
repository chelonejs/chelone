<script lang="ts">
import type { FunctionalComponent } from "vue";

/** Props for {@link AccessDenied}. */
export interface AccessDeniedProps {
  /** Override the default padlock glyph. */
  icon?: FunctionalComponent;
  /** i18n key for the heading. Defaults to `chelone.page.access_denied`. */
  textPrimary?: string;
  /** i18n key for the sub-text. Defaults to `chelone.message.access_denied_detail`. */
  textSecondary?: string;
  class?: string;
}
</script>

<script setup lang="ts">
/**
 * `<AccessDenied>` — full-page error screen shown when the current user lacks
 * permission to access a resource. The Vue twin of `@chelone/react`'s
 * `auth/access-denied.tsx`; the default screen for the `<Admin.AccessDenied>`
 * slot. Presentation-only: an icon + a translated primary/secondary message
 * pair. The default icon is an inline `<LockIcon>` (Vue carries no icon library);
 * override via the `icon` prop or the `#icon` slot.
 */

import { computed, type VNode } from "vue";
import { useTranslate } from "../../../i18n/use-translate";
import { cn } from "../../../lib/utils";
import { LockIcon } from "./icons";

const props = withDefaults(defineProps<AccessDeniedProps>(), {
  textPrimary: "chelone.page.access_denied",
  textSecondary: "chelone.message.access_denied_detail",
});

defineSlots<{
  /** Override the default padlock glyph. */
  icon?: () => VNode[];
}>();

const translate = useTranslate();
const iconComponent = computed(() => props.icon ?? LockIcon);
</script>

<template>
  <div
    :class="cn('flex flex-col justify-center items-center h-full', props.class)"
  >
    <div
      class="flex flex-col items-center text-center pt-4 pb-4 opacity-50"
    >
      <slot name="icon">
        <component :is="iconComponent" class="size-32" />
      </slot>
      <h5 class="text-secondary-foreground text-2xl mt-3">
        {{ translate(props.textPrimary, { _: props.textPrimary }) }}
      </h5>
      <p class="text-sm">
        {{ translate(props.textSecondary, { _: props.textSecondary }) }}
      </p>
    </div>
  </div>
</template>
