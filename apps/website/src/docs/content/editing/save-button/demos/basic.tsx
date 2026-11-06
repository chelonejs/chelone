import {
  ReferenceInput,
  SaveButton,
  SelectInput,
  TextInput,
} from "@chelone/react";

export const mode = "input";

/** `<SaveButton>` submits the create form around it, which holds a whole post, so the click creates one. */
export default function SaveButtonDemo() {
  return (
    <div className="flex w-full max-w-sm flex-col gap-4">
      <TextInput source="title" defaultValue="Notes on the Analytical Engine" />
      <TextInput
        source="body"
        multiline
        defaultValue="Body copy for a new post."
      />
      <ReferenceInput source="author_id" reference="authors">
        <SelectInput optionText="name" defaultValue={2} />
      </ReferenceInput>
      <SaveButton />
    </div>
  );
}
