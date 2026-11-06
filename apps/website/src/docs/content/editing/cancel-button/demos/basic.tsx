import { CancelButton, Create, TextInput } from "@chelone/react";

/** `<CancelButton>` returns to the previous page from a new post form. */
export default function CancelButtonDemo() {
  return (
    <Create>
      <TextInput source="title" />
      <CancelButton />
    </Create>
  );
}
