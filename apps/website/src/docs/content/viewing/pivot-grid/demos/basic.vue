<script setup lang="ts">
import { PivotGrid, provideListContext, useList } from "@chelone/vue";

const sales = [
  { id: 1, region: "North", quarter: "Q1", amount: 12000 },
  { id: 2, region: "North", quarter: "Q2", amount: 15500 },
  { id: 3, region: "North", quarter: "Q2", amount: 4200 },
  { id: 4, region: "South", quarter: "Q1", amount: 9800 },
  { id: 5, region: "South", quarter: "Q3", amount: 11300 },
  { id: 6, region: "West", quarter: "Q1", amount: 7600 },
  { id: 7, region: "West", quarter: "Q2", amount: 8900 },
  { id: 8, region: "West", quarter: "Q3", amount: 13400 },
];

// `<PivotGrid>` reads the ambient list, so the demo builds one over the rows.
const list = useList({ data: sales, perPage: sales.length });
provideListContext(list);
</script>

<template>
  <!-- `<PivotGrid>` sums `amount` by region and quarter, with a total for each row and column. -->
  <PivotGrid
    row-source="region"
    column-source="quarter"
    value-source="amount"
    aggregator="sum"
  />
</template>
