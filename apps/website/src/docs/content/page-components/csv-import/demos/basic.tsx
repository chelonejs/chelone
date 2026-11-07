import { DataTable, List } from "@chelone/react";
import { CsvImport } from "@chelone/react/csv-import";
import { z } from "zod";

const postImportSchema = z.object({
  title: z.string().min(1),
  body: z.string().optional(),
});

/** `<CsvImport>` opens a dialog that maps a CSV file's columns to a post's title and body, previews the rows that pass, and creates them. */
export default function CsvImportDemo() {
  return (
    <List perPage={5} actions={<CsvImport schema={postImportSchema} />}>
      <DataTable rowClick={false}>
        <DataTable.Col source="title" />
        <DataTable.NumberCol source="views" />
      </DataTable>
    </List>
  );
}
