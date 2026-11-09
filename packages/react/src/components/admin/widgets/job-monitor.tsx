import {
  buildKanbanBuckets,
  DEFAULT_JOB_TABS,
  getAtPath,
  getJobActions,
  type JobActionOptions,
  type JobPlan,
  jobStatusSource,
  type LooseRecord,
  planJobCancel,
  planJobRetry,
  type RecordResources,
  type ResourceRecord,
  type SortPayload,
  type SourceKey,
  type SourceProp,
} from "@chelone/core";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { useGetList, useUpdate } from "../../../hooks";
import { useTranslate } from "../../../i18n-hooks";
import { useNotify } from "../../../notification-hooks";
import { RecordContextProvider } from "../../../record/record-context";
import { useResourceContext } from "../../../resource";
import { DateField } from "../fields/date-field";
import { JsonField } from "../fields/json-field";
import { useMenuAccess } from "../layout/use-menu-access";

export interface JobMonitorProps<TRecord extends ResourceRecord = LooseRecord> {
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
  className?: string;
}

type Fields<TRecord extends ResourceRecord> = {
  statusSource: keyof TRecord & string;
  typeSource: string;
  payloadSource: string;
  errorSource: string;
  attemptsSource: string;
  createdAtSource: string;
};

type Rules<TRecord extends ResourceRecord> = Pick<
  JobMonitorProps<TRecord>,
  "retryFrom" | "cancelFrom" | "retryValue" | "cancelValue"
>;

/**
 * What a row's date and payload fields read: the two values, taken from the job
 * at the configured sources, since those sources are runtime strings no
 * resource's paths name.
 */
interface JobValues {
  id: ResourceRecord["id"];
  // type-escape: server: getAtPath reads a record by a runtime path and returns unknown
  createdAt: unknown;
  // type-escape: server: getAtPath reads a record by a runtime path and returns unknown
  payload: unknown;
}

// type-escape: server: getAtPath reads a record by a runtime path and returns unknown
const text = (value: unknown) =>
  value == null || value === "" ? undefined : String(value);

function JobRow<TRecord extends ResourceRecord>({
  job,
  resource,
  fields,
  rules,
  actions,
  busy,
  onPlan,
}: {
  job: TRecord;
  resource: string;
  fields: Fields<TRecord>;
  rules: Rules<TRecord>;
  actions: boolean;
  busy: boolean;
  onPlan: (plan: JobPlan<TRecord> | null) => void;
}) {
  const translate = useTranslate();
  const [showPayload, setShowPayload] = useState(false);
  const { canAccess, isPending: isAccessPending } = useMenuAccess({
    action: "edit",
    resource,
    record: job,
  });

  const options: JobActionOptions<TRecord> = {
    statusSource: fields.statusSource,
    ...rules,
  };
  const { canRetry, canCancel } = getJobActions(job, options);
  const mayAct = actions && canAccess && !isAccessPending;
  const type = text(getAtPath(job, fields.typeSource));
  const error = text(getAtPath(job, fields.errorSource));
  const attempts = getAtPath(job, fields.attemptsSource);
  const payload = getAtPath(job, fields.payloadSource);
  const hasPayload = payload != null;
  const values: JobValues = {
    id: job.id,
    createdAt: getAtPath(job, fields.createdAtSource),
    payload,
  };

  return (
    <RecordContextProvider value={job}>
      <li
        data-slot="job-monitor-row"
        data-record-id={String(job.id)}
        className="flex flex-col gap-2 rounded-md border p-3 text-sm"
      >
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span data-slot="job-monitor-type" className="font-medium">
            {type ??
              translate("chelone.job_monitor.no_type", { _: "(no type)" })}
          </span>
          <span data-slot="job-monitor-id" className="text-muted-foreground">
            #{String(job.id)}
          </span>
          {attempts == null ? null : (
            <span
              data-slot="job-monitor-attempts"
              className="text-muted-foreground"
            >
              {translate("chelone.job_monitor.attempts", {
                attempts: String(attempts),
                _: "Attempts: {attempts}",
              })}
            </span>
          )}
          <DateField<JobValues>
            source="createdAt"
            record={values}
            showTime
            className="text-muted-foreground"
          />
          <span className="ml-auto flex gap-2">
            {hasPayload ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                aria-expanded={showPayload}
                onClick={() => setShowPayload((open) => !open)}
              >
                {showPayload
                  ? translate("chelone.job_monitor.hide_payload", {
                      _: "Hide payload",
                    })
                  : translate("chelone.job_monitor.show_payload", {
                      _: "Show payload",
                    })}
              </Button>
            ) : null}
            {mayAct && canRetry ? (
              <Button
                type="button"
                size="sm"
                data-slot="job-monitor-retry"
                disabled={busy}
                onClick={() => onPlan(planJobRetry<TRecord>(job, options))}
              >
                {translate("chelone.job_monitor.retry", { _: "Retry" })}
              </Button>
            ) : null}
            {mayAct && canCancel ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                data-slot="job-monitor-cancel"
                disabled={busy}
                onClick={() => onPlan(planJobCancel<TRecord>(job, options))}
              >
                {translate("chelone.action.cancel", { _: "Cancel" })}
              </Button>
            ) : null}
          </span>
        </div>
        {error ? (
          <p
            data-slot="job-monitor-last-error"
            className="text-destructive break-words"
          >
            {error}
          </p>
        ) : null}
        {hasPayload && showPayload ? (
          <JsonField<JobValues>
            source="payload"
            record={values}
            className="overflow-x-auto rounded-md bg-muted p-2 text-xs"
          />
        ) : null}
      </li>
    </RecordContextProvider>
  );
}

