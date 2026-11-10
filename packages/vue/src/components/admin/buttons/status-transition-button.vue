<script lang="ts" generic="TRecord extends ResourceRecord = RegisteredAnyRecord">
import type {
  MutationMode,
  RegisteredAnyRecord,
  ResourceRecord,
} from "@chelone/core";

/** Props for {@link StatusTransitionButton}. */
export interface StatusTransitionButtonProps<
  TRecord extends ResourceRecord = RegisteredAnyRecord,
> {
  /** Record field holding the status, a top-level key. Default `"status"`. */
  source?: keyof TRecord & string;
  /** Next states by current state. */
  transitions: Record<string, readonly string[]>;
  /** Predicates keyed `"<from>-><to>"`. A transition with no guard is allowed. */
  guards?: Record<string, (record: TRecord) => boolean>;
  /** Display text by state. A state with no entry shows as itself. */
  labels?: Record<string, string>;
  /** Override the ambient `<Resource>`. */
  resource?: string;
  /** Override the ambient record. */
  record?: TRecord;
  /** Ask for confirmation before moving the record. Default `false`. */
  confirm?: boolean;
  /** How the update is dispatched. Default `"pessimistic"`. */
  mutationMode?: MutationMode;
  /** Extra CSS class appended to the trigger. */
  class?: string;
}
</script>

<script setup lang="ts" generic="TRecord extends ResourceRecord = RegisteredAnyRecord">
/**
 * `<StatusTransitionButton>` — a menu of the states the record in view may move
 * to next. The Vue twin of `@chelone/react`'s
 * `buttons/status-transition-button.tsx`, over the same
 * `getAllowedTransitions` rules.
 *
 * The React `onTransition` prop is the `transition` event, `(from, to, record)`,
 * emitted after the update resolves and not when it fails.
 *
 * Renders nothing without a record, a resource or `edit` access. The trigger is
 * disabled when no transition is allowed and while an update is in flight.
 */

import {
  getAllowedTransitions,
  isLooseRecord,
} from "@chelone/core";
import { computed, inject, ref } from "vue";
import { useCheloneNotifications } from "../../../context";
import { useUpdate } from "../../../data/mutations";
import { useTranslate } from "../../../i18n/use-translate";
import { RecordContextKey } from "../../../record/record-context";
import { useResourceContext } from "../../../resource-context";
import Button from "../../ui/button.vue";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../ui/dropdown-menu";
import Confirm from "../feedback/confirm.vue";
import { useMenuAccess } from "../layout/use-menu-access";
import { ChevronDownIcon } from "./icons";

const props = withDefaults(defineProps<StatusTransitionButtonProps<TRecord>>(), {
  confirm: false,
  mutationMode: "pessimistic",
});

const emit = defineEmits<{
  (event: "transition", from: string, to: string, record: TRecord): void;
}>();

const resource = useResourceContext(props);
const injectedRecord = inject(RecordContextKey, null);
const record = computed(
  () => props.record ?? (injectedRecord?.value as TRecord | undefined),
);
const translate = useTranslate();
const notifications = useCheloneNotifications();

const { canAccess, isPending: isAccessPending } = useMenuAccess(
  computed(() => ({
    action: "edit",
    resource: resource ?? "",
    record: record.value,
  })),
);
// A missing resource renders nothing below, so the call is never dispatched.
const update = useUpdate(resource ?? "", { mutationMode: props.mutationMode });

const transitionState = computed(() =>
  record.value
    ? getAllowedTransitions<TRecord>(record.value, {
        source: props.source,
        transitions: props.transitions,
        guards: props.guards,
      })
    : undefined,
);
const show = computed(
  () =>
    !!resource &&
    !!record.value &&
    !isAccessPending.value &&
    canAccess.value,
);
const label = (state: string) =>
  Object.hasOwn(props.labels ?? {}, state)
    ? (props.labels?.[state] ?? state)
    : state;

const pendingTarget = ref<string | null>(null);

const confirmTitle = computed(() =>
  translate("chelone.status_transition.confirm_title", {
    _: "Change status?",
  }),
);
const confirmContent = computed(() =>
  translate("chelone.status_transition.confirm_content", {
    _: "Move to {status}?",
    status: label(pendingTarget.value ?? ""),
  }),
);

function onSelect(to: string): void {
  if (props.confirm) {
    pendingTarget.value = to;
    return;
  }
  void move(to);
}

async function move(to: string): Promise<void> {
  const current = record.value;
  if (!current || current.id == null || !isLooseRecord(current)) return;
  const from = transitionState.value?.current ?? "";
  try {
    // In undoable mode `mutateAsync` resolves once the Undo notification is
    // enqueued, and `useUpdate` notifies for it.
    await update.mutateAsync({
      id: current.id,
      data: { [props.source ?? "status"]: to },
      previousData: current,
    });
  } catch {
    notifications?.notify("chelone.notification.http_error", { type: "error" });
    return;
  }
  if (props.mutationMode !== "undoable") {
    notifications?.notify("chelone.notification.updated", {
      type: "info",
      messageArgs: { smart_count: 1 },
    });
  }
  emit("transition", from, to, current);
}

async function onConfirm(): Promise<void> {
  const to = pendingTarget.value;
  if (to === null) return;
  try {
    await move(to);
  } finally {
    pendingTarget.value = null;
  }
}
</script>

<template>
  <span
    v-if="show"
    class="inline-flex"
    data-slot="status-transition"
  >
    <DropdownMenu>
      <DropdownMenuTrigger>
        <Button
          type="button"
          variant="outline"
          :disabled="!transitionState?.allowed.length || update.isPending.value"
          :class="props.class"
          aria-haspopup="menu"
          data-slot="status-transition-trigger"
        >
          {{
            transitionState?.current
              ? label(transitionState.current)
              : translate("chelone.status_transition.change", { _: "Change status" })
          }}
          <ChevronDownIcon />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem
          v-for="to in transitionState?.allowed"
          :key="to"
          :data-state-value="to"
          data-slot="status-transition-item"
          @select="onSelect(to)"
        >
          {{ label(to) }}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
    <Confirm
      :is-open="pendingTarget !== null"
      :loading="update.isPending.value"
      :title="confirmTitle"
      :content="confirmContent"
      @confirm="onConfirm"
      @close="pendingTarget = null"
    />
  </span>
</template>
