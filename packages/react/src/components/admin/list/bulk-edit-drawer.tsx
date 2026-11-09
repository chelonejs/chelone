/**
 * `<BulkEditDrawer>` — types new values and applies them to every selected
 * record from a side sheet. Only the fields the user touched are sent, so an
 * untouched input never overwrites the rows. Ported from shadmin
 * `list/bulk-edit-drawer.tsx`, rebuilt on `useForm` because form-core has no
 * react-hook-form `dirtyFields`: the diff is read with core's
 * `getDirtyFormValues`.
 *
 * Flat sources only: a nested source (`address.city`, `tags[1]`) is refused
 * with an error, since the empty form would send a partial object that
 * overwrites the stored one on every row.
 *
 * The apply path mirrors `<BulkUpdateButton>` pessimistic mode through
 * `useUpdateMany(resource)`: notify
 * `chelone.notification.updated`, `unselectAll`, `useRefresh`.
 */

import { getDirtyFormValues, type Identifier } from "@chelone/core";
import { type ReactNode, useRef, useState } from "react";
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
import { useRefresh } from "../../../compat-hooks";
import { FormGroupsProvider, useListContext } from "../../../form";
import {
  CheloneFormProvider,
  SourceContextProvider,
  useResourceSourceScope,
} from "../../../form-context";
import { useForm } from "../../../form-hooks";
import { useUpdateMany } from "../../../hooks";
import { useTranslate } from "../../../i18n-hooks";
import { useNotify } from "../../../notification-hooks";
import { useResourceContext } from "../../../resource";

interface BulkEditDrawerProps {
  /**
   * The inputs to edit with; their values become the patch for every row. Flat
   * sources only: applying with a dirty nested source (`address.city`,
   * `tags[1]`) notifies an error and calls nothing.
   */
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
  const refresh = useRefresh();
  const notify = useNotify();
  const { mutateAsync } = useUpdateMany(resource ?? "");

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
      // The form starts empty, so a dirty `address.city` holds only the typed
      // subfield; `updateMany` would replace the stored `address` with it.
      const nested = Object.entries(form.store.state.fieldMeta).find(
        ([path, meta]) => meta?.isDirty && /[.[]/.test(path),
      );
      if (nested) {
        notify("chelone.message.bulk_edit_nested_source", {
          type: "error",
          messageArgs: {
            source: nested[0],
            _: "Bulk edit takes flat sources only, but {source} is nested.",
          },
        });
        return undefined;
      }
      const diff = getDirtyFormValues(
        form.store.state.values,
        form.store.state.fieldMeta,
      );
      if (!name || Object.keys(diff).length === 0) {
        close();
        return undefined;
      }
      try {
        await mutateAsync({ ids, data: diff });
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
      done?.(diff, ids);
      close();
      return undefined;
    },
  });

  function close() {
    setOpen(false);
    form.reset();
  }

  const sourceScope = useResourceSourceScope(resource);

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
                    {translate("chelone.message.bulk_edit_description", {
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
                    {translate("chelone.action.bulk_edit_apply", {
                      smart_count: count,
                      _: "Apply to {smart_count} record(s)",
                    })}
                  </Button>
                  <Button type="button" variant="outline" onClick={close}>
                    {translate("chelone.action.cancel", { _: "Cancel" })}
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
