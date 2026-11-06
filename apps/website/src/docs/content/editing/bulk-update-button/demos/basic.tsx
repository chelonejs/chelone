import {
  BooleanField,
  BulkUpdateButton,
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
      bulkActionButtons={
        <BulkUpdateButton label="Publish" data={{ published: true }} />
      }
    >
      <DataTable.Col source="title" />
      <DataTable.Col source="published">
        <BooleanField source="published" />
      </DataTable.Col>
    </DataTable>
  );
}

/** `<BulkUpdateButton>` publishes selected posts after confirmation. */
export default function BulkUpdateButtonDemo() {
  return (
    <div className="w-full pb-24 [transform:translateZ(0)]">
      <List perPage={5}>
        <SelectedPosts />
      </List>
    </div>
  );
}
