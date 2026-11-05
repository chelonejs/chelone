<script lang="ts">
import { defineComponent, onScopeDispose } from "vue";
import { useCheloneFormContext } from "../../../form/form-context";
import { subscribeStore } from "../../../form/subscribe-ref";
import type { EditProps } from "../view/edit.vue";

/** Props for {@link EditLive}: the props of `<Edit>`. */
export type EditLiveProps = EditProps;

/**
 * Tells `<EditLive>` whether the ambient form holds unsaved edits. It renders
 * nothing and has to sit under `<Edit>`, which is where the form is provided.
 * Dirty is `!isDefaultValue`, as in `useWarnWhenUnsavedChanges`: an edit that
 * was typed back to the saved value is clean.
 */
const FormDirtyReporter = defineComponent({
  emits: { change: (_dirty: boolean) => true },
  setup(_, { emit }) {
    const { form } = useCheloneFormContext();
    let dirty = !form.ambient.store.state.isDefaultValue;
    emit("change", dirty);
    onScopeDispose(
      subscribeStore(form.ambient.store, () => {
        const next = !form.ambient.store.state.isDefaultValue;
        if (next === dirty) return;
        dirty = next;
        emit("change", dirty);
      }),
    );
    return () => null;
  },
});
</script>

<script setup lang="ts">
/**
 * `<EditLive>` — `<Edit>` kept fresh: refetches when the record changes or
 * the connection comes back, but holds the refetch while the form has unsaved
 * edits and runs it once when the form turns clean, by save or by reset.
 *
 * Only `resource` and `id` are declared here, because the wrapper needs them
 * itself. Declaring `redirectOnSave` too would make Vue turn an absent one into
 * `false`, so it and every other attribute go to the `<Edit>` untouched, as
 * does every slot. The subscription starts in the wrapper's setup, not in the
 * form, so an event that lands while the record loads is not missed.
 */

import {
  type Identifier,
  type LiveSubscription,
  subscribeLiveRecord,
} from "@chelone/core";
import { ref, watchEffect } from "vue";
import { useCheloneContext } from "../../../context";
import { useResourceContext } from "../../../resource-context";
import { useRouterAdapterOptional } from "../../../router/adapter";
import Edit from "../view/edit.vue";

const props = defineProps<{ resource?: string; id?: Identifier }>();

const ctx = useCheloneContext();
const ambientResource = useResourceContext();
if (!(props.resource ?? ambientResource)) {
  throw new Error(
    "<Edit>: no resource. Pass a `resource` prop or render inside a <Resource>.",
  );
}
// Fixed at setup, as `<Edit>` fixes its own: a route that moves to another record
// reuses this component, and the subscription must stay on the record shown.
const liveResource = props.resource ?? ambientResource;
const liveId = props.id ?? useRouterAdapterOptional()?.useParams().value.id;

const formIsDirty = ref(false);
let subscription: LiveSubscription | undefined;

watchEffect((onCleanup) => {
  if (!liveResource || liveId === undefined) return;
  const live = subscribeLiveRecord(ctx, liveResource, liveId, {
    paused: () => formIsDirty.value,
  });
  subscription = live;
  onCleanup(() => {
    live.stop();
    if (subscription === live) subscription = undefined;
  });
});

function onDirtyChange(dirty: boolean) {
  formIsDirty.value = dirty;
  if (!dirty) subscription?.resume();
}

const otherSlots = (slots: Record<string, unknown>) =>
  Object.keys(slots).filter((name) => name !== "default");
</script>

<template>
  <Edit :resource="resource" :id="id">
    <template
      v-for="name in otherSlots($slots)"
      :key="name"
      #[name]="slotProps"
    >
      <slot :name="name" v-bind="slotProps ?? {}" />
    </template>
    <template #default="slotProps">
      <FormDirtyReporter @change="onDirtyChange" />
      <slot v-bind="slotProps ?? {}" />
    </template>
  </Edit>
</template>
