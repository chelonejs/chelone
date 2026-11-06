import { RecordContextProvider, ReferenceManyCount } from "@chelone/react";

export const mode = "record";

/** `<ReferenceManyCount>` counts the posts whose `author_id` points back at this author, without loading them. */
export default function ReferenceManyCountDemo() {
  return (
    <RecordContextProvider value={{ id: 1, name: "Ada Lovelace" }}>
      <p className="text-sm">
        Ada Lovelace wrote{" "}
        <ReferenceManyCount reference="posts" target="author_id" /> posts.
      </p>
    </RecordContextProvider>
  );
}
