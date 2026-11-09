/**
 * P7e-T2 — `<Edit>` ported from shadmin `admin/views/edit.tsx` onto chelone's
 * COMPOSED `useEditForm` (record hydration + form + submit in one controller —
 * NOT ra-core's `EditBase`).
 *
 * The shell: reads the record `id` from the route params, runs `useEditForm`
 * for the ambient `<Resource>` resource, and publishes the result into the full
 * ambient stack a shadmin `<EditBase>` layered (parity with ra's
 * `EditContextProvider`):
 *   `EditContext` (view fields) → `SaveContext` (save buttons / toolbar) →
 *   `RecordContext` (record the fields default to) → `CheloneFormProvider`
 *   (the ambient form `useInput` binds to). So a bare `<TextInput>` child works
 *   directly.
 *
 * Chelone divergences (deliberate):
 * - No `<EditBase>`: the composed `useEditForm` fetches + hydrates + owns the
 *   form; the view mounts every provider itself.
 * - `SaveContext.save(data)` is the compat bridge over the composed pipeline:
 *   it writes `data` into the ambient form then runs the composed `submit()`
 *   (validate → persist → reconcile). A chelone save button reads the current
 *   form values (the inputs already wrote them), so `data` == the form values;
 *   the bridge also serves a programmatic `save(explicitData)`.
 * - Breadcrumb + the default `<ShowButton>`/`<DeleteButton>` actions are
 *   LAYOUT/BUTTONS chrome from later waves — the `title`/`actions` props remain
 *   the seams (`actions` defaults to nothing). `defaultTitle` is COMPUTED here
 *   from the record representation (chelone controllers don't carry it).
 */

import {
  type EditFormControllerOptions,
  type Identifier,
  isResourceRecord,
  type LooseRecord,
  type RecordResources,
  setFormValues,
} from "@chelone/core";
import { type ReactNode, useCallback, useMemo, useRef } from "react";
import { cn } from "@/lib/utils";
import { CheloneFormProvider } from "../../../form-context";
import { useEditForm } from "../../../form-hooks";
import { useGetRecordRepresentation } from "../../../label";
import { RecordContextProvider } from "../../../record/record-context";
import {
  EditContextProvider,
  type EditContextValue,
  useEditContext,
} from "../../../record-view-context";
import { ResourceContextProvider, useResourceContext } from "../../../resource";
import { useParams } from "../../../router";
import {
  SaveContextProvider,
  type SaveContextValue,
  type SaveHandler,
} from "../../../save-context";

/**
 * `validate` and `onSuccess` run as of the latest render. `schema` and
 * `sanitizeEmptyValues` are read once, at mount: remount with a `key` to change them.
 */
export interface EditProps<TRecord = LooseRecord>
  extends Pick<
    EditFormControllerOptions<TRecord>,
    "validate" | "schema" | "sanitizeEmptyValues" | "onSuccess"
  > {
  /** Override the ambient resource (defaults to the `<Resource>` context). */
  resource?: string;
  /** Override the record id (defaults to the `:id` route param). */
  id?: Identifier;
  children?: ReactNode;
  component?: React.ElementType;
  /** Header actions (show/delete buttons); nothing by default. */
  actions?: ReactNode | false;
  /** Header title. A string/element renders as an `<h2>`; `false` omits it. */
  title?: ReactNode | string | false;
  className?: string;
}

/**
 * An edit page: fetches + hydrates the record via `useEditForm`, publishes the
 * edit/save/record/form contexts, and renders a title + children (a form).
 *
 * @example
 * import { Edit, TextInput } from "@chelone/react";
 *
 * export const PostEdit = () => (
 *   <Edit>
 *     <TextInput source="title" />
 *   </Edit>
 * );
 */
function Edit<TRecord = LooseRecord>(props: EditProps<TRecord>) {
  const {
    resource: resourceProp,
    id: idProp,
    validate,
    schema,
    sanitizeEmptyValues,
    onSuccess,
    children,
    ...viewProps
  } = props;
  const contextResource = useResourceContext();
  const resource = resourceProp ?? contextResource;
  if (!resource) {
    throw new Error(
      "The Edit component must be used within a ResourceContextProvider or given a `resource` prop",
    );
  }
  const params = useParams();
  const id = idProp ?? params.id;
  if (id === undefined) {
    throw new Error(
      "The Edit component needs an `id` prop or a route with an `:id` param",
    );
  }

  // The controller captures its options once, so it always gets these two
  // wrappers (a callback added after mount still runs) and they read the
  // latest render's callbacks through the ref.
  const latest = useRef({ validate, onSuccess });
  latest.current = { validate, onSuccess };
  const controller = useEditForm<RecordResources<TRecord>, string>(resource, {
    id,
    validate: (values) => latest.current.validate?.(values),
    schema,
    sanitizeEmptyValues,
    onSuccess: (record) => latest.current.onSuccess?.(record),
  });
  const { form, submit, record } = controller;

  const getRecordRepresentation = useGetRecordRepresentation(resource);
  const defaultTitle = isResourceRecord(record)
    ? String(getRecordRepresentation(record) ?? "")
    : "";

  // The compat save bridge: write `data` into the ambient form, then run the
  // composed submit pipeline (validate → persist → reconcile). Errors surface
  // on the form store (fieldState), so this resolves `undefined`.
  const save = useCallback<SaveHandler<TRecord>>(
    async (data, options) => {
      setFormValues(form, data);
      await submit(options);
      return undefined;
    },
    [form, submit],
  );

  const editValue = useMemo<EditContextValue<TRecord>>(
    () => ({
      record: controller.record,
      isPending: controller.isPending,
      isFetching: controller.isFetching,
      error: controller.error,
      saving: controller.isSubmitting,
      resource,
      defaultTitle,
      save,
      mutationMode: "pessimistic",
    }),
    [controller, resource, defaultTitle, save],
  );

  const saveValue = useMemo<SaveContextValue<TRecord>>(
    () => ({
      save,
      saving: controller.isSubmitting,
      mutationMode: "pessimistic",
    }),
    [save, controller.isSubmitting],
  );

  return (
    <ResourceContextProvider value={resource}>
      <EditContextProvider value={editValue}>
        <SaveContextProvider value={saveValue}>
          <RecordContextProvider value={record}>
            <CheloneFormProvider
              form={form}
              resource={resource}
              submit={submit}
            >
              <EditView {...viewProps}>{children}</EditView>
            </CheloneFormProvider>
          </RecordContextProvider>
        </SaveContextProvider>
      </EditContextProvider>
    </ResourceContextProvider>
  );
}

interface EditViewProps {
  children?: ReactNode;
  component?: React.ElementType;
  actions?: ReactNode | false;
  title?: ReactNode | string | false;
  className?: string;
}

/**
 * The edit layout: title + actions header, then the children (only once the
 * record has hydrated — parity with shadmin's `context.record ? children`).
 * @internal
 */
function EditView(props: EditViewProps) {
  const {
    component: Wrapper = "div",
    title,
    actions,
    children,
    className,
  } = props;
  const context = useEditContext();

  const resolvedActions = actions === false ? null : (actions ?? null);

  return (
    <>
      <div
        className={cn(
          "flex justify-between items-start flex-wrap gap-2 my-2",
          className,
        )}
      >
        {title !== false && (
          <h2 className="text-2xl font-bold tracking-tight">
            {title !== undefined ? title : context.defaultTitle}
          </h2>
        )}
        {resolvedActions}
      </div>
      <Wrapper className="my-2 space-y-4">
        {context.record ? children : null}
      </Wrapper>
    </>
  );
}

export { Edit, EditView, type EditViewProps };
