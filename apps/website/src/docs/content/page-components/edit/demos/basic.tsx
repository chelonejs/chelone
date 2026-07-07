import {
  BooleanInput,
  Edit,
  NumberInput,
  ReferenceInput,
  SelectInput,
  TextInput,
  Toolbar,
} from "@chelone/react";

/** An `<Edit>` view for post id=1. It fetches + hydrates the record, then the
 *  child inputs bind to it; `<Toolbar>` renders Save / Delete. */
export default function EditBasicDemo() {
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
