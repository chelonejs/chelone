<script lang="ts">
/** Props for {@link AuthLayout}. */
export interface AuthLayoutProps {
  /** Heading shown above the main-pane content. */
  title?: string;
  /** Subtitle shown below the heading. */
  subtitle?: string;
  class?: string;
}
</script>

<script setup lang="ts">
/**
 * `<AuthLayout>` — page shell for custom authentication flows (login, signup,
 * password reset). The Vue twin of `@chelone/react`'s `auth/auth-layout.tsx`.
 * Renders a centered single-column form by default; fill the `#aside` slot to
 * opt into a two-column layout with brand/marketing content on the left.
 *
 * Like the React twin, it mounts `<Notification />` so a login-form error has a
 * sink even outside the main `<Layout>`; fill the `#notification` slot to
 * replace it. The `title` / `subtitle` are plain strings here (the React twin
 * allows arbitrary `ReactNode`); pass richer heading content via the default
 * slot instead.
 */

import type { VNode } from "vue";
import { cn } from "../../../lib/utils";
import Notification from "../feedback/notification.vue";

const props = defineProps<AuthLayoutProps>();

defineSlots<{
  /** Main-pane content — typically a login / signup / password-reset form. */
  default: () => VNode[];
  /** Left-pane brand content; when filled, the layout becomes two-column. */
  aside?: () => VNode[];
  /** Replaces the default `<Notification />` toast region. */
  notification?: () => VNode[];
}>();
</script>

<template>
  <div :class="cn('min-h-screen flex', props.class)">
    <div
      :class="
        cn(
          'container relative grid flex-col items-center justify-center sm:max-w-none lg:px-0',
          $slots.aside && 'lg:grid-cols-2',
        )
      "
    >
      <div
        v-if="$slots.aside"
        class="relative hidden h-full flex-col bg-zinc-900 p-10 text-white dark:border-r lg:flex"
      >
        <slot name="aside" />
      </div>
      <div class="lg:p-8">
        <div
          class="mx-auto flex w-full flex-col justify-center gap-y-6 sm:w-87.5"
        >
          <div
            v-if="title || subtitle"
            class="flex flex-col gap-y-2 text-center"
          >
            <h1
              v-if="title"
              class="text-2xl font-semibold tracking-tight"
            >
              {{ title }}
            </h1>
            <p
              v-if="subtitle"
              class="text-sm leading-normal text-muted-foreground"
            >
              {{ subtitle }}
            </p>
          </div>
          <slot />
        </div>
      </div>
    </div>
    <slot name="notification">
      <Notification />
    </slot>
  </div>
</template>
