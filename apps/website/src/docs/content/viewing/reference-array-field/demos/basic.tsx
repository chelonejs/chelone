import {
  ChipField,
  RecordContextProvider,
  ReferenceArrayField,
  SingleFieldList,
} from "@chelone/react";

export const mode = "record";

/** `<ReferenceArrayField>` resolves a record's `author_ids` array against the `authors` resource and shows each resolved author as a chip. */
export default function ReferenceArrayFieldDemo() {
  return (
    <RecordContextProvider value={{ id: 1, author_ids: [1, 3] }}>
      <ReferenceArrayField source="author_ids" reference="authors">
        <SingleFieldList>
          <ChipField source="name" />
        </SingleFieldList>
      </ReferenceArrayField>
    </RecordContextProvider>
  );
}
