<script lang="ts">
/**
 * Another user with post 1 open: it announces itself on the post's presence
 * topic the way a second browser's `<PresenceBar>` would. Renders nothing.
 */
import {
  assertRealtimeDataProvider,
  createPresenceSession,
  presenceTopic,
} from "@chelone/core";
import { useCheloneContext } from "@chelone/vue";
import { defineComponent, onScopeDispose } from "vue";

const PreviewViewer = defineComponent({
  setup() {
    const { dataProvider } = useCheloneContext();
    assertRealtimeDataProvider(dataProvider, "PreviewViewer");
    const session = createPresenceSession({
      dataProvider,
      topic: presenceTopic("posts", 1),
      user: { id: "alan", name: "Alan Turing" },
    });
    session.start();
    onScopeDispose(() => session.stop());
    return () => null;
  },
});
</script>

<script setup lang="ts">
import { PresenceBar, ShowLive } from "@chelone/vue";
</script>

<template>
  <!-- Alan has post 1 open too, so the bar shows his avatar. You are left out. -->
  <ShowLive :id="1" title="">
    <PreviewViewer />
    <PresenceBar />
  </ShowLive>
</template>
