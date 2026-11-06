<script lang="ts">
import type { LooseRecord } from "@chelone/core";

/** The record fields a job row reads, each a path. */
export interface JobFields {
  statusSource: string;
  typeSource: string;
  payloadSource: string;
  errorSource: string;
  attemptsSource: string;
  createdAtSource: string;
}

/** The Retry and Cancel rules, as `getJobActions` takes them. */
export interface JobRules {
  retryFrom?: readonly string[];
  cancelFrom?: readonly string[];
  retryValue?: string;
  cancelValue?: string;
}

/** Props for {@link JobMonitorRow}. */
export interface JobMonitorRowProps {
  job: LooseRecord;
  resource: string;
  fields: JobFields;
  rules: JobRules;
  actions: boolean;
  busy: boolean;
}
</script>

<script setup lang="ts">
/**
 * One job of a `<JobMonitor>`. It owns the payload toggle and the access check
 * for its job; the write itself is the monitor's, so it survives this row
 * unmounting when a tab is left or a poll moves the job.
 */

import {
  getAtPath,
  getJobActions,
  type JobActionOptions,
  type JobPlan,
  planJobCancel,
  planJobRetry,
} from "@chelone/core";
import { computed, ref } from "vue";
import { useTranslate } from "../../../i18n/use-translate";
import Button from "../../ui/button.vue";
import DateField from "../fields/date-field.vue";
import JsonField from "../fields/json-field.vue";
import { useMenuAccess } from "../layout/use-menu-access";

const props = defineProps<JobMonitorRowProps>();
const emit = defineEmits<{
  (event: "plan", plan: JobPlan<LooseRecord> | null): void;
}>();

const translate = useTranslate();
const showPayload = ref(false);
const { canAccess, isPending: isAccessPending } = useMenuAccess(
  computed(() => ({
    action: "edit",
    resource: props.resource,
    record: props.job,
  })),
);

const options = computed<JobActionOptions<LooseRecord>>(() => ({
  statusSource: props.fields.statusSource,
  ...props.rules,
}));
const jobActions = computed(() => getJobActions(props.job, options.value));
const mayAct = computed(
  () => props.actions && canAccess.value && !isAccessPending.value,
);
// type-escape: getAtPath reads a record by a runtime path and returns unknown
const text = (value: unknown) =>
  value == null || value === "" ? undefined : String(value);
const type = computed(() => text(getAtPath(props.job, props.fields.typeSource)));
const error = computed(() =>
  text(getAtPath(props.job, props.fields.errorSource)),
);
const attempts = computed(() =>
  getAtPath(props.job, props.fields.attemptsSource),
);
const hasPayload = computed(
  () => getAtPath(props.job, props.fields.payloadSource) != null,
);
</script>

<template>
  <li
    data-slot="job-monitor-row"
    :data-record-id="String(job.id)"
    class="flex flex-col gap-2 rounded-md border p-3 text-sm"
  >
    <div class="flex flex-wrap items-center gap-x-3 gap-y-1">
      <span data-slot="job-monitor-type" class="font-medium">{{
        type ?? translate("chelone.job_monitor.no_type", { _: "(no type)" })
      }}</span>
      <span data-slot="job-monitor-id" class="text-muted-foreground"
        >#{{ String(job.id) }}</span
      >
      <span
        v-if="attempts != null"
        data-slot="job-monitor-attempts"
        class="text-muted-foreground"
        >{{
          translate("chelone.job_monitor.attempts", {
            attempts: String(attempts),
            _: "Attempts: {attempts}",
          })
        }}</span
      >
      <DateField
        :source="fields.createdAtSource"
        :record="job"
        show-time
        class="text-muted-foreground"
      />
      <span class="ml-auto flex gap-2">
        <Button
          v-if="hasPayload"
          type="button"
          variant="outline"
          size="sm"
          :aria-expanded="showPayload"
          @click="showPayload = !showPayload"
        >
          {{
            showPayload
              ? translate("chelone.job_monitor.hide_payload", {
                  _: "Hide payload",
                })
              : translate("chelone.job_monitor.show_payload", {
                  _: "Show payload",
                })
          }}
        </Button>
        <Button
          v-if="mayAct && jobActions.canRetry"
          type="button"
          size="sm"
          data-slot="job-monitor-retry"
          :disabled="busy"
          @click="emit('plan', planJobRetry<LooseRecord>(job, options))"
        >
          {{ translate("chelone.job_monitor.retry", { _: "Retry" }) }}
        </Button>
        <Button
          v-if="mayAct && jobActions.canCancel"
          type="button"
          variant="outline"
          size="sm"
          data-slot="job-monitor-cancel"
          :disabled="busy"
          @click="emit('plan', planJobCancel<LooseRecord>(job, options))"
        >
          {{ translate("ra.action.cancel", { _: "Cancel" }) }}
        </Button>
      </span>
    </div>
    <p
      v-if="error"
      data-slot="job-monitor-last-error"
      class="text-destructive break-words"
    >
      {{ error }}
    </p>
    <JsonField
      v-if="hasPayload && showPayload"
      :source="fields.payloadSource"
      :record="job"
      class="overflow-x-auto rounded-md bg-muted p-2 text-xs"
    />
  </li>
</template>
