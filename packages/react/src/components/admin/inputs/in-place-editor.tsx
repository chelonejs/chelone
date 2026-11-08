/**
 * `<InPlaceEditor>`: shows a record value and turns it into an input on click.
 * The change goes out with `useUpdate`, and the new value shows, busy, until
 * the update answers. Ported from shadmin `widgets/in-place-editor.tsx` and
 * rebuilt on `useForm`: the state steps and the save plan come from core
 * (`nextInPlaceEditorState`, `planInPlaceSave`), and the form diff is read with
 * `getDirtyFormValues`. shadmin's `mutationOptions` becomes the `meta`,
 * `onSuccess` and `onError` props.
 */

import {
  getDirtyFormValues,
  type InPlaceEditorState,
  type LooseRecord,
  type MutationMode,
  nextInPlaceEditorState,
  planInPlaceSave,
  type RecordResources,
  type ResourceRecord,
  type SourceProp,
} from "@chelone/core";
import {
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
  type RefObject,
  useReducer,
  useRef,
  useState,
} from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { FormGroupsProvider } from "../../../form";
import {
  CheloneFormProvider,
  SourceContextProvider,
  useResourceSourceScope,
} from "../../../form-context";
import { useForm } from "../../../form-hooks";
import { useUpdate } from "../../../hooks";
import { useTranslate } from "../../../i18n-hooks";
import { useNotify } from "../../../notification-hooks";
import {
  RecordContextProvider,
  useRecordContext,
} from "../../../record/record-context";
import { useResourceContext } from "../../../resource";
import { TextField } from "../fields/text-field";
import { useMenuAccess } from "../layout/use-menu-access";
import { TextInput } from "./text-input";

interface InPlaceEditorProps<TRecord extends ResourceRecord = LooseRecord> {
  /**
   * The field to show and edit. Required unless both `children` and `editor`
   * are given.
   */
  source?: SourceProp<TRecord>;
  /** What to show while reading and saving. Default `<TextField source={source} />`. */
  children?: ReactNode;
  /**
   * What to edit with, inside the form. Default
   * `<TextInput source={source} label={false} helperText={false} autoFocus />`.
   */
  editor?: ReactNode;
  /** Default is `useUpdate`'s own. */
  mutationMode?: MutationMode;
  /** Sent with the update. */
  // type-escape: an app's opaque bag, which only its data provider reads
  meta?: Record<string, unknown>;
  /** Cancel on a focus move out of the editor; when false, save instead. Default `true`. */
  cancelOnBlur?: boolean;
  /** Show Save and Cancel buttons beside the input. Default `false`. */
  showButtons?: boolean;
  /** Notify `chelone.notification.updated` on success. Undoable mode always notifies, with Undo. Default `false`. */
  notifyOnSuccess?: boolean;
  /** Runs with the saved record after a successful update. */
  onSuccess?: (record: TRecord) => void;
  /** Runs with the failure after a rejected update. */
  // type-escape: a rejection can be anything the data provider threw
  onError?: (error: unknown) => void;
  /** Override the ambient resource. */
  resource?: string;
  className?: string;
}

/**
 * Edits one value where it is shown. Needs a record, from `<Show>`, a
 * `<DataTable>` row or a `RecordContextProvider`, and `edit` access to the
 * resource: without it the value shows and cannot be clicked.
 *
 * @example
 * import { InPlaceEditor, Show } from "@chelone/react";
 *
 * const PostShow = () => (
 *   <Show>
 *     <InPlaceEditor source="title" />
 *   </Show>
 * );
 */
