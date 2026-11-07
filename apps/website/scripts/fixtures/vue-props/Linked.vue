<script setup lang="ts">
import type { Client } from "./client";

defineProps<{
  /** The client to call. */
  client?: Client;
}>();
defineSlots<{
  /** Receives the client. */
  default(props: { client: Client; others: Client[] }): unknown;
}>();
</script>

<template>
  <slot :client="client" :others="[]" />
</template>
