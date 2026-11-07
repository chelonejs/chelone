<script setup lang="ts">
import { Card, CardContentInner } from "@chelone/vue";
</script>

<template>
  <!-- `<CardContentInner>` stacks two sections inside a card without doubling their padding. -->
  <Card class="w-full">
    <CardContentInner>
      <h3 class="font-semibold">On Computable Numbers</h3>
    </CardContentInner>
    <CardContentInner>
      <p class="text-sm text-muted-foreground">A post by Alan Turing.</p>
    </CardContentInner>
  </Card>
</template>
