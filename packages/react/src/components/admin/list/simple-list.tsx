import type { ResourceRecord } from "@chelone/core";
import type { ReactNode } from "react";
import { useListContext } from "../../../form";
import { cn } from "../../../lib/utils";
import { RecordContextProvider } from "../../../record/record-context";
import { useResourceContext } from "../../../resource";
import { ListNoResults } from "./list-no-results";
import { type FunctionToElement, SimpleListItem } from "./simple-list-item";
import { SimpleListLoading } from "./simple-list-loading";

export interface SimpleListProps<
  RecordType extends ResourceRecord = ResourceRecord,
> {
  primaryText?: FunctionToElement<RecordType>;
  secondaryText?: FunctionToElement<RecordType>;
  tertiaryText?: FunctionToElement<RecordType>;
  leftAvatar?: FunctionToElement<RecordType>;
  leftIcon?: FunctionToElement<RecordType>;
  rightIcon?: FunctionToElement<RecordType>;
  /** Where each row links to; see `SimpleListItem`. */
  linkType?: "edit" | "show" | false;
  /** Rendered while the list is pending, in place of `SimpleListLoading`. */
  loading?: ReactNode;
  /** Rendered with no records, in place of `ListNoResults`. */
  empty?: ReactNode;
  className?: string;
}

/**
 * The records of the ambient `<List>` as tappable rows, for lists too narrow
 * for a `<DataTable>`.
 *
 * @example
 * <List>
 *   <SimpleList
 *     primaryText={(post) => post.title}
 *     secondaryText={(post) => post.author}
 *   />
 * </List>
 */
function SimpleList<RecordType extends ResourceRecord = ResourceRecord>({
  primaryText,
  secondaryText,
  tertiaryText,
  leftAvatar,
  leftIcon,
  rightIcon,
  linkType,
  loading,
  empty,
  className,
}: SimpleListProps<RecordType>) {
  const { data, isPending } = useListContext();
  const resource = useResourceContext();

  if (isPending) {
    return loading !== undefined ? (
      loading
    ) : (
      <SimpleListLoading
        className={className}
        hasLeftAvatarOrIcon={!!leftIcon || !!leftAvatar}
        hasRightAvatarOrIcon={!!rightIcon}
        hasSecondaryText={!!secondaryText}
        hasTertiaryText={!!tertiaryText}
      />
    );
  }
  if (!data || data.length === 0) {
    return empty !== undefined ? empty : <ListNoResults />;
  }

  return (
    <ul className={cn("flex flex-col", className)}>
      {(data as RecordType[]).map((record, rowIndex) => (
        <RecordContextProvider<RecordType> key={record.id} value={record}>
          <SimpleListItem
            record={record}
            resource={resource}
            linkType={linkType}
            rowIndex={rowIndex}
            className="flex items-center gap-3 px-4 py-3"
          >
            {leftIcon || leftAvatar ? (
              <div className="shrink-0">
                {leftIcon?.(record, record.id)}
                {leftAvatar?.(record, record.id)}
              </div>
            ) : null}
            <div className="flex min-w-0 flex-1 flex-col">
              {primaryText ? (
                <span className="truncate text-sm font-medium">
                  {primaryText(record, record.id)}
                </span>
              ) : null}
              {secondaryText ? (
                <span className="truncate text-sm text-muted-foreground">
                  {secondaryText(record, record.id)}
                </span>
              ) : null}
              {tertiaryText ? (
                <span className="truncate text-xs text-muted-foreground">
                  {tertiaryText(record, record.id)}
                </span>
              ) : null}
            </div>
            {rightIcon ? (
              <div className="shrink-0">{rightIcon(record, record.id)}</div>
            ) : null}
          </SimpleListItem>
        </RecordContextProvider>
      ))}
    </ul>
  );
}

export { SimpleList };
