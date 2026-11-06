import { SelectInput } from "@chelone/react";

export const mode = "input";

const statuses = [
  { id: "draft", name: "Draft" },
  { id: "published", name: "Published" },
  { id: "archived", name: "Archived" },
];

/** `<SelectInput>` shows a "Published" dropdown that opens a list of the three statuses. */
export default function SelectInputDemo() {
  return (
    <div className="w-full max-w-sm">
      <SelectInput
        source="status"
        choices={statuses}
        defaultValue="published"
      />
    </div>
  );
}
