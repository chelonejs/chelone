import {
  DataTable,
  FilterLiveSearch,
  ListContextProvider,
  useList,
} from "@chelone/react";

// The preview's fakeDataProvider matches a filter value exactly, and `q` is a
// full-text filter, so this list runs client-side, where `q` has its match.
const posts = [
  { id: 1, title: "On Computable Numbers" },
  { id: 2, title: "Notes on the Analytical Engine" },
  { id: 3, title: "The Genesis of the Compiler" },
  { id: 4, title: "Debugging a Moth" },
  { id: 5, title: "The Imitation Game Revisited" },
];

/** A search box that filters posts as the reader types. */
export default function FilterLiveSearchDemo() {
  const list = useList({ data: posts, perPage: posts.length });

  return (
    <ListContextProvider value={list}>
      <FilterLiveSearch placeholder="Search posts" />
      <DataTable rowClick={false}>
        <DataTable.Col source="title" />
      </DataTable>
    </ListContextProvider>
  );
}
