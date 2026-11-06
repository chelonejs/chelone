import { ArrayInput, SimpleFormIterator, TextInput } from "@chelone/react";

export const mode = "input";

/** `<SimpleFormIterator>` lists two link rows, each with remove and reorder buttons, above an Add button. */
export default function SimpleFormIteratorDemo() {
  return (
    <div className="w-full max-w-sm">
      <ArrayInput
        source="links"
        defaultValue={[
          { url: "https://example.com/a" },
          { url: "https://example.com/b" },
        ]}
      >
        <SimpleFormIterator>
          <TextInput source="url" label="URL" />
        </SimpleFormIterator>
      </ArrayInput>
    </div>
  );
}
