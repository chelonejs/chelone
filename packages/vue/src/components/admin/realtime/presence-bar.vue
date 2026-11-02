<script lang="ts">
import type { PresenceUser } from "@chelone/core";

/** Props for {@link PresenceBar}. Each defaults to the ambient context. */
export interface PresenceBarProps {
  /** Defaults to the topic of the ambient resource and record. */
  topic?: string;
  /** Defaults to the auth provider's identity. */
  currentUser?: PresenceUser;
  /** How many avatars show before the rest collapse into `+N`. Default 5. */
  maxAvatars?: number;
  /** How often the announce is republished. Default 15000. */
  heartbeatMs?: number;
  /** A user unheard for longer than this is dropped. Default 30000. */
  staleMs?: number;
  class?: string;
}
</script>

<script setup lang="ts">
/**
 * `<PresenceBar>` — the other users on a record, as a stack of avatars with
 * their initials, or `src` when they have an avatar. It renders nothing while
 * nobody else is there, and never shows the current user, even from a second
 * tab.
 */

import { getPresenceInitials } from "@chelone/core";
import { computed } from "vue";
import { useOptionalIdentity } from "../../../auth/auth-hooks";
import { usePresence } from "../../../realtime/presence";
import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
  AvatarImage,
} from "../../ui/avatar";

const props = withDefaults(defineProps<PresenceBarProps>(), { maxAvatars: 5 });

const { users } = usePresence({
  topic: () => props.topic,
  user: () => props.currentUser,
  heartbeatMs: () => props.heartbeatMs,
  staleMs: () => props.staleMs,
});

// The session tells tabs apart by session id; the bar tells people apart by user id.
const identity = useOptionalIdentity();
const selfId = computed(
  () =>
    props.currentUser?.id ??
    (identity.identity.value ? String(identity.identity.value.id) : undefined),
);
const others = computed(() =>
  users.value.filter((user) => user.id !== selfId.value),
);
const shown = computed(() => others.value.slice(0, props.maxAvatars));
const hidden = computed(() => others.value.length - shown.value.length);
</script>

<template>
  <AvatarGroup v-if="others.length > 0" data-slot="presence-bar" :class="props.class">
    <Avatar
      v-for="user in shown"
      :key="user.id"
      size="sm"
      data-presence-user
      :title="user.name"
    >
      <AvatarImage v-if="user.avatar" :src="user.avatar" :alt="user.name" />
      <AvatarFallback>{{ getPresenceInitials(user.name) }}</AvatarFallback>
    </Avatar>
    <AvatarGroupCount v-if="hidden > 0">+{{ hidden }}</AvatarGroupCount>
  </AvatarGroup>
</template>
