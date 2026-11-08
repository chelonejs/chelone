/**
 * P7e-T2 — `<Create>` ported from shadmin `admin/views/create.tsx` onto
 * chelone's COMPOSED `useCreateForm` (seed record + form + submit — NOT
 * ra-core's `CreateBase`).
 *
 * The shell: runs `useCreateForm` for the ambient `<Resource>` resource (seeded
 * by an optional `record` prop) and publishes the result into the full ambient
 * stack a shadmin `<CreateBase>` layered (parity with ra's
 * `CreateContextProvider`):
 *   `CreateContext` → `SaveContext` (mutationMode pessimistic) →
 *   `RecordContext` (the id-less seed) → `CheloneFormProvider`. So a bare
 *   `<TextInput>` child binds to the form directly.
 *
 * Chelone divergences mirror `<Edit>`: no `<CreateBase>` (composed
 * `useCreateForm`), the `SaveContext.save(data)` compat bridge over `submit()`,
 * and breadcrumb/button chrome deferred to later waves (`title`/`actions` are
 * the seams; `actions` defaults to nothing). `defaultTitle` is COMPUTED from
 * the resource label (`chelone.page.create`).
 */

import {
  type CreateFormControllerOptions,
  getRecordFromLocation,
  type LooseRecord,
  type RecordResources,
  setFormValues,
} from "@chelone/core";
import {
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import { cn } from "@/lib/utils";
import { CheloneFormProvider } from "../../../form-context";
import { useCreateForm } from "../../../form-hooks";
import { useTranslate } from "../../../i18n-hooks";
import { useGetResourceLabel } from "../../../label";
import { RecordContextProvider } from "../../../record/record-context";
import {
  CreateContextProvider,
  type CreateContextValue,
  useCreateContext,
} from "../../../record-view-context";
import { useResourceContext } from "../../../resource";
import { RouterAdapterContext } from "../../../router/adapter";
import {
  SaveContextProvider,
  type SaveContextValue,
  type SaveHandler,
} from "../../../save-context";

// Adapter presence is mount-stable (see `useRedirectOptional`), so the
// conditional `useLocation` call keeps hook order. The location is read once:
// the form is seeded at mount, like `record`.
function useRecordFromLocationOnce(): Record<string, unknown> | null {
  const adapter = useContext(RouterAdapterContext);
  // biome-ignore lint/correctness/useHookAtTopLevel: adapter presence is mount-stable.
  const location = adapter ? adapter.useLocation() : null;
  const [seed] = useState(() =>
    location ? getRecordFromLocation(location) : null,
  );
  return seed;
}

/**
 * `validate` and `onSuccess` run as of the latest render. `schema` and
 * `sanitizeEmptyValues` are read once, at mount: remount with a `key` to change them.
 * The location's `?source=` JSON (what `<CloneButton>` writes) also seeds the
 * form at mount, and its keys win over `record`.
 */
export interface CreateProps<TRecord = LooseRecord>
  extends Pick<
    CreateFormControllerOptions<TRecord>,
    "validate" | "schema" | "sanitizeEmptyValues" | "onSuccess"
  > {
  /** Override the ambient resource (defaults to the `<Resource>` context). */
  resource?: string;
  /** Seed values for the not-yet-created record. */
  record?: Partial<TRecord>;
  children?: ReactNode;
  component?: React.ElementType;
  /** Header actions; nothing by default. */
  actions?: ReactNode | false;
  /** Header title. A string/element renders as an `<h2>`; `false` omits it. */
  title?: ReactNode | string | false;
  className?: string;
}

/**
 * A create page: constructs the form via `useCreateForm`, publishes the
 * create/save/record/form contexts, and renders a title + children (a form).
 *
 * @example
 * import { Create, TextInput } from "@chelone/react";
 *
 * export const PostCreate = () => (
 *   <Create>
 *     <TextInput source="title" />
 *   </Create>
 * );
 */
function Create<TRecord = LooseRecord>(props: CreateProps<TRecord>) {
  const {
    resource: resourceProp,
    record,
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
      "The Create component must be used within a ResourceContextProvider or given a `resource` prop",
    );
  }

  const recordFromLocation = useRecordFromLocationOnce();

  // The controller captures its options once, so it always gets these two
  // wrappers (a callback added after mount still runs) and they read the
  // latest render's callbacks through the ref.
  const latest = useRef({ validate, onSuccess });
  latest.current = { validate, onSuccess };
  const merged = { ...record, ...recordFromLocation };
  // type-escape: the location's `?source=` JSON is untyped, and the form seeds from it as it does from `record`
  const seed = recordFromLocation ? (merged as Partial<TRecord>) : record;
  const controller = useCreateForm<RecordResources<TRecord>, string>(resource, {
    record: seed,
    validate: (values) => latest.current.validate?.(values),
    schema,
    sanitizeEmptyValues,
    onSuccess: (saved) => latest.current.onSuccess?.(saved),
  });
  const { form, submit } = controller;

  const translate = useTranslate();
  const getResourceLabel = useGetResourceLabel();
  const defaultTitle = translate("chelone.page.create", {
    name: getResourceLabel(resource, 1),
  });

  // The compat save bridge — same shape as `<Edit>`: write `data` into the
  // ambient form, then run the composed create pipeline.
  const save = useCallback<SaveHandler<TRecord>>(
    async (data, options) => {
      setFormValues(form, data);
      await submit(options);
      return undefined;
    },
    [form, submit],
  );

  const createValue = useMemo<CreateContextValue<TRecord>>(
    () => ({
      record: controller.record,
      isPending: controller.isPending,
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
    <CreateContextProvider value={createValue}>
      <SaveContextProvider value={saveValue}>
        <RecordContextProvider value={controller.record}>
          <CheloneFormProvider form={form} resource={resource} submit={submit}>
            <CreateView {...viewProps}>{children}</CreateView>
          </CheloneFormProvider>
        </RecordContextProvider>
      </SaveContextProvider>
    </CreateContextProvider>
  );
}

interface CreateViewProps {
  children?: ReactNode;
  component?: React.ElementType;
  actions?: ReactNode | false;
  title?: ReactNode | string | false;
  className?: string;
}

/** The create layout: title + actions header, then the children. @internal */
function CreateView(props: CreateViewProps) {
  const {
    component: Wrapper = "div",
    title,
    actions,
    children,
    className,
  } = props;
  const context = useCreateContext();

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
      <Wrapper className="my-2 space-y-4">{children}</Wrapper>
    </>
  );
}

export { Create, CreateView, type CreateViewProps };
