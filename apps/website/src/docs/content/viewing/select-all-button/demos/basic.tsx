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
    <DataTable rowClick={false}>
      <DataTable.Col source="title" />
      <DataTable.NumberCol source="views" />
    </DataTable>
  );
}

/** `<SelectAllButton>` appears once every row of the page is selected, and selects the other 25 posts on click. */
export default function SelectAllButtonDemo() {
  return (
    <List perPage={5} actions={<SelectAllButton />}>
      <SelectFirstPage />
    </List>
  );
}
