import { SelectArrayInput } from "@chelone/react";

export const mode = "input";

const tags = [
  { id: "tech", name: "Tech" },
  { id: "lifestyle", name: "Lifestyle" },
  { id: "people", name: "People" },
];

/** `<SelectArrayInput>` shows a "Tech" and "People" badge for the preselected tags and opens a checkbox list of all three. */
export default function SelectArrayInputDemo() {
  return (
    <div className="w-full max-w-sm">
      <SelectArrayInput
        source="tags"
        choices={tags}
        defaultValue={["tech", "people"]}
      />
    </div>
  );
}
