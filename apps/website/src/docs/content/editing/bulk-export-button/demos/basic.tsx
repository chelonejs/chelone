import {
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
    <DataTable rowClick={false} bulkActionButtons={<BulkExportButton />}>
      <DataTable.Col source="title" />
    </DataTable>
  );
}

/** `<BulkExportButton>` downloads the selected posts as CSV. */
export default function BulkExportButtonDemo() {
  return (
    <div className="w-full pb-24 [transform:translateZ(0)]">
      <List perPage={5}>
        <SelectedPosts />
      </List>
    </div>
  );
}
