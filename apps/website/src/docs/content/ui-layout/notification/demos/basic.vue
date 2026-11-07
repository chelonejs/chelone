<script setup lang="ts">
import { Button, Notification, useNotify } from "@chelone/vue";

const notify = useNotify();
</script>

<template>
  <!-- `<Notification>` renders the queue `useNotify` pushes into: press the button and a success toast with a close button slides in at the bottom of the screen. -->
  <!-- The toast is fixed to the bottom of the viewport, which in the docs is a frame as tall as this demo, so the demo is tall enough to hold it. -->
  <div class="min-h-40">
    <Button type="button" @click="notify('Post saved', { type: 'success' })">
      Fire a notification
    </Button>
    <Notification />
  </div>
</template>
