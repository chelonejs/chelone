<script lang="ts">
export const mode = "realtime";
</script>

<script setup lang="ts">
import {
  Button,
  EditLive,
  NumberInput,
  TextInput,
  Toolbar,
  useUpdate,
} from "@chelone/vue";

// Renames post 1 the way a second user's browser would, over the same provider.
const { mutate } = useUpdate("posts");
const rename = () =>
  mutate({
    id: 1,
    data: { title: `Renamed at ${new Date().toLocaleTimeString()}` },
  });
</script>

<template>
  <!-- `<EditLive>` shows the rename as soon as the form is clean. Type in the title first and the change is held until the form is saved or reset. -->
  <EditLive :id="1">
    <template #actions>
      <Button variant="outline" size="sm" @click="rename">
        Another user renames post 1
      </Button>
    </template>
    <TextInput source="title" />
    <NumberInput source="views" :min="0" />
    <Toolbar />
  </EditLive>
</template>
