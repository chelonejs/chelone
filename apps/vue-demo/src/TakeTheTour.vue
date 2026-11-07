<script setup lang="ts">
/**
 * A user menu item that replays the welcome tour. The tour opens while its
 * stored flag is not `true`, so clearing the flag opens it.
 */

import { onboardingTourKey } from "@chelone/core";
import { TOUR_ID } from "@chelone/demo-data";
import { DropdownMenuItem, useStore } from "@chelone/vue";

const [, setDone] = useStore(onboardingTourKey(TOUR_ID), false);
</script>

<template>
  <DropdownMenuItem @select="setDone(false)">Take the tour</DropdownMenuItem>
</template>
