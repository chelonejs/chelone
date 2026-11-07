<script setup lang="ts">
withDefaults(
  defineProps<{
    /** The heading. */
    title: string;
    /** How wide the card is. */
    size?: "sm" | "lg";
  }>(),
  { size: "sm" },
);
defineEmits<{
  close: [reason: string];
}>();
defineSlots<{
  /** The content under the heading. */
  default(props: { count: number }): unknown;
  /** Replaces the heading. */
  header(): unknown;
}>();
</script>

<template>
  <section>
    <slot name="header">{{ title }}</slot>
    <slot :count="1" />
  </section>
</template>
