/**
 * `<BulkEditDrawer>` — types new values and applies them to every selected
 * record from a side sheet. Only the fields the user touched are sent, so an
 * untouched input never overwrites the rows. Ported from shadmin
 * `list/bulk-edit-drawer.tsx`, rebuilt on `useForm` because form-core has no
 * react-hook-form `dirtyFields`: the diff is read with core's
 * `getDirtyFormValues`.
 *
 * The apply path mirrors `<BulkUpdateButton>` pessimistic mode against the raw
 * `dataProvider.updateMany(resource, { ids, data })`: notify
 * `chelone.notification.updated`, `unselectAll`, `useRefresh`.
 */

import {
  getDirtyFormValues,
  type Identifier,
  type SourceScope,
} from "@chelone/core";
import { type ReactNode, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useDataProvider, useRefresh } from "../../../compat-hooks";
import { FormGroupsProvider, useListContext } from "../../../form";
import {
  CheloneFormProvider,
  SourceContextProvider,
} from "../../../form-context";
import { useForm } from "../../../form-hooks";
import { useTranslate } from "../../../i18n-hooks";
import { useNotify } from "../../../notification-hooks";
import { useResourceContext } from "../../../resource";

interface BulkEditDrawerProps {
  /** The inputs to edit with; their values become the patch for every row. */
  children: ReactNode;
  /** Trigger text. Default `"Edit selected"`. */
  label?: string;
  /** Sheet heading. Default `label`. */
  title?: string;
  disabled?: boolean;
  /** Edge the sheet slides in from. Default `"right"`. */
  side?: "top" | "right" | "bottom" | "left";
  /** Runs after a successful update with the sent fields and the updated ids. */
  onSuccess?: (diff: Record<string, unknown>, ids: Identifier[]) => void;
}

/**
 * Edits the touched fields of every selected record from a side sheet. Must be
 * used inside a `ListContext`, e.g. in `<DataTable bulkActionButtons>`.
 *
 * @example
 * import {
 *   BulkEditDrawer,
 *   DataTable,
 *   List,
 *   NumberInput,
 *   TextInput,
 * } from "@chelone/react";
 *
 * const PostList = () => (
 *   <List>
 *     <DataTable
 *       bulkActionButtons={
 *         <BulkEditDrawer>
 *           <TextInput source="category" />
 *           <NumberInput source="views" />
 *         </BulkEditDrawer>
 *       }
 *     >
 *       <DataTable.Col source="title" />
 *     </DataTable>
 *   </List>
 * );
 */
function BulkEditDrawer(props: BulkEditDrawerProps) {
  const {
    children,
    label: labelProp = "Edit selected",
    title: titleProp,
    disabled,
    side = "right",
    onSuccess,
  } = props;
  const [open, setOpen] = useState(false);
  const { selectedIds, unselectAll } = useListContext();
  const resource = useResourceContext();
  const translate = useTranslate();
  const dataProvider = useDataProvider();
  const refresh = useRefresh();
  const notify = useNotify();

  // `useForm` captures its options on first render, so `save` reads the
  // latest props through this ref.
  const latest = useRef({ selectedIds, resource, onSuccess });
  latest.current = { selectedIds, resource, onSuccess };

  const { form, submit, isSubmitting } = useForm<Record<string, unknown>>({
    defaultValues: {},
    resetOnSuccess: false,
    save: async () => {
      const {
        selectedIds: ids,
        resource: name,
        onSuccess: done,
      } = latest.current;
      const diff = getDirtyFormValues(
        form.store.state.values,
        form.store.state.fieldMeta,
      );
      if (!name || Object.keys(diff).length === 0) {
        close();
        return undefined;
      }
      try {
        await dataProvider.updateMany(name, {
          ids: ids as Identifier[],
          data: diff,
        });
      } catch (error) {
        console.error(error);
        notify("chelone.notification.http_error", { type: "error" });
        return undefined;
      }
      notify("chelone.notification.updated", {
        type: "info",
        messageArgs: { smart_count: ids.length },
      });
      unselectAll();
      refresh();
      done?.(diff, ids as Identifier[]);
      close();
      return undefined;
    },
  });

  function close() {
    setOpen(false);
    form.reset();
  }

  const sourceScope = useMemo<SourceScope>(
    () => ({
      getSource: (source: string) => source,
      getLabel: (source: string) =>
        resource ? `resources.${resource}.fields.${source}` : source,
    }),
    [resource],
  );

  const count = selectedIds.length;
  const label = translate(labelProp, { _: labelProp });
  const title = titleProp ? translate(titleProp, { _: titleProp }) : label;

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => (next ? setOpen(true) : close())}
    >
      <SheetTrigger asChild>
        <Button
          type="button"
          variant="outline"
          data-bulk-edit-trigger=""
          disabled={disabled || count === 0}
        >
          {label}
          {count > 0 ? ` (${count})` : null}
        </Button>
      </SheetTrigger>
      <SheetContent side={side} data-side={side}>
        <CheloneFormProvider form={form} submit={submit}>
          <FormGroupsProvider>
            <SourceContextProvider scope={sourceScope}>
              <form
                className="flex min-h-0 flex-1 flex-col gap-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  void submit();
                }}
              >
                <SheetHeader>
                  <SheetTitle>{title}</SheetTitle>
                  <SheetDescription>
                    {translate("ra.message.bulk_edit_description", {
                      smart_count: count,
                      _: "Only the fields you change are applied to {smart_count} selected record(s).",
                    })}
                  </SheetDescription>
                </SheetHeader>
                <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-4">
                  {children}
                </div>
                <SheetFooter>
                  <Button type="submit" disabled={isSubmitting}>
                    {translate("ra.action.bulk_edit_apply", {
                      smart_count: count,
                      _: "Apply to {smart_count} record(s)",
                    })}
                  </Button>
                  <Button type="button" variant="outline" onClick={close}>
                    {translate("ra.action.cancel", { _: "Cancel" })}
                  </Button>
                </SheetFooter>
              </form>
            </SourceContextProvider>
          </FormGroupsProvider>
        </CheloneFormProvider>
      </SheetContent>
    </Sheet>
  );
}

export { BulkEditDrawer, type BulkEditDrawerProps };
