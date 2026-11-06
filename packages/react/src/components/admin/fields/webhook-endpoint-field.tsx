import type { LooseRecord } from "@chelone/core";
import type { HTMLAttributes } from "react";
import type { ElementFieldProps } from "@/lib/field-types";
import { cn } from "@/lib/utils";
import { useFieldValue } from "../../../record/use-field-value";
import { sanitizeFieldRestProps } from "../../../util/sanitize-field-rest-props";

type DeliveryStatus = "ok" | "failed" | "pending";

interface WebhookEndpoint {
  url: string;
  secret: string;
  eventTypes: readonly string[];
  lastDelivery?: {
    status: DeliveryStatus;
    at: string;
  };
}

const isWebhookEndpoint = (value: unknown): value is WebhookEndpoint =>
  typeof value === "object" &&
  value !== null &&
  "url" in value &&
  typeof value.url === "string";

interface WebhookEndpointFieldProps<
  RecordType extends LooseRecord = LooseRecord,
> extends ElementFieldProps<RecordType, HTMLAttributes<HTMLSpanElement>> {}

/**
 * Displays a webhook endpoint's URL and last-delivery status badge.
 * The signing secret is never rendered.
 *
 * @example
 * <WebhookEndpointField source="endpoint" />
 */
function WebhookEndpointField<RecordType extends LooseRecord = LooseRecord>({
  defaultValue,
  source,
  record,
  className,
  ...rest
}: WebhookEndpointFieldProps<RecordType>) {
  const value = useFieldValue({
    defaultValue,
    source,
    record,
  });

  if (!isWebhookEndpoint(value)) return null;
  const endpoint = value;
  const status: DeliveryStatus = endpoint.lastDelivery?.status ?? "pending";

  return (
    <span
      {...sanitizeFieldRestProps(rest)}
      className={cn("inline-flex items-center gap-2", className)}
    >
      <span className="font-mono text-sm">{endpoint.url}</span>
      <span
        data-webhook-status
        data-status={status}
        className={cn(
          "rounded px-2 py-0.5 text-xs font-medium",
          status === "ok" && "bg-green-500/10 text-green-700",
          status === "failed" && "bg-red-500/10 text-red-700",
          status === "pending" && "bg-muted text-muted-foreground",
        )}
      >
        {status.toUpperCase()}
      </span>
    </span>
  );
}

export {
  type WebhookEndpoint,
  WebhookEndpointField,
  type WebhookEndpointFieldProps,
};
