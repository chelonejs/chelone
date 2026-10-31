import type { ResourceRecord } from "@chelone/core";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { useListContext } from "../../../form";
import { useGetRecordRepresentation } from "../../../label";
import { cn } from "../../../lib/utils";
import { RecordContextProvider } from "../../../record/record-context";
import { useResourceContext } from "../../../resource";

interface SingleFieldListProps<
  RecordType extends ResourceRecord = ResourceRecord,
> {
  /** Rendered once per record, inside that record's context. */
  children?: ReactNode;
  /** Renders each record; wins over `children`. */
  render?: (record: RecordType, index: number) => ReactNode;
  className?: string;
}

/**
 * The records of the ambient list as an inline row, for a cell or a card that
 * lists related records. With neither `render` nor `children`, each record
 * shows as an outline `Badge` holding its record representation.
 *
 * @example
 * <ReferenceManyField reference="tags" target="post_id">
 *   <SingleFieldList>
 *     <TextField source="name" />
 *   </SingleFieldList>
 * </ReferenceManyField>
 */
function SingleFieldList<RecordType extends ResourceRecord = ResourceRecord>({
  children,
  render,
  className,
}: SingleFieldListProps<RecordType>) {
  const { data } = useListContext();
  const resource = useResourceContext();
  const getRecordRepresentation = useGetRecordRepresentation(resource);

  if (!data) {
    return null;
  }

  return (
    <div className={cn("flex gap-2", className)}>
      {(data as RecordType[]).map((record, index) => (
        <RecordContextProvider<RecordType> key={record.id} value={record}>
          {render ? (
            render(record, index)
          ) : (
            (children ?? (
              <Badge variant="outline">{getRecordRepresentation(record)}</Badge>
            ))
          )}
        </RecordContextProvider>
      ))}
    </div>
  );
}

export { SingleFieldList, type SingleFieldListProps };
