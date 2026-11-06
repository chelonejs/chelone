import { FileInput } from "@chelone/react";

export const mode = "input";

/** `<FileInput>` shows an empty drop zone that accepts several PDF files. */
export default function FileInputDemo() {
  return (
    <FileInput
      source="attachments"
      multiple
      accept={{ "application/pdf": [] }}
    />
  );
}
