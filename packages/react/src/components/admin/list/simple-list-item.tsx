import type { Identifier, ResourceRecord } from "@chelone/core";
import type { ReactNode } from "react";
import { cn } from "../../../lib/utils";
import { useResourceDefinition } from "../../../resource";
import { useCreatePath } from "../../../router";
import { useRouterAdapter } from "../../../router/adapter";

/** A slot prop: renders one part of a row from its record and id. */
export type FunctionToElement<RecordType extends ResourceRecord> = (
  record: RecordType,
  id: Identifier,
) => ReactNode;

export interface SimpleListItemProps<
  RecordType extends ResourceRecord = ResourceRecord,
> {
  record?: RecordType;
  /** Defaults to nothing: without one the row is not linked. */
  resource?: string;
  /**
   * Where the row links to. `edit` by default, or `show` when the resource has
   * no edit view. `false` renders a plain row.
   */
  linkType?: "edit" | "show" | false;
  rowIndex?: number;
  className?: string;
  children?: ReactNode;
}

/**
 * One `<li>` of a `<SimpleList>`: the row content, linked to the record's edit
 * or show page. Renders nothing without a record.
 */
function SimpleListItem<RecordType extends ResourceRecord = ResourceRecord>({
  record,
  resource,
  linkType,
  rowIndex,
  className,
  children,
}: SimpleListItemProps<RecordType>) {
  const { Link } = useRouterAdapter();
  const createPath = useCreatePath();
  const { hasEdit } = useResourceDefinition({ resource });
  if (!record) return null;

  const type = linkType ?? (hasEdit === false ? "show" : "edit");
  if (type === false || !resource) {
    return (
      <li className={className} data-row-index={rowIndex}>
        {children}
      </li>
    );
  }
  return (
    <li data-row-index={rowIndex}>
      <Link
        to={createPath({ resource, id: record.id, type })}
        className={cn("block", className)}
      >
        {children}
      </Link>
    </li>
  );
}

export { SimpleListItem };
