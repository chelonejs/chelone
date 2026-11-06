import {
  DataTable,
  FilterListSection,
  FilterLiveSearch,
  List,
} from "@chelone/react";
import { Search } from "lucide-react";

/** A titled filter section with a search icon and a live post search. */
export default function FilterListSectionDemo() {
  return (
    <List perPage={5}>
      <FilterListSection label="Search posts" icon={<Search />}>
        <FilterLiveSearch placeholder="Search by title" />
      </FilterListSection>
      <DataTable>
        <DataTable.Col source="title" />
      </DataTable>
    </List>
  );
}
