/**
 * The categories resource: a tree nested by `parent_id`, each name held in
 * every locale as `{ en, pt, fr }`. The list is a `<TreeList>` over the English
 * name, the edit form writes the English, Portuguese and French names in
 * `<TranslatableInputs>`, and the show page reads them back through
 * `<TranslatableFields>`.
 */

import {
  createResourceComponents,
  Toolbar,
  TranslatableFields,
  TranslatableInputs,
  TreeList,
} from "@chelone/react";

const categories = createResourceComponents("categories");

// The seed names carry pt too, and a map with a locale outside `locales` is not
// read as a translation map, so all three are listed.
const locales = ["en", "pt", "fr"];

export function CategoryList() {
  // The tree is the whole list, so one page has to hold every category.
  return (
    <categories.List perPage={100}>
      <TreeList
        parentSource="parent_id"
        titleSource="name.en"
        defaultExpanded
      />
    </categories.List>
  );
}

export function CategoryEdit() {
  return (
    <categories.Edit>
      <TranslatableInputs locales={locales}>
        <categories.TextInput source="name" />
      </TranslatableInputs>
      <Toolbar />
    </categories.Edit>
  );
}

export function CategoryShow() {
  return (
    <categories.Show>
      <categories.RecordField label="Name">
        <TranslatableFields locales={locales}>
          <categories.TextField source="name" />
        </TranslatableFields>
      </categories.RecordField>
    </categories.Show>
  );
}
