import {
  BooleanInput,
  Create,
  NumberInput,
  ReferenceInput,
  SaveButton,
  SelectInput,
  TextInput,
} from "@chelone/react";

/** A `<Create>` form for a new post. Inputs compose directly as children — no
 *  `<SimpleForm>` wrapper — and validate against the resource's Zod schema. */
export default function CreateBasicDemo() {
  return (
    <Create>
      <TextInput source="title" />
      <TextInput source="body" multiline />
      <ReferenceInput source="author_id" reference="authors">
        <SelectInput optionText="name" />
      </ReferenceInput>
      <NumberInput source="views" min={0} defaultValue={0} />
      <BooleanInput source="published" defaultValue={false} />
      <SaveButton />
    </Create>
  );
}
