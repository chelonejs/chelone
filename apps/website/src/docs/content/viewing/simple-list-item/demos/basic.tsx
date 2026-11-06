import { SimpleListItem } from "@chelone/react";

/** `<SimpleListItem>` is one row of a `<SimpleList>`: the row content, linked to the record's edit page. */
export default function SimpleListItemDemo() {
  return (
    <ul className="flex w-full flex-col rounded-md border">
      <SimpleListItem record={{ id: 1 }} resource="posts">
        On Computable Numbers
      </SimpleListItem>
      <SimpleListItem record={{ id: 2 }} resource="posts">
        Notes on the Analytical Engine
      </SimpleListItem>
    </ul>
  );
}
