import {
  BooleanInput,
  BulkActionsToolbar,
  BulkEditDrawer,
  DataTable,
  List,
  NumberInput,
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
          <BulkEditDrawer label="Edit posts" title="Edit selected posts">
            <NumberInput source="views" />
            <BooleanInput source="published" />
          </BulkEditDrawer>
        </BulkActionsToolbar>
      }
    >
      <DataTable.Col source="title" />
      <DataTable.NumberCol source="views" />
    </DataTable>
  );
}

/** `<BulkEditDrawer>` sets the views or the published flag of two selected posts from a side sheet, sending only the fields you touch. */
export default function BulkEditDrawerDemo() {
  return (
    <div className="w-full pb-24 [transform:translateZ(0)]">
      <List perPage={5}>
        <SelectedPosts />
      </List>
    </div>
  );
}
