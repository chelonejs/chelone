import { Create, TabbedForm, TextInput } from "@chelone/react";

/** `<TabbedForm>` shows a "General" tab with title and body inputs, and a "Details" tab beside it. */
export default function TabbedFormDemo() {
  return (
    <Create>
      <TabbedForm syncWithLocation={false}>
        <TabbedForm.Tab name="general" label="General">
          <TextInput source="title" />
          <TextInput source="body" multiline />
        </TabbedForm.Tab>
        <TabbedForm.Tab name="details" label="Details">
          <TextInput source="slug" />
        </TabbedForm.Tab>
      </TabbedForm>
    </Create>
  );
}
