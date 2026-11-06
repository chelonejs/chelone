import { DatagridInput } from "@chelone/react";

export const mode = "input";

const categories = [
  { id: 1, name: "Tech" },
  { id: 2, name: "News" },
  { id: 3, name: "Lifestyle" },
];

/** `<DatagridInput>` lists three categories as table rows with checkboxes; Tech starts selected. */
export default function DatagridInputDemo() {
  return (
    <DatagridInput
      source="category_ids"
      choices={categories}
      optionText="name"
      defaultValue={[1]}
    />
  );
}
