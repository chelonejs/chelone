import {
  RecordContextProvider,
  ReferenceOneField,
  TextField,
} from "@chelone/react";

export const mode = "record";

/** `<ReferenceOneField>` fetches the first post whose `author_id` matches this author and renders its `title` off the referenced record. */
export default function ReferenceOneFieldDemo() {
  return (
    <RecordContextProvider value={{ id: 1, name: "Ada Lovelace" }}>
      <div className="flex flex-col gap-1 text-sm">
        <span className="text-muted-foreground">Most viewed post</span>
        <ReferenceOneField
          reference="posts"
          target="author_id"
          sort={{ field: "views", order: "DESC" }}
        >
          <TextField source="title" />
        </ReferenceOneField>
      </div>
    </RecordContextProvider>
  );
}
