<script setup lang="ts">
import {
  NumberField,
  Show,
  TabbedShowLayout,
  TabbedShowLayoutTab,
  TextField,
} from "@chelone/vue";
</script>

<template>
  <!-- A post's summary and body grouped into two tabs. -->
  <Show :id="1">
    <TabbedShowLayout :sync-with-location="false">
      <TabbedShowLayoutTab label="Summary">
        <TextField source="title" />
        <NumberField source="views" />
      </TabbedShowLayoutTab>
      <TabbedShowLayoutTab label="Body">
        <TextField source="body" />
      </TabbedShowLayoutTab>
    </TabbedShowLayout>
  </Show>
</template>
