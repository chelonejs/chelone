<script setup lang="ts">
import { Button, Confirm } from "@chelone/vue";
import { ref } from "vue";

const isOpen = ref(false);
</script>

<template>
  <!-- `<Confirm>` asks for confirmation before deleting a post. -->
  <Button variant="destructive" @click="isOpen = true">Delete post</Button>
  <Confirm
    :is-open="isOpen"
    title="Delete this post?"
    content="This action cannot be undone."
    confirm="Delete"
    confirm-color="warning"
    @confirm="isOpen = false"
    @close="isOpen = false"
  />
</template>
