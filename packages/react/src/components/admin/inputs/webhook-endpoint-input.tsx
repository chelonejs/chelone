import {
  type LooseRecord,
  type SourceProp,
  toWebhookValue,
  type WebhookValue,
} from "@chelone/core";
import { useState } from "react";
import { FieldLabelText } from "@/components/admin/common/field-label-text";
import { InputHelperText } from "@/components/admin/common/input-helper-text";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { ValidationError } from "../../../field-error-display";
import { type UseInputOptions, useInput } from "../../../form-hooks";
import { useResourceContext } from "../../../resource";
import type { InputProps } from "../input-props";

/**
 * Storage shape a `<WebhookEndpointInput>` edits. Inlined here (the shadmin
 * source imported it from a sibling `webhook-endpoint-field`; that field is not
 * yet ported to @chelone/react) and re-exported for typing form values.
 */
interface WebhookEndpoint {
  url: string;
  secret: string;
  eventTypes: readonly string[];
  lastDelivery?: {
    status: "ok" | "failed" | "pending";
    at: string;
  };
}

const DEFAULT_VALUE: WebhookEndpoint = {
  url: "",
  secret: "",
  eventTypes: [],
};

/** `options` with the empty endpoint as its `defaultValue` when it has none (`null` counts as none). */
function withEmptyEndpoint(options: Pick<UseInputOptions, "defaultValue">) {
  return { ...options, defaultValue: options.defaultValue ?? DEFAULT_VALUE };
}

/**
 * Composite input for a webhook endpoint. Edits the URL, signing secret, and
 * event-type subscriptions. Optionally renders a test-ping button.
 *
 * Storage shape: `{ url, secret, eventTypes, lastDelivery? }`.
 *
 * @example
 * import { WebhookEndpointInput } from '@chelone/react';
 *
 * <WebhookEndpointInput source="endpoint" eventTypes={EVENT_TYPES} />
 */
// The props carry the record and path generics; the component itself reads them
// at their defaults, as `<TextInput>` and `<BooleanInput>` do: `DEFAULT_VALUE`
// is the endpoint this input edits, which no `SourceValue` of an unresolved
// record can name.
function WebhookEndpointInput(props: WebhookEndpointInputProps) {
  const {
    label,
    source,
    className,
    resource: resourceProp,
    helperText,
    eventTypes,
    onTestPing,
    disabled,
    ...inputProps
  } = props;
  const resource = useResourceContext({ resource: resourceProp });

  const { id, field, fieldState, isRequired } = useInput({
    ...withEmptyEndpoint(inputProps),
    source,
  });

  const invalid = fieldState.invalid;
  // chelone `fieldState.error` is ALREADY the displayable
  // `string | TranslatableMessage | undefined` — no RHF `error?.root?.message`.
  const error = fieldState.error;

  // Normalize against a partial/nullish stored value so the composite render
  // never dereferences a missing sub-field (e.g. a required-validated `null`).
  const value = toWebhookValue(field.value);

  const [pinging, setPinging] = useState(false);

  const update = (patch: Partial<WebhookValue>) => {
    field.onChange({ ...value, ...patch });
  };

  const toggleEvent = (event: string, checked: boolean) => {
    const set = new Set(value.eventTypes);
    if (checked) set.add(event);
    else set.delete(event);
    update({ eventTypes: Array.from(set) });
  };

  const handlePing = async () => {
    if (!onTestPing) return;
    setPinging(true);
    try {
      await onTestPing(value.url, value.secret);
    } finally {
      setPinging(false);
    }
  };

  return (
    <Field className={className} data-invalid={invalid || undefined}>
      {label !== false && (
        <FieldLabel htmlFor={id}>
          <FieldLabelText
            label={label}
            source={source}
            resource={resource}
            isRequired={isRequired}
          />
        </FieldLabel>
      )}
      <div className={cn("flex flex-col gap-3", className)}>
        <Input
          type="url"
          data-webhook-url
          value={value.url}
          onChange={(e) => update({ url: e.target.value })}
          onBlur={field.onBlur}
          disabled={disabled}
          placeholder="https://example.com/webhook"
          id={id}
          aria-invalid={invalid || undefined}
        />
        <Input
          type="password"
          data-webhook-secret
          aria-label="Signing secret"
          value={value.secret}
          onChange={(e) => update({ secret: e.target.value })}
          disabled={disabled}
          placeholder="Signing secret"
        />
        <div className="flex flex-wrap gap-3">
          {eventTypes.map((event) => (
            <label
              key={event}
              htmlFor={`webhook-event-${event}`}
              className="flex items-center gap-2 font-mono text-sm"
            >
              <Checkbox
                id={`webhook-event-${event}`}
                data-event-checkbox
                checked={value.eventTypes.includes(event)}
                onCheckedChange={(c) => toggleEvent(event, c === true)}
                disabled={disabled}
              />
              {event}
            </label>
          ))}
        </div>
        {onTestPing && (
          <Button
            type="button"
            variant="outline"
            data-test-ping-button
            onClick={handlePing}
            disabled={disabled || pinging || !value.url}
          >
            {pinging ? "Pinging…" : "Send test ping"}
          </Button>
        )}
      </div>
      <InputHelperText helperText={helperText} />
      <FieldError>
        {invalid && error ? <ValidationError error={error} /> : null}
      </FieldError>
    </Field>
  );
}

interface WebhookEndpointInputProps<
  TRecord = LooseRecord,
  TPath extends SourceProp<TRecord> = SourceProp<TRecord>,
> extends InputProps<TRecord, TPath> {
  /** Available event-type strings to surface as checkboxes. */
  eventTypes: readonly string[];
  /** Optional test-ping handler. When set, renders the test-ping button. */
  onTestPing?: (url: string, secret: string) => Promise<void> | void;
  disabled?: boolean;
  className?: string;
}

export {
  type WebhookEndpoint,
  WebhookEndpointInput,
  type WebhookEndpointInputProps,
};
