import { ImageField, RecordContextProvider } from "@chelone/react";

export const mode = "record";

/** The Chelone logo rendered from the record's image URL. */
export default function ImageFieldDemo() {
  return (
    <RecordContextProvider
      value={{ id: 1, image: "/chelone-mark.svg", title: "Chelone logo" }}
    >
      <ImageField source="image" title="title" className="[&_img]:size-24" />
    </RecordContextProvider>
  );
}
