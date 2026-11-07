import { ListContextProvider, TreeList, useList } from "@chelone/react";

const categories = [
  { id: 1, name: { en: "Electronics" }, parent_id: null },
  { id: 2, name: { en: "Computers" }, parent_id: 1 },
  { id: 3, name: { en: "Laptops" }, parent_id: 2 },
  { id: 4, name: { en: "Audio" }, parent_id: 1 },
  { id: 5, name: { en: "Books" }, parent_id: null },
  { id: 6, name: { en: "Fiction" }, parent_id: 5 },
];

/** Categories nested by `parent_id`. A branch opens with its chevron or the arrow keys. */
export default function TreeListDemo() {
  const list = useList({ data: categories });
  return (
    <ListContextProvider value={list}>
      <TreeList
        parentSource="parent_id"
        titleSource="name.en"
        linkType={false}
        defaultExpanded
      />
    </ListContextProvider>
  );
}
