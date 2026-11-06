import { FunctionField } from "@chelone/react";
import type { PreviewPost } from "../../../../mdx/preview-fixtures";

export const mode = "record";

/** A custom field combining the post's title and view count. */
export default function FunctionFieldDemo() {
  return (
    <FunctionField<PreviewPost>
      render={(record) => `${record.title} (${record.views} views)`}
    />
  );
}
