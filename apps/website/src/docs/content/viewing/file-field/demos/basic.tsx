import { FileField, RecordContextProvider } from "@chelone/react";

export const mode = "record";

/** A downloadable file link labeled with the attachment's name. */
export default function FileFieldDemo() {
  return (
    <RecordContextProvider
      value={{ id: 1, attachment: "/chelone-mark.svg", name: "Chelone logo" }}
    >
      <FileField source="attachment" title="name" download="chelone-mark.svg" />
    </RecordContextProvider>
  );
}
