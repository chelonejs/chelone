<script lang="ts">
export const mode = "record";
</script>

<script setup lang="ts">
import { WebhookEndpointField } from "@chelone/vue";

const endpoints = [
  {
    id: 1,
    endpoint: {
      url: "https://hooks.example.com/orders",
      secret: "whsec_1",
      eventTypes: ["order.created"],
      lastDelivery: { status: "ok", at: "2026-11-07T08:00:00Z" },
    },
  },
  {
    id: 2,
    endpoint: {
      url: "https://hooks.example.com/shipping",
      secret: "whsec_2",
      eventTypes: ["order.shipped"],
      lastDelivery: { status: "failed", at: "2026-11-07T08:05:00Z" },
    },
  },
  {
    id: 3,
    endpoint: {
      url: "https://hooks.example.com/cms",
      secret: "whsec_3",
      eventTypes: ["post.published"],
    },
  },
];
</script>

<template>
  <!-- `<WebhookEndpointField>` shows an endpoint's URL and the status of its last delivery; the signing secret is never rendered. -->
  <ul class="flex flex-col gap-2">
    <li v-for="record in endpoints" :key="record.id">
      <WebhookEndpointField source="endpoint" :record="record" />
    </li>
  </ul>
</template>
