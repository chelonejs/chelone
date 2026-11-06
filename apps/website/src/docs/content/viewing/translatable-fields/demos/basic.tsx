import {
  RecordContextProvider,
  TextField,
  TranslatableFields,
} from "@chelone/react";

export const mode = "record";

/** A post's title in English and French, with a tab for each locale. */
export default function TranslatableFieldsDemo() {
  return (
    <RecordContextProvider
      value={{
        id: 1,
        title: {
          en: "On Computable Numbers",
          fr: "Sur les nombres calculables",
        },
      }}
    >
      <TranslatableFields locales={["en", "fr"]}>
        <TextField source="title" />
      </TranslatableFields>
    </RecordContextProvider>
  );
}