function InPlaceEditor<TRecord extends ResourceRecord = LooseRecord>(
  props: InPlaceEditorProps<TRecord>,
) {
  const {
    source,
    children: childrenProp,
    editor: editorProp,
    mutationMode,
    meta,
    cancelOnBlur = true,
    showButtons = false,
    notifyOnSuccess = false,
    onSuccess,
    onError,
    className,
  } = props;
  if (source === undefined && (!childrenProp || !editorProp)) {
    const missing = [
      source === undefined && "`source`",
      !childrenProp && "`children`",
      !editorProp && "`editor`",
    ].filter((name) => name !== false);
    throw new Error(
      `<InPlaceEditor> needs a \`source\`, or both \`children\` and \`editor\`: ${missing.join(", ")} missing`,
    );
  }
  const record = useRecordContext<TRecord>();
  const resource = useResourceContext(props);
  const translate = useTranslate();
  const notify = useNotify();
  const root = useRef<HTMLDivElement>(null);
  const [state, dispatch] = useReducer(nextInPlaceEditorState<TRecord>, {
    status: "reading",
  } satisfies InPlaceEditorState<TRecord>);
  const { canAccess, isPending: isAccessPending } = useMenuAccess({
    action: "edit",
    resource: resource ?? "",
    record,
  });
  const { mutate } = useUpdate<RecordResources<TRecord>, string>(
    resource ?? "",
    {
      mutationMode,
    },
  );

  // `source` is set here whenever a default is used: the check above threw otherwise.
  const children =
    childrenProp ??
    (source === undefined ? null : <TextField source={source} />);
  const editor =
    editorProp ??
    (source === undefined ? null : (
      <TextInput source={source} label={false} helperText={false} autoFocus />
    ));

  const save = (before: TRecord, dirty: Partial<TRecord>) => {
    const plan = planInPlaceSave(before, dirty);
    if (!plan) {
      dispatch({ type: "cancel" });
      return;
    }
    dispatch({ type: "save", preview: plan.preview });
    mutate(
      {
        id: plan.id,
        data: plan.data,
        previousData: plan.previousData,
        meta,
      },
      {
        onSuccess: (saved) => {
          dispatch({ type: "settled" });
          if (notifyOnSuccess && mutationMode !== "undoable") {
            notify("chelone.notification.updated", {
              type: "info",
              messageArgs: { smart_count: 1 },
            });
          }
          onSuccess?.(saved);
        },
        onError: (error) => {
          dispatch({ type: "settled" });
          // The undoable runner already notifies when its deferred commit fails.
          if (mutationMode !== "undoable") {
            notify("chelone.notification.http_error", { type: "error" });
          }
          onError?.(error);
        },
      },
    );
  };

  const edit = (event: MouseEvent | KeyboardEvent) => {
    event.stopPropagation();
    dispatch({ type: "edit" });
  };

  const readOnly = !record || !resource || isAccessPending || !canAccess;

  return (
    <div data-slot="in-place-editor" ref={root} className={className}>
      {state.status === "editing" && record ? (
        <InPlaceEditorForm
          record={record}
          resource={resource}
          root={root}
          cancelOnBlur={cancelOnBlur}
          showButtons={showButtons}
          onSave={save}
          onCancel={() => dispatch({ type: "cancel" })}
        >
          {editor}
        </InPlaceEditorForm>
      ) : state.status === "saving" ? (
        <div data-slot="in-place-editor-saving" aria-busy="true">
          <RecordContextProvider value={state.preview}>
            {children}
          </RecordContextProvider>
        </div>
      ) : readOnly ? (
        children
      ) : (
        // biome-ignore lint/a11y/useSemanticElements: the value can hold links and block content, which a <button> cannot
        <div
          role="button"
          tabIndex={0}
          data-slot="in-place-editor-reading"
          aria-label={translate("chelone.action.edit", { _: "Edit" })}
          className={cn("cursor-pointer")}
          onClick={edit}
          onKeyDown={(event) => {
            if (event.target !== event.currentTarget) return;
            if (event.key !== "Enter" && event.key !== " ") return;
            event.preventDefault();
            edit(event);
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
}

interface InPlaceEditorFormProps<TRecord extends ResourceRecord> {
  record: TRecord;
  resource: string | undefined;
  root: RefObject<HTMLDivElement | null>;
  cancelOnBlur: boolean;
  showButtons: boolean;
  onSave: (before: TRecord, dirty: Partial<TRecord>) => void;
  onCancel: () => void;
  children: ReactNode;
}

/**
 * The editing state. It mounts when editing starts and holds the form, so the
 * form starts from the record as it is then and never carries an edit over.
 */
function InPlaceEditorForm<TRecord extends ResourceRecord>(
  props: InPlaceEditorFormProps<TRecord>,
) {
  const {
    record,
    resource,
    root,
    cancelOnBlur,
    showButtons,
    onSave,
    onCancel,
    children,
  } = props;
  const translate = useTranslate();
  const [before] = useState(record);
  // `useForm` captures its options on first render, so `save` reads the
  // latest callback through this ref.
  const latest = useRef(onSave);
  latest.current = onSave;

  const { form, submit } = useForm<TRecord>({
    defaultValues: before,
    resetOnSuccess: false,
    save: async () => {
      latest.current(
        before,
        getDirtyFormValues(form.store.state.values, form.store.state.fieldMeta),
      );
      return undefined;
    },
  });

  const sourceScope = useResourceSourceScope(resource);

  // A button must not take focus from the input before its click, or the blur
  // would cancel the edit.
  const keepFocus = (event: MouseEvent) => event.preventDefault();

  return (
    <CheloneFormProvider form={form} submit={submit}>
      <FormGroupsProvider>
        <SourceContextProvider scope={sourceScope}>
          <form
            data-slot="in-place-editor-editing"
            className="flex items-center gap-2 [&>:first-child]:min-w-0 [&>:first-child]:flex-1"
            onClick={(event) => event.stopPropagation()}
            onSubmit={(event) => {
              event.preventDefault();
              event.stopPropagation();
              void submit();
            }}
            onKeyDown={(event) => {
              if (event.key !== "Escape") return;
              event.preventDefault();
              event.stopPropagation();
              onCancel();
            }}
            onBlur={(event) => {
              const next = event.relatedTarget;
              if (next instanceof Node && root.current?.contains(next)) return;
              if (cancelOnBlur) onCancel();
              else void submit();
            }}
          >
            {children}
            {showButtons ? (
              <>
                <Button
                  type="submit"
                  size="sm"
                  aria-label={translate("chelone.action.save", { _: "Save" })}
                  onMouseDown={keepFocus}
                >
                  {translate("chelone.action.save", { _: "Save" })}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  aria-label={translate("chelone.action.cancel", {
                    _: "Cancel",
                  })}
                  onMouseDown={keepFocus}
                  onClick={onCancel}
                >
                  {translate("chelone.action.cancel", { _: "Cancel" })}
                </Button>
              </>
            ) : null}
          </form>
        </SourceContextProvider>
      </FormGroupsProvider>
    </CheloneFormProvider>
  );
}

export { InPlaceEditor, type InPlaceEditorProps };
