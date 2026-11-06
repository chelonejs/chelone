import { NumberField, Show, TabbedShowLayout, TextField } from "@chelone/react";

/** A post's summary and body grouped into two tabs. */
export default function TabbedShowLayoutDemo() {
  return (
    <Show id={1}>
      <TabbedShowLayout syncWithLocation={false}>
        <TabbedShowLayout.Tab label="Summary">
          <TextField source="title" />
          <NumberField source="views" />
        </TabbedShowLayout.Tab>
        <TabbedShowLayout.Tab label="Body">
          <TextField source="body" />
        </TabbedShowLayout.Tab>
      </TabbedShowLayout>
    </Show>
  );
}
