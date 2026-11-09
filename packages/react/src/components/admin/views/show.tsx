/**
 * P7e-T2 — `<Show>` ported from shadmin `admin/views/show.tsx` onto chelone's
 * `useShowController` (NOT ra-core's `ShowBase`).
 *
 * The shell: reads the record `id` from the route params, runs
 * `useShowController` for the ambient `<Resource>` resource, and publishes the
 * result into BOTH the `ShowContext` (view fields — `record`/`defaultTitle`)
 * and the `RecordContext` (every display field reads the record here). Show is
 * read-only, so there is no `SaveContext`/form provider. Renders a title (from
 * the record representation) + actions + children.
 *
 * Chelone divergences (deliberate): no `<ShowBase>` (the controller is
 * `useShowController`, the view mounts the providers); the breadcrumb and the
 * default `<EditButton>` action are LAYOUT/BUTTONS chrome from later waves —
 * the `title`/`actions` props remain the seams (`actions` defaults to nothing).
 * `defaultTitle` is COMPUTED here (chelone controllers don't carry it) from the
 * record representation, matching shadmin's `<ShowView>` heading.
 */

import type { Identifier } from "@chelone/core";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useShowController } from "../../../controller-hooks";
import { useGetRecordRepresentation } from "../../../label";
import { RecordContextProvider } from "../../../record/record-context";
import {
  ShowContextProvider,
  type ShowContextValue,
  useShowContext,
} from "../../../record-view-context";
import { ResourceContextProvider, useResourceContext } from "../../../resource";
import { useParams } from "../../../router";

export interface ShowProps {
  /** Override the ambient resource (defaults to the `<Resource>` context). */
  resource?: string;
  /** Override the record id (defaults to the `:id` route param). */
  id?: Identifier;
  children?: ReactNode;
  component?: React.ElementType;
  /** Header actions (an edit button); nothing by default. */
  actions?: ReactNode | false;
  /** Header title. A string/element renders as an `<h2>`; `false` omits it. */
  title?: ReactNode | string | false;
  className?: string;
}

/**
 * A show page: fetches the record via `useShowController`, publishes it into the
 * `ShowContext` + `RecordContext`, and renders a title + children (display
 * fields).
 *
 * @example
 * import { RecordField, Show } from "@chelone/react";
 *
 * export const PostShow = () => (
 *   <Show>
 *     <RecordField source="title" />
 *   </Show>
 * );
 */
function Show(props: ShowProps) {
  const { resource: resourceProp, id: idProp, children, ...viewProps } = props;
  const contextResource = useResourceContext();
  const resource = resourceProp ?? contextResource;
  if (!resource) {
    throw new Error(
      "The Show component must be used within a ResourceContextProvider or given a `resource` prop",
    );
  }
  const params = useParams();
  const id = idProp ?? params.id;
  if (id === undefined) {
    throw new Error(
      "The Show component needs an `id` prop or a route with an `:id` param",
    );
  }

  const controller = useShowController(resource, { id });
  const getRecordRepresentation = useGetRecordRepresentation(resource);
  const defaultTitle = String(getRecordRepresentation(controller.record) ?? "");

  const value: ShowContextValue = {
    ...controller,
    resource,
    defaultTitle,
  };

  return (
    <ResourceContextProvider value={resource}>
      <ShowContextProvider value={value}>
        <RecordContextProvider value={controller.record}>
          <ShowView {...viewProps}>{children}</ShowView>
        </RecordContextProvider>
      </ShowContextProvider>
    </ResourceContextProvider>
  );
}

interface ShowViewProps {
  children?: ReactNode;
  component?: React.ElementType;
  actions?: ReactNode | false;
  title?: ReactNode | string | false;
  className?: string;
}

/** The show layout: title + actions header, then the children. @internal */
function ShowView(props: ShowViewProps) {
  const {
    component: Wrapper = "div",
    title,
    actions,
    children,
    className,
  } = props;
  const context = useShowContext();

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
      <Wrapper data-slot="show" className="my-2 space-y-4">
        {children}
      </Wrapper>
    </>
  );
}

export { Show, ShowView, type ShowViewProps };
