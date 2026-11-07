import {
  DataTable,
  List,
  SelectAllButton,
  useListContext,
} from "@chelone/react";
import { useEffect } from "react";

/** Selects the whole first page so the button the page lacks appears. */
function SelectFirstPage() {
  const { select } = useListContext();
  useEffect(() => {
    select([1, 2, 3, 4, 5]);
  }, [select]);

  return (
    <DataTable rowClick={false} bulkActionButtons>
      <DataTable.Col source="title" />
      <DataTable.NumberCol source="views" />
    </DataTable>
  );
}

/** `<SelectAllButton>` appears once every row of the page is checked, and checks the other seven posts on click. The table's own checkboxes and the "5 items selected" bar make the selection visible. */
export default function SelectAllButtonDemo() {
  return (
    <div className="w-full pb-24 [transform:translateZ(0)]">
      <List perPage={5} actions={<SelectAllButton />}>
        <SelectFirstPage />
      </List>
    </div>
  );
}
