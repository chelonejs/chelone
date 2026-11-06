import {
  ArrayField,
  ChipField,
  RecordContextProvider,
  SingleFieldList,
} from "@chelone/react";

export const mode = "record";

/** `<ArrayField>` displays a post's embedded tags. */
export default function ArrayFieldDemo() {
  return (
    <RecordContextProvider
      value={{
        id: 1,
        tags: [
          { id: 1, name: "Science" },
          { id: 2, name: "Computing" },
        ],
      }}
    >
      <ArrayField source="tags">
        <SingleFieldList>
          <ChipField source="name" />
        </SingleFieldList>
      </ArrayField>
    </RecordContextProvider>
  );
}
