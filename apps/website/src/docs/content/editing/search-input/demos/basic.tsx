import {
  DataTable,
  FilterLiveForm,
  ListContextProvider,
  SearchInput,
  useList,
} from "@chelone/react";

// The preview's fakeDataProvider matches a filter value exactly, and `q` is a
// full-text filter, so this list runs client-side, where `q` has its match.
const posts = [
  { id: 1, title: "On Computable Numbers", views: 50 },
  { id: 2, title: "Notes on the Analytical Engine", views: 187 },
  { id: 3, title: "The Genesis of the Compiler", views: 324 },
  { id: 4, title: "Debugging a Moth", views: 461 },
  { id: 5, title: "The Imitation Game Revisited", views: 598 },
];

/** `<SearchInput>` narrows the table below it as the reader types: `q` searches every text field. */
export default function SearchInputDemo() {
  const list = useList({ data: posts, perPage: posts.length });

  return (
    <ListContextProvider value={list}>
      <FilterLiveForm>
        <SearchInput source="q" alwaysOn />
      </FilterLiveForm>
      <DataTable rowClick={false}>
        <DataTable.Col source="title" />
        <DataTable.NumberCol source="views" />
      </DataTable>
    </ListContextProvider>
  );
}
