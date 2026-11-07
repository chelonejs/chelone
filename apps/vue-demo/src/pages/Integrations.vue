<script lang="ts">
export const title = "Integrations";
export const group = "Settings";
</script>

<script setup lang="ts">
/**
 * The Integrations page, the Vue twin of `apps/demo`'s: the shop's API keys,
 * and the settings behind its sync and webhook. The keys are a table whose rows
 * show the masked key and rotate it; the settings are one form (webhook
 * endpoint, sync schedule, JSON config and mail password) beside a read-only
 * summary of what is saved.
 */

import type { ApiKey } from "@chelone/demo-data";
import {
  ApiKeyField,
  ApiKeyInput,
  CronField,
  CronInput,
  DataTable,
  DataTableCol,
  DateField,
  Edit,
  List,
  PasswordInput,
  RecordField,
  Show,
  Toolbar,
  useUpdate,
  WebhookEndpointField,
  WebhookEndpointInput,
} from "@chelone/vue";
import { MonacoJsonField, MonacoJsonInput } from "@chelone/vue/monaco";

const EVENT_TYPES = [
  "order.created",
  "order.shipped",
  "post.published",
  "customer.created",
];

const update = useUpdate("api_keys");

// A real server mints the new key and answers the update; the in-memory
// provider cannot, so this stands in for it. Without `onRotate`, `<ApiKeyInput>`
// writes `null` to the source and leaves the minting to the server.
async function rotate(key: ApiKey) {
  await update.mutateAsync({
    id: key.id,
    data: { prefix: `ck_live_${Math.floor(1000 + Math.random() * 9000)}` },
    previousData: key,
  });
}
</script>

<template>
  <div class="flex flex-col gap-8">
    <section aria-label="API keys">
      <List resource="api_keys" :per-page="5" title="API keys">
        <DataTable :row-click="false">
          <DataTableCol source="name" />
          <DataTableCol label="Key">
            <ApiKeyField
              source="prefix"
              scopes-source="scopes"
              last-used-source="last_used_at"
            />
          </DataTableCol>
          <DataTableCol label="Expires">
            <DateField source="expires_at" empty="Never" />
          </DataTableCol>
          <DataTableCol label="Rotate">
            <ApiKeyInput source="prefix" resource="api_keys" :on-rotate="rotate" />
          </DataTableCol>
        </DataTable>
      </List>
    </section>
    <div class="grid items-start gap-6 lg:grid-cols-2">
      <section aria-label="Settings">
        <Edit
          resource="integration_settings"
          :id="1"
          title="Sync and webhook settings"
        >
          <div class="flex max-w-xl flex-col gap-6">
            <WebhookEndpointInput
              source="webhook"
              label="Webhook endpoint"
              :event-types="EVENT_TYPES"
            />
            <CronInput source="sync_schedule" label="Sync schedule" />
            <MonacoJsonInput
              source="sync_config"
              label="Sync config"
              :height="200"
            />
            <PasswordInput source="smtp_password" label="Mail password" />
          </div>
          <Toolbar />
        </Edit>
      </section>
      <section aria-label="Saved settings">
        <Show resource="integration_settings" :id="1" title="Saved settings">
          <div class="flex flex-col gap-4">
            <RecordField label="Webhook endpoint">
              <WebhookEndpointField source="webhook" />
            </RecordField>
            <RecordField label="Sync schedule">
              <CronField source="sync_schedule" show-expression />
            </RecordField>
            <RecordField label="Sync config">
              <MonacoJsonField source="sync_config" />
            </RecordField>
          </div>
        </Show>
      </section>
    </div>
  </div>
</template>
