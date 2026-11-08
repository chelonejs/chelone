/**
 * `<EditButton>` — navigates to a record's edit page. Ported from shadmin
 * `buttons/edit-button.tsx` and rebridged onto the router-adapter `Link`
 * (`useRouterAdapter`), the no-throw `useMenuAccess`, and `@chelone/react`'s
 * `useCreatePath`/`useGetResourceLabel`/`useGetRecordRepresentation`/
 * `useResourceTranslation`. Reads the record from `RecordContext` to build the
 * edit link.
 */

import type { LooseRecord, ResourceRecord } from "@chelone/core";
import { definedParams } from "@chelone/core";
import { Pencil } from "lucide-react";
import type { Ref } from "react";
import { buttonVariants } from "@/components/ui/button";
import {
  useGetRecordRepresentation,
  useGetResourceLabel,
  useResourceTranslation,
} from "../../../label";
import { useRecordContext } from "../../../record/record-context";
import { useResourceContext } from "../../../resource";
import { useCreatePath } from "../../../router";
import { useRouterAdapter } from "../../../router/adapter";
import { useMenuAccess } from "../layout/use-menu-access";

interface EditButtonProps<TRecord extends ResourceRecord = LooseRecord> {
  record?: TRecord;
  resource?: string;
  label?: string;
  icon?: React.ReactNode;
  scrollToTop?: boolean;
  ref?: Ref<HTMLAnchorElement>;
}

const defaultIcon = <Pencil />;

// useful to prevent click bubbling in a datagrid with rowClick
const stopPropagation = (e: React.MouseEvent) => e.stopPropagation();

/**
 * A button that navigates to the edit page for a record.
 *
 * Works within a `RecordContext` to get the record id.
 *
 * @example
 * import { DataTable, EditButton } from "@chelone/react";
 *
 * const PostList = () => (
 *   <DataTable>
 *     <DataTable.Col source="title" />
 *     <DataTable.Col>
 *       <EditButton />
 *     </DataTable.Col>
 *   </DataTable>
 * );
 */
function EditButton<TRecord extends ResourceRecord = LooseRecord>(
  props: EditButtonProps<TRecord>,
) {
  const {
    label: labelProp,
    icon = defaultIcon,
    scrollToTop = true,
    ref,
  } = props;
  const resource = useResourceContext(props);
  const record = useRecordContext<TRecord>(props);
  const createPath = useCreatePath();
  const { Link } = useRouterAdapter();
  const { canAccess, isPending: isAccessPending } = useMenuAccess({
    action: "edit",
    resource: resource ?? "",
    record,
  });
  const getResourceLabel = useGetResourceLabel();
  const getRecordRepresentation = useGetRecordRepresentation(resource);
  const recordRepresentationValue = getRecordRepresentation(record);
  const recordRepresentation =
    typeof recordRepresentationValue === "string"
      ? recordRepresentationValue
      : recordRepresentationValue?.toString();
  const label = useResourceTranslation({
    resourceI18nKey: resource ? `resources.${resource}.action.edit` : undefined,
    baseI18nKey: "chelone.action.edit",
    options: definedParams({
      _: "Edit",
      name: resource ? getResourceLabel(resource, 1) : undefined,
      recordRepresentation,
    }),
    userText: labelProp,
  });
  if (!record || record.id == null || !canAccess || isAccessPending) {
    return null;
  }
  const link = createPath({ resource, type: "edit", id: record.id });
  return (
    <Link
      ref={ref}
      className={buttonVariants({ variant: "outline" })}
      to={link}
      state={{ _scrollToTop: scrollToTop }}
      onClick={stopPropagation}
      aria-label={typeof label === "string" ? label : undefined}
    >
      {icon}
      {label}
    </Link>
  );
}

export { EditButton, type EditButtonProps };
