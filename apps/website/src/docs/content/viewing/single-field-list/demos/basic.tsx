import { List, SingleFieldList } from "@chelone/react";

/** `<SingleFieldList>` lays the ambient list's records out in one inline row, each as a badge holding its record representation. */
export default function SingleFieldListDemo() {
  return (
    <List perPage={4}>
      <SingleFieldList />
    </List>
  );
}
