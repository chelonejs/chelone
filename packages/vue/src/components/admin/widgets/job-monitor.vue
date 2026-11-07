<script lang="ts" generic="TRecord extends ResourceRecord = LooseRecord">
import type {
  LooseRecord,
  ResourceRecord,
  SortPayload,
  SourceKey,
  SourceProp,
} from "@chelone/core";

/** Props for {@link JobMonitor}. */
export interface JobMonitorProps<
  TRecord extends ResourceRecord = LooseRecord,
> {
  /** The jobs resource. Defaults to the resource context; with neither, nothing renders. */
  resource?: string;
  /** Milliseconds between reads. Default 5000, `0` turns polling off. */
  pollInterval?: number;
  /** The statuses to show, one tab each and in this order. A job whose status has no tab is not shown. */
  tabs?: readonly string[];
  /** Record field holding the job status, a top-level key. Default `"status"`. */
  statusSource?: SourceKey<TRecord>;
  /** The field shown as the job's type. Default `"type"`. */
  typeSource?: SourceProp<TRecord>;
  /** The field holding the payload. Default `"payload"`. */
  payloadSource?: SourceProp<TRecord>;
  /** The field holding the last error. Default `"lastError"`. */
  errorSource?: SourceProp<TRecord>;
  /** The field holding the attempt count. Default `"attempts"`. */
  attemptsSource?: SourceProp<TRecord>;
  /** The field holding the creation time. Default `"createdAt"`. */
  createdAtSource?: SourceProp<TRecord>;
  /** Jobs read per poll. Default 200. */
  perPage?: number;
  /** Default `createdAtSource` descending. */
  sort?: SortPayload;
  /** Show Retry and Cancel where the job allows them and the user has `edit` access. Default true. */
  actions?: boolean;
  /** Statuses a job can be retried from. Default `["failed"]`. */
  retryFrom?: readonly string[];
  /** Statuses a job can be cancelled from. Default `["running", "queued"]`. */
  cancelFrom?: readonly string[];
  /** Status Retry writes. Default `"queued"`. */
  retryValue?: string;
  /** Status Cancel writes. Default `"cancelled"`. */
  cancelValue?: string;
  /** Default `translate("chelone.job_monitor.title")`, "Jobs". */
  title?: string;
  class?: string;
}
</script>

<script setup lang="ts" generic="TRecord extends ResourceRecord = LooseRecord">
/**
 * `<JobMonitor>`: the jobs of a resource in one tab per status, with a count on
 * each tab. The Vue twin of `@chelone/react`'s `widgets/job-monitor.tsx`. It
 * reads the resource itself and again every `pollInterval` ms, so a job moves
 * to its new tab as soon as a poll sees its new status. Retry and Cancel write
 * the status through a pessimistic `update`; they are offered by the rules of
 * `getJobActions` and only to a user who may `edit` the resource. They are UI
 * rules: the server has to refuse a retry of a job that is not failed.
 *
 * Type, error and payload render as text, never as markup.
 */

import {
  buildKanbanBuckets,
  DEFAULT_JOB_TABS,
  type JobPlan,
  jobStatusSource,
  type RecordResources,
} from "@chelone/core";
import { computed } from "vue";
import { useCheloneNotifications } from "../../../context";
import { useUpdate } from "../../../data/mutations";
import { useGetList } from "../../../data/queries";
import { useTranslate } from "../../../i18n/use-translate";
import { cn } from "../../../lib/utils";
import { useResourceContext } from "../../../resource-context";
import { Badge } from "../../ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../ui/tabs";
import JobMonitorRow from "./job-monitor-row.vue";

const props = withDefaults(defineProps<JobMonitorProps<TRecord>>(), {
  pollInterval: 5000,
  perPage: 200,
  actions: true,
});

const resource = useResourceContext(props);
const translate = useTranslate();
const notifications = useCheloneNotifications();

