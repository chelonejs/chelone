import {
  BooleanInput,
  Edit,
  NumberInput,
  ReferenceInput,
  SelectInput,
  TextInput,
  Toolbar,
} from "@chelone/react";

/** The quickstart edit form. The `posts` resource carries a Zod schema, so the
 *  form validates against it automatically (no per-input `validate` props). */
export default function PostEditDemo() {
  return (
    <Edit id={1}>
      <TextInput source="title" />
      <TextInput source="body" multiline />
      <ReferenceInput source="author_id" reference="authors">
        <SelectInput optionText="name" />
      </ReferenceInput>
      <NumberInput source="views" min={0} />
      <BooleanInput source="published" />
      <Toolbar />
    </Edit>
  );
}
