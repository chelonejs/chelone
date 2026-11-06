import { RecordContextProvider, StatusTransitionButton } from "@chelone/react";

export const mode = "record";

/** `<StatusTransitionButton>` shows a menu button that lists "review" as the one move open to a draft post. */
export default function StatusTransitionButtonDemo() {
  return (
    <RecordContextProvider
      value={{ id: 1, title: "Draft post", status: "draft" }}
    >
      <StatusTransitionButton
        transitions={{ draft: ["review"], review: ["published", "draft"] }}
        labels={{ review: "In review" }}
      />
    </RecordContextProvider>
  );
}
