<script lang="ts">
export const mode = "realtime";
</script>

<script setup lang="ts">
import {
  Badge,
  Button,
  LockStatus,
  useGetLockLive,
  useLock,
  useUnlock,
} from "@chelone/vue";
import { computed } from "vue";

// Takes and releases post 1's lock as another identity.
const { data: lock } = useGetLockLive("posts", { id: 1 });
const { lock: take } = useLock();
const { unlock } = useUnlock();
const held = computed(() => lock.value?.identity === "alice");
const toggle = () =>
  (held.value ? unlock : take)("posts", { id: 1, identity: "alice" });
</script>

<template>
  <!-- `<LockStatus>` names the holder of post 1 and follows the lock as it is taken and released. The `#free` slot fills the free state, which is empty by default. -->
  <div class="flex flex-col items-start gap-4">
    <LockStatus :id="1">
      <template #free>
        <Badge variant="outline">Post 1 is free</Badge>
      </template>
    </LockStatus>
    <Button variant="outline" size="sm" @click="toggle">
      Another user {{ held ? "unlocks" : "locks" }} post 1
    </Button>
  </div>
</template>
