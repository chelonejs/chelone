<script lang="ts">
export const title = "Order board";
export const group = "Orders";
</script>

<script setup lang="ts">
/**
 * The orders as a board: one column per status, and a drag (or a card's
 * "Move to" menu) writes the new status. The status button on each card moves
 * an order along the workflow, which is narrower than the board: it offers
 * only the next states, while a drag can put a card in any column. The Vue
 * twin of `apps/demo`'s `order-board.tsx`.
 */

import { statusChoices } from "@chelone/demo-data";
import {
  DateField,
  List,
  NumberField,
  StatusTransitionButton,
  TextField,
} from "@chelone/vue";
import { KanbanBoard } from "@chelone/vue/kanban";

const columns = statusChoices.map(({ id, name }) => ({ id, label: name }));
const labels = Object.fromEntries(
  statusChoices.map(({ id, name }) => [id, name]),
);
const transitions = {
  pending: ["shipped", "cancelled"],
  shipped: ["delivered", "cancelled"],
  delivered: [],
  cancelled: ["pending"],
};
</script>

<template>
  <List resource="orders" title="Order board" :per-page="100">
    <KanbanBoard group-source="status" title-source="reference" :columns="columns">
      <template #card="{ record }">
        <TextField source="reference" :record="record" class="font-medium" />
        <span class="text-muted-foreground">
          <NumberField
            source="total"
            :record="record"
            :options="{ style: 'currency', currency: 'USD' }"
          />
          ·
          <DateField source="delivery_at" :record="record" />
        </span>
        <!-- The menu is not portalled, so its clicks would reach the card. -->
        <div class="pt-1" @click.stop>
          <StatusTransitionButton
            :record="record"
            resource="orders"
            :transitions="transitions"
            :labels="labels"
            mutation-mode="optimistic"
            class="h-7 px-2 text-xs"
          />
        </div>
      </template>
    </KanbanBoard>
  </List>
</template>
