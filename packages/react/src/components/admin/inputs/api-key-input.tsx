import type {
  LooseRecord,
  RecordResources,
  ResourceRecord,
  SourceProp,
} from "@chelone/core";
import { RefreshCw } from "lucide-react";
import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useUpdate } from "../../../hooks";
import { useRecordContext } from "../../../record/record-context";
import { useResourceContext } from "../../../resource";

/**
 * API-key rotation control. Renders a single Rotate button that opens a
 * confirmation dialog. On confirm, calls `onRotate(record)` if provided, or
 * dispatches the default update mutation
 * (`useUpdate(resource).mutateAsync({ id, data: { [source]: null }, previousData })`)
 * to trigger server-side regeneration.
 *
 * This input is NOT form-bound — it reads the ambient record and resource and
 * mutates the data provider directly (unlike the `useInput` text inputs). The
 * chelone rebridge maps ra-core's `useUpdate()` tuple + `update(resource, …)`
 * onto chelone's `useUpdate(resource)` TanStack mutation object + `mutateAsync`.
 *
 * @example
 * import { ApiKeyInput } from '@chelone/react';
 *
 * <ApiKeyInput source="apiKey" />
 * <ApiKeyInput source="apiKey" onRotate={async (record) => await regenKey(record.id)} />
 */
function ApiKeyInput<TRecord extends ResourceRecord = LooseRecord>(
  props: ApiKeyInputProps<TRecord>,
) {
  const { source, onRotate, disabled, resource: resourceProp } = props;
  const record = useRecordContext<TRecord>();
  const resource = useResourceContext({ resource: resourceProp });
  // `useUpdate` binds the resource at hook-call time; guard the actual dispatch
  // on `record && resource` below. An empty string is a harmless placeholder
  // when no ambient resource exists — the mutation is never fired in that case.
  const update = useUpdate<RecordResources<TRecord>, string>(resource ?? "");
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  const handleRotate = async () => {
    setPending(true);
    try {
      if (onRotate && record) {
        await onRotate(record);
      } else if (record && resource) {
        await update.mutateAsync({
          id: record.id,
          // type-escape: builder: `source` is a path of TRecord, so a null written there is a patch of it; the compiler cannot see through a computed key
          data: { [source]: null } as Partial<TRecord>,
          previousData: record,
        });
      }
    } finally {
      setPending(false);
      setOpen(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          data-rotate-button
          disabled={disabled}
        >
          <RefreshCw />
          Rotate
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Rotate API key?</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure? The current key will be revoked immediately. Any
            integrations still using it will break until they're updated.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleRotate} disabled={pending}>
            {pending ? "Rotating…" : "Rotate"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

interface ApiKeyInputProps<TRecord extends ResourceRecord = LooseRecord> {
  /** Record field holding the API key. */
  source: SourceProp<TRecord>;
  /** Override resource. */
  resource?: string;
  /** Async side-effect on rotate. When provided, replaces the default update mutation. */
  onRotate?: (record: TRecord) => Promise<void> | void;
  /** Disable the button. */
  disabled?: boolean;
}

export { ApiKeyInput, type ApiKeyInputProps };