// Owned here, not by a row: a row unmounts when its tab is left or a poll
// moves the job, and an unmounted observer drops the notifications below.
// One write at a time, so a second job's write cannot displace the first's.
// A missing resource renders nothing below, so the call is never dispatched.
const { mutate, isPending: isWriting } = useUpdate<RecordResources<TRecord>, string>(
  resource ?? "",
  { mutationMode: "pessimistic" },
);
const fields = computed(() => ({
  statusSource: jobStatusSource<TRecord>(props.statusSource),
  typeSource: props.typeSource ?? "type",
  payloadSource: props.payloadSource ?? "payload",
  errorSource: props.errorSource ?? "lastError",
  attemptsSource: props.attemptsSource ?? "attempts",
  createdAtSource: props.createdAtSource ?? "createdAt",
}));
const rules = computed(() => ({
  retryFrom: props.retryFrom,
  cancelFrom: props.cancelFrom,
  retryValue: props.retryValue,
  cancelValue: props.cancelValue,
}));
const { data, isError } = useGetList<RecordResources<TRecord>, string>(
  resource ?? "",
  computed(() => ({
    pagination: { page: 1, perPage: props.perPage },
    sort: props.sort ?? {
      field: fields.value.createdAtSource,
      order: "DESC" as const,
    },
  })),
  { refetchInterval: computed(() => props.pollInterval), enabled: !!resource },
);

function write(plan: JobPlan<TRecord> | null): void {
  if (!plan) return;
  mutate(plan, {
    onSuccess: () =>
      notifications?.notify("chelone.notification.updated", {
        type: "info",
        messageArgs: { smart_count: 1 },
      }),
    onError: (failure) => {
      console.error(failure);
      notifications?.notify("chelone.notification.http_error", {
        type: "error",
      });
    },
  });
}

const buckets = computed(() =>
  buildKanbanBuckets(
    data.value?.data ?? [],
    fields.value.statusSource,
    (props.tabs ?? DEFAULT_JOB_TABS).map((id) => ({
      id,
      label: translate(`chelone.job_monitor.status.${id}`, { _: id }),
    })),
  ),
);
const first = computed(() => buckets.value[0]?.column.id);
const show = computed(() => !!resource && (!!data.value || isError.value));
const title = computed(
  () => props.title ?? translate("chelone.job_monitor.title", { _: "Jobs" }),
);
</script>

<template>
  <Card
    v-if="show"
    data-slot="job-monitor"
    :class="cn('gap-4', props.class)"
  >
    <CardHeader>
      <CardTitle>{{ title }}</CardTitle>
    </CardHeader>
    <CardContent class="flex flex-col gap-3">
      <p v-if="isError" data-slot="job-monitor-error" class="text-sm text-destructive">
        {{
          translate("chelone.notification.http_error", {
            _: "Server communication error",
          })
        }}
      </p>
      <Tabs v-if="first !== undefined && resource" :default-value="first">
        <TabsList>
          <TabsTrigger
            v-for="{ column, records } in buckets"
            :key="column.id"
            :value="column.id"
          >
            {{ column.label }}
            <Badge data-slot="job-monitor-count" variant="secondary" class="ml-1">{{
              records.length
            }}</Badge>
          </TabsTrigger>
        </TabsList>
        <TabsContent
          v-for="{ column, records } in buckets"
          :key="column.id"
          :value="column.id"
        >
          <p v-if="records.length === 0" class="py-2 text-sm text-muted-foreground">
            {{
              translate("chelone.job_monitor.empty", {
                status: column.id,
                _: "No {status} jobs",
              })
            }}
          </p>
          <ul v-else class="flex flex-col gap-2">
            <JobMonitorRow
              v-for="job in records"
              :key="job.id"
              :job="job"
              :resource="resource"
              :fields="fields"
              :rules="rules"
              :actions="actions"
              :busy="isWriting"
              @plan="write"
            />
          </ul>
        </TabsContent>
      </Tabs>
    </CardContent>
  </Card>
</template>
