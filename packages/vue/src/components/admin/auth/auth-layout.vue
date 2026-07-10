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
 * Chelone divergence (deliberate — T1 auth precedes T2 feedback): the React twin
 * mounts `<Notification />` at the root so a login-form error has a sink even
 * outside the main `<Layout>`. `<Notification>` is a V3-c T2 (feedback)
 * deliverable, so this layout instead exposes a `#notification` slot for an app
 * (or T2) to mount the toast sink into. Login errors still ENQUEUE to the
 * notification store regardless — once the sink mounts, they surface. The
 * `title` / `subtitle` are plain strings here (the React twin allows arbitrary
 * `ReactNode`); pass richer heading content via the default slot instead.
 */

import { cn } from "../../../lib/utils";

const props = defineProps<AuthLayoutProps>();

defineSlots<{
  /** Main-pane content — typically a login / signup / password-reset form. */
  default: () => unknown;
  /** Left-pane brand content; when filled, the layout becomes two-column. */
  aside?: () => unknown;
  /** A toast/notification sink (the V3-c T2 `<Notification>` mounts here). */
  notification?: () => unknown;
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
              class="text-sm leading-none text-muted-foreground"
            >
              {{ subtitle }}
            </p>
          </div>
          <slot />
        </div>
      </div>
    </div>
    <slot name="notification" />
  </div>
</template>
