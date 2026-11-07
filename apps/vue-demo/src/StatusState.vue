<script setup lang="ts">
/**
 * One box of the Status page: a titled description, a toggle button and, once
 * the button is on, the state it shows in the default slot. Without a slot the
 * button is a plain action.
 */

import { Button } from "@chelone/vue";

defineProps<{
  name: string;
  description: string;
  label: string;
  active?: boolean;
}>();

defineEmits<{ toggle: [] }>();
</script>

<template>
  <section :aria-label="name" class="flex flex-col gap-3 rounded-md border p-4">
    <div>
      <h2 class="font-medium">{{ name }}</h2>
      <p class="text-sm text-muted-foreground">{{ description }}</p>
    </div>
    <div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        :aria-pressed="$slots.default ? Boolean(active) : undefined"
        @click="$emit('toggle')"
      >
        {{ label }}
      </Button>
    </div>
    <div v-if="$slots.default && active" class="min-h-16"><slot /></div>
  </section>
</template>
