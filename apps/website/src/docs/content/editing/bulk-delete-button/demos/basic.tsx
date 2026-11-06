import {
  BulkDeleteButton,
  DataTable,
  List,
  useListContext,
} from "@chelone/react";
import { useEffect } from "react";

function SelectedPosts() {
  const { select } = useListContext();
  useEffect(() => {
    select([1, 2]);
  }, [select]);

  return (
    <DataTable rowClick={false} bulkActionButtons={<BulkDeleteButton />}>
      <DataTable.Col source="title" />
    </DataTable>
  );
}

/** `<BulkDeleteButton>` asks for confirmation before deleting selected posts. */
export default function BulkDeleteButtonDemo() {
  return (
    <div className="w-full pb-24 [transform:translateZ(0)]">
      <List perPage={5}>
        <SelectedPosts />
      </List>
    </div>
  );
}
