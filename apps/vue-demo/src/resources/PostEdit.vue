<script setup lang="ts">
/**
 * `<PostEdit>` — the post edit page, the Vue twin of `apps/demo`'s `PostEdit`.
 * `<EditLive>` fetches the record, seeds the form, and (by default) redirects to the
 * list on a successful save. The inputs bind to the ambient form via `useInput`;
 * validation comes AUTOMATICALLY from the registry's `postSchema` (D6) — no
 * per-field `validate` props. `<Toolbar>` renders the `<SaveButton>`.
 * `<LockOnMount>` holds the record's lock for "you" while the page is open and
 * shows "Locked by ..." in place of the form when someone else has it;
 * `<LockStatus>` sits beside the title.
 */

import {
  BooleanInput,
  EditLive,
  LockOnMount,
  LockStatus,
  NumberInput,
  ReferenceInput,
  TextInput,
  Toolbar,
} from "@chelone/vue";
import { ConfigurableInputs } from "@chelone/vue/inspector";
</script>

<template>
  <EditLive resource="posts">
    <template #actions>
      <LockStatus />
    </template>
    <LockOnMount identity="you">
      <!-- The user hides the inputs they never fill from the inspector. A
           hidden input keeps its loaded value, so the schema still passes. -->
      <ConfigurableInputs class="flex flex-col gap-4 max-w-xl">
        <TextInput source="title" />
        <TextInput source="body" />
        <ReferenceInput source="author_id" reference="authors" />
        <NumberInput source="views" />
        <BooleanInput source="published" />
      </ConfigurableInputs>
      <Toolbar />
    </LockOnMount>
  </EditLive>
</template>
