import { DualApprovalButton, Show } from "@chelone/react";

export const mode = "view";

/** Post 2 already has Alan's approval, so yours is the second and publishes it. */
export default function DualApprovalButtonDemo() {
  return (
    <Show id={2} title={false}>
      <DualApprovalButton
        required={2}
        pendingValue="review"
        approvedValue="published"
      />
    </Show>
  );
}
