<script lang="ts">
export const mode = "input";
</script>

<script setup lang="ts">
import { WebhookEndpointInput } from "@chelone/vue";

const EVENT_TYPES = ["order.created", "order.shipped", "post.published"];
const endpoint = {
  url: "https://hooks.example.com/orders",
  secret: "whsec_8f3a1c7d92e04b56",
  eventTypes: ["order.created"],
};

// A real app posts a signed test event to the URL; the demo has no server to answer.
async function sendTestPing() {}
</script>

<template>
  <!-- `<WebhookEndpointInput>` edits an endpoint's URL, signing secret and event subscriptions, and can send a test ping. -->
  <div class="w-full max-w-md">
    <WebhookEndpointInput
      source="endpoint"
      label="Webhook endpoint"
      :event-types="EVENT_TYPES"
      :default-value="endpoint"
      :on-test-ping="sendTestPing"
    />
  </div>
</template>
