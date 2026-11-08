<script lang="ts" generic="TRecord extends ResourceRecord = LooseRecord">
import type { LooseRecord, ResourceRecord } from "@chelone/core";

/** The record fields a job row reads, each a path. */
export interface JobFields<TRecord extends ResourceRecord = LooseRecord> {
  statusSource: keyof TRecord & string;
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
export interface JobMonitorRowProps<
  TRecord extends ResourceRecord = LooseRecord,
> {
  job: TRecord;
  resource: string;
  fields: JobFields<TRecord>;
  rules: JobRules;
  actions: boolean;
  busy: boolean;
}
</script>

<script setup lang="ts" generic="TRecord extends ResourceRecord = LooseRecord">
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
import { provideRecordContext } from "../../../record/record-context";
import { useMenuAccess } from "../layout/use-menu-access";

const props = defineProps<JobMonitorRowProps<TRecord>>();
const emit = defineEmits<{
  (event: "plan", plan: JobPlan<TRecord> | null): void;
}>();

// The fields read the job from context, so a poll that changes a reused row's
// job reaches them: a `record` prop is read once, at setup.
provideRecordContext(computed(() => props.job));
const translate = useTranslate();
const showPayload = ref(false);
const { canAccess, isPending: isAccessPending } = useMenuAccess(
  computed(() => ({
    action: "edit",
    resource: props.resource,
    record: props.job,
  })),
);

const options = computed<JobActionOptions<TRecord>>(() => ({
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
          @click="emit('plan', planJobRetry<TRecord>(job, options))"
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
          @click="emit('plan', planJobCancel<TRecord>(job, options))"
        >
          {{ translate("chelone.action.cancel", { _: "Cancel" }) }}
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
      class="overflow-x-auto rounded-md bg-muted p-2 text-xs"
    />
  </li>
</template>
