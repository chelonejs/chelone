<script lang="ts">
import type { LooseRecord } from "@chelone/core";

/** A webhook delivery outcome. */
export type DeliveryStatus = "ok" | "failed" | "pending";

/** The shape `<WebhookEndpointField>` reads from a record source. */
export interface WebhookEndpoint {
  url: string;
  secret: string;
  eventTypes: readonly string[];
  lastDelivery?: {
    status: DeliveryStatus;
    at: string;
  };
}

/** Props for {@link WebhookEndpointField}. */
export interface WebhookEndpointFieldProps {
  source: string;
  record?: LooseRecord;
  defaultValue?: unknown;
  class?: string;
}
</script>

<script setup lang="ts">
/**
 * `<WebhookEndpointField>` — displays a webhook endpoint's URL and last-delivery
 * status badge, the Vue analog of `@chelone/react`'s
 * `fields/webhook-endpoint-field.tsx`. The signing secret is NEVER rendered. A
 * nullish / non-object value renders nothing (parity with the twin).
 */

import { computed } from "vue";
import { cn } from "../../../lib/utils";
import { useFieldValue } from "../../../record/use-field-value";

const props = defineProps<WebhookEndpointFieldProps>();

const value = useFieldValue({
  source: props.source,
  record: props.record,
  defaultValue: props.defaultValue,
});

const endpoint = computed<WebhookEndpoint | null>(() => {
  const raw = value.value;
  return raw && typeof raw === "object" ? (raw as WebhookEndpoint) : null;
});

const status = computed<DeliveryStatus>(
  () => endpoint.value?.lastDelivery?.status ?? "pending",
);

const statusClass = computed(() =>
  cn(
    "rounded px-2 py-0.5 text-xs font-medium",
    status.value === "ok" && "bg-green-500/10 text-green-700",
    status.value === "failed" && "bg-red-500/10 text-red-700",
    status.value === "pending" && "bg-muted text-muted-foreground",
  ),
);
</script>

<template>
  <span
    v-if="endpoint"
    data-slot="webhook-endpoint-field"
    :class="cn('inline-flex items-center gap-2', props.class)"
  >
    <span class="font-mono text-sm">{{ endpoint.url }}</span>
    <span
      data-webhook-status
      :data-status="status"
      :class="statusClass"
      >{{ status.toUpperCase() }}</span
    >
  </span>
</template>
