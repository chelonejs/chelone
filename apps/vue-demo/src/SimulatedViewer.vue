<script setup lang="ts">
/**
 * Another user with the post open: it announces itself on the post's presence
 * topic the way a second browser's `<PresenceBar>` would, so the bar shows
 * someone besides you.
 */

import {
  createPresenceSession,
  type Identifier,
  type PresenceUser,
  presenceTopic,
} from "@chelone/core";
import { onScopeDispose } from "vue";
import { dataProvider } from "./realtime";

const props = withDefaults(
  defineProps<{ postId: Identifier; user?: PresenceUser }>(),
  { user: () => ({ id: "alice", name: "Alice Smith" }) },
);

const session = createPresenceSession({
  dataProvider,
  topic: presenceTopic("posts", props.postId),
  user: props.user,
});
session.start();
onScopeDispose(() => session.stop());
</script>

<template>
  <span hidden />
</template>
