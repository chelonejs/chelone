<script lang="ts">
export const mode = "input";
</script>

<script setup lang="ts">
/**
 * `<ConfigurableInputs>` lets the user hide and reorder these inputs from the
 * inspector. The inputs are the default slot, and the panel lists them once
 * `<InspectorButton>` turns configure mode on and Customize is clicked on the
 * form.
 */

import { NumberInput, TextInput } from "@chelone/vue";
import {
  ConfigurableInputs,
  Inspector,
  InspectorButton,
} from "@chelone/vue/inspector";
</script>

<template>
  <Inspector>
    <div class="flex w-full max-w-sm flex-col gap-4">
      <InspectorButton />
      <ConfigurableInputs class="flex flex-col gap-4">
        <TextInput source="title" default-value="On Computable Numbers" />
        <TextInput
          source="body"
          default-value="Notes on the Entscheidungsproblem"
        />
        <NumberInput source="views" :default-value="187" />
      </ConfigurableInputs>
    </div>
  </Inspector>
</template>
