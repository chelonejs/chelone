import { PresenceBar, ShowLive } from "@chelone/react";
import { PreviewViewer } from "../../../../mdx/preview-viewer";

export const mode = "view";

/** Alan has post 1 open too, so the bar shows his avatar. You are left out. */
export default function PresenceBarDemo() {
  return (
    <ShowLive id={1} title={false}>
      <PreviewViewer postId={1} />
      <PresenceBar />
    </ShowLive>
  );
}
