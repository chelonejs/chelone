import {
  BulkActionsToolbar,
  BulkExportButton,
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
    <DataTable
      rowClick={false}
      bulkActionsToolbar={
        <BulkActionsToolbar>
          <BulkExportButton />
        </BulkActionsToolbar>
      }
    >
      <DataTable.Col source="title" />
      <DataTable.NumberCol source="views" />
    </DataTable>
  );
}

/** `<BulkActionsToolbar>` offers export for two initially selected posts. */
export default function BulkActionsToolbarDemo() {
  return (
    <div className="w-full pb-24 [transform:translateZ(0)]">
      <List perPage={5}>
        <SelectedPosts />
      </List>
    </div>
  );
}
