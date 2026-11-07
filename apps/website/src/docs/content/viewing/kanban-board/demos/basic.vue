<script setup lang="ts">
import { List } from "@chelone/vue";
import { KanbanBoard } from "@chelone/vue/kanban";

const columns = [
  { id: "draft", label: "Draft" },
  { id: "in_review", label: "In review" },
  { id: "published", label: "Published" },
];
</script>

<template>
  <!-- `<KanbanBoard>` lays the posts out in Draft, In review and Published columns, and dragging a card writes its new status. -->
  <List :per-page="12" title="">
    <KanbanBoard
      group-source="status"
      title-source="title"
      description-source="views"
      :columns="columns"
      :link-type="false"
    />
  </List>
</template>
