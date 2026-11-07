import { DiffViewer } from "@chelone/react";

export const mode = "view";

const before = {
  id: 1,
  title: "On Computable Numbers",
  status: "draft",
  views: 120,
};
const after = {
  id: 1,
  title: "On Computable Numbers, revised",
  status: "review",
  views: 120,
};

/** Two copies of a post, compared field by field. */
export default function DiffViewerDemo() {
  return (
    <DiffViewer
      before={before}
      after={after}
      sources={["title", "status", "views"]}
    />
  );
}
