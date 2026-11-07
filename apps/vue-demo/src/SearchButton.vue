<script setup lang="ts">
/** The app bar's way into the command menu, for a user who does not know Cmd+K. */

import { Button, useCommandMenu } from "@chelone/vue";

const { open } = useCommandMenu();
</script>

<template>
  <Button variant="outline" size="sm" data-tour="search" @click="open">
    Search
    <span class="text-xs text-muted-foreground">⌘K</span>
  </Button>
</template>
