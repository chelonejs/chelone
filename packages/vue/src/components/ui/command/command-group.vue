<script setup lang="ts">
/**
 * `<CommandGroup>` — a labelled cluster of items. Hides itself, heading
 * included, when none of its items shows.
 */

import { provide, useId } from "vue";
import { cn } from "../../../lib/utils";
import { CommandGroupKey, useCommand } from "./context";

const props = defineProps<{ heading?: string; class?: string }>();

const ctx = useCommand();
const groupId = useId();
const headingId = useId();
provide(CommandGroupKey, groupId);
</script>

<template>
  <div
    v-show="!ctx.ready.value || ctx.groupHasVisible(groupId)"
    role="group"
    :aria-labelledby="heading ? headingId : undefined"
    :class="cn('overflow-hidden p-1 text-foreground', props.class)"
    data-slot="command-group"
  >
    <div
      v-if="heading"
      :id="headingId"
      class="px-2 py-1.5 text-xs font-medium text-muted-foreground"
      data-slot="command-group-heading"
    >
      {{ heading }}
    </div>
    <slot />
  </div>
</template>
