<script setup lang="ts">
/**
 * `<Link>` is vue-router's `<RouterLink>` with the shared link styling, so `to`
 * takes the same paths the admin's own links take. The preview has the `posts`
 * resource registered, so this one goes to its list, and `useLocation` prints
 * where the preview ended up — the frame has no page to move, so the path is
 * the visible half of the jump.
 */

import { Link, useLocation } from "@chelone/vue";

const location = useLocation();
</script>

<template>
  <div class="flex flex-col items-start gap-3">
    <Link to="/posts">Open the posts list</Link>
    <p class="text-sm text-muted-foreground">
      The preview is at
      <code class="font-mono">{{ location.pathname }}</code>
    </p>
  </div>
</template>
