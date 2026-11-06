import {
  BooleanField,
  DataTable,
  List,
  ToggleFilterButton,
} from "@chelone/react";

/** A button that toggles the post list between all posts and published posts. */
export default function ToggleFilterButtonDemo() {
  return (
    <List
      perPage={5}
      actions={
        <ToggleFilterButton label="Published" value={{ published: true }} />
      }
    >
      <DataTable rowClick={false}>
        <DataTable.Col source="title" />
        <DataTable.Col source="published">
          <BooleanField source="published" />
        </DataTable.Col>
      </DataTable>
    </List>
  );
}