function JobMonitorBody<TRecord extends ResourceRecord>({
  resource,
  pollInterval = 5000,
  tabs = DEFAULT_JOB_TABS,
  statusSource,
  typeSource,
  payloadSource,
  errorSource,
  attemptsSource,
  createdAtSource,
  perPage = 200,
  sort,
  actions = true,
  retryFrom,
  cancelFrom,
  retryValue,
  cancelValue,
  title,
  className,
}: JobMonitorProps<TRecord> & { resource: string }) {
  const translate = useTranslate();
  const notify = useNotify();
  const status = jobStatusSource<TRecord>(statusSource);
  const createdSource = createdAtSource ?? "createdAt";
  // Owned here, not by a row: a row unmounts when its tab is left or a poll
  // moves the job, and an unmounted observer drops the notifications below.
  // One write at a time, so a second job's write cannot displace the first's.
  const { mutate, isPending: isWriting } = useUpdate<
    RecordResources<TRecord>,
    string
  >(resource, {
    mutationMode: "pessimistic",
  });
  const { data, isError } = useGetList<RecordResources<TRecord>, string>(
    resource,
    {
      pagination: { page: 1, perPage },
      sort: sort ?? { field: createdSource, order: "DESC" },
    },
    { refetchInterval: pollInterval },
  );
  const write = (plan: JobPlan<TRecord> | null) => {
    if (!plan) return;
    mutate(plan, {
      onSuccess: () =>
        notify("chelone.notification.updated", {
          type: "info",
          messageArgs: { smart_count: 1 },
        }),
      onError: (failure) => {
        console.error(failure);
        notify("chelone.notification.http_error", { type: "error" });
      },
    });
  };
  const fields: Fields<TRecord> = {
    statusSource: status,
    typeSource: typeSource ?? "type",
    payloadSource: payloadSource ?? "payload",
    errorSource: errorSource ?? "lastError",
    attemptsSource: attemptsSource ?? "attempts",
    createdAtSource: createdSource,
  };

  if (!data && !isError) return null;

  const buckets = buildKanbanBuckets(
    data?.data ?? [],
    status,
    tabs.map((id) => ({
      id,
      label: translate(`chelone.job_monitor.status.${id}`, { _: id }),
    })),
  );
  const first = buckets[0]?.column.id;

  return (
    <Card data-slot="job-monitor" className={cn("gap-4", className)}>
      <CardHeader>
        <CardTitle>
          {title ?? translate("chelone.job_monitor.title", { _: "Jobs" })}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {isError ? (
          <p data-slot="job-monitor-error" className="text-sm text-destructive">
            {translate("chelone.notification.http_error", {
              _: "Server communication error",
            })}
          </p>
        ) : null}
        {first === undefined ? null : (
          <Tabs defaultValue={first}>
            <TabsList>
              {buckets.map(({ column, records }) => (
                <TabsTrigger key={column.id} value={column.id}>
                  {column.label}
                  <Badge
                    data-slot="job-monitor-count"
                    variant="secondary"
                    className="ml-1"
                  >
                    {records.length}
                  </Badge>
                </TabsTrigger>
              ))}
            </TabsList>
            {buckets.map(({ column, records }) => (
              <TabsContent key={column.id} value={column.id}>
                {records.length === 0 ? (
                  <p className="py-2 text-sm text-muted-foreground">
                    {translate("chelone.job_monitor.empty", {
                      status: column.id,
                      _: "No {status} jobs",
                    })}
                  </p>
                ) : (
                  <ul className="flex flex-col gap-2">
                    {records.map((job) => (
                      <JobRow
                        key={job.id}
                        job={job}
                        resource={resource}
                        fields={fields}
                        rules={{
                          retryFrom,
                          cancelFrom,
                          retryValue,
                          cancelValue,
                        }}
                        actions={actions}
                        busy={isWriting}
                        onPlan={write}
                      />
                    ))}
                  </ul>
                )}
              </TabsContent>
            ))}
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * The jobs of a resource in one tab per status, with a count on each tab. It
 * reads the resource itself and again every `pollInterval` ms, so a job moves
 * to its new tab as soon as a poll sees its new status. Retry and Cancel write
 * the status through a pessimistic `update`; they are offered by the rules of
 * `getJobActions` and only to a user who may `edit` the resource. They are UI
 * rules: the server has to refuse a retry of a job that is not failed.
 *
 * Type, error and payload render as text, never as markup.
 *
 * @example
 * import { JobMonitor } from "@chelone/react";
 *
 * export const Dashboard = () => <JobMonitor resource="jobs" pollInterval={3000} />;
 */
function JobMonitor<TRecord extends ResourceRecord = LooseRecord>({
  resource: resourceProp,
  ...props
}: JobMonitorProps<TRecord>) {
  const resource = useResourceContext({ resource: resourceProp });
  if (!resource) return null;
  return <JobMonitorBody resource={resource} {...props} />;
}

export { JobMonitor };
