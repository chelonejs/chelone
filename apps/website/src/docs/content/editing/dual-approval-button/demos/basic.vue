<script lang="ts">
export const mode = "view";
</script>

<script setup lang="ts">
import { DualApprovalButton, Show } from "@chelone/vue";
</script>

<template>
  <!-- Post 4 is the seed's in-review post that already has one approval, so the signed-in user's is the second and publishes it. -->
  <Show :id="4" title="">
    <DualApprovalButton
      :required="2"
      pending-value="in_review"
      approved-value="published"
    />
  </Show>
</template>
