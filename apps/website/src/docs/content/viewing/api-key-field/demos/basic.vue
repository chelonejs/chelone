<script lang="ts">
export const mode = "record";
</script>

<script setup lang="ts">
import { ApiKeyField, provideRecordContext } from "@chelone/vue";

provideRecordContext({
  id: 1,
  apiKey: "ck_live_4f9a21c7d83b",
  scopes: ["read", "write"],
  lastUsedAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
});
</script>

<template>
  <!-- `<ApiKeyField>` masks all but the last four characters, with buttons to reveal and copy the key, its scopes and when it was last used. -->
  <ApiKeyField
    source="apiKey"
    scopes-source="scopes"
    last-used-source="lastUsedAt"
  />
</template>
