<script lang="ts">
import type { RouterLinkProps } from "vue-router";

/** Props for {@link Link}: vue-router's `RouterLink` props plus `class`. */
export interface LinkProps extends RouterLinkProps {
  /** Extra CSS class appended after the default link classes. */
  class?: string;
}
</script>

<script setup lang="ts">
/**
 * `<Link>` — the admin navigation link, the Vue twin of `@chelone/react`'s
 * `common/link.tsx`. A vue-router `<RouterLink>` (a real `<a>`) with the shared
 * link styling; `to` and the other `RouterLink` props pass straight through.
 *
 * @example
 * <Link to="/posts">Posts</Link>
 */

import { RouterLink } from "vue-router";
import { cn } from "../../../lib/utils";

const props = defineProps<LinkProps>();
</script>

<template>
  <RouterLink
    v-bind="{ ...props, class: undefined }"
    :class="cn('text-primary underline-offset-4 hover:underline', props.class)"
  >
    <slot />
  </RouterLink>
</template>
