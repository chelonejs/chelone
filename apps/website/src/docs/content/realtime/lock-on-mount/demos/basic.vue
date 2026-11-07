<script lang="ts">
export const mode = "realtime";
</script>

<script setup lang="ts">
import { Button, LockOnMount } from "@chelone/vue";
import { ref } from "vue";

const graceOpen = ref(false);
</script>

<template>
  <!-- Ada's `<LockOnMount>` takes the lock on post 1 and shows its content. Opening the same post as Grace finds it held, so Grace sees who has it instead. -->
  <div class="flex w-full max-w-sm flex-col items-start gap-4">
    <LockOnMount :id="1" identity="ada">
      <p>Ada holds the lock on post 1 and can edit it.</p>
    </LockOnMount>
    <LockOnMount v-if="graceOpen" :id="1" identity="grace">
      <p>Grace holds the lock on post 1.</p>
    </LockOnMount>
    <Button v-else variant="outline" size="sm" @click="graceOpen = true">
      Grace opens post 1
    </Button>
  </div>
</template>
