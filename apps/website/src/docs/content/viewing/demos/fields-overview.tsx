import {
  BooleanField,
  NumberField,
  ReferenceField,
  TextField,
} from "@chelone/react";

// Fields read the ambient record — render them under a record context.
export const mode = "record";

/** A row of fields, each reading a different `source` off the same record:
 *  text, number, a resolved reference, and a boolean. */
export default function FieldsOverviewDemo() {
  return (
    <div className="flex flex-col gap-2 text-sm">
      <div>
        <span className="text-muted-foreground">Title: </span>
        <TextField source="title" />
      </div>
      <div>
        <span className="text-muted-foreground">Views: </span>
        <NumberField source="views" />
      </div>
      <div>
        <span className="text-muted-foreground">Author: </span>
        <ReferenceField source="author_id" reference="authors">
          <TextField source="name" />
        </ReferenceField>
      </div>
      <div className="flex items-center gap-1">
        <span className="text-muted-foreground">Published: </span>
        <BooleanField source="published" />
      </div>
    </div>
  );
}
