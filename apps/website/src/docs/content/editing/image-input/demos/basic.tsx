import { ImageInput } from "@chelone/react";

export const mode = "input";

/** `<ImageInput>` shows an empty drop zone that accepts one image. */
export default function ImageInputDemo() {
  return <ImageInput source="cover" />;
}
