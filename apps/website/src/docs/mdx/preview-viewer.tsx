import {
  assertRealtimeDataProvider,
  createPresenceSession,
  type Identifier,
  presenceTopic,
} from "@chelone/core";
import { useCheloneContext } from "@chelone/react";
import { useEffect } from "react";

/**
 * Another user with a post open: it announces itself on the post's presence
 * topic the way a second browser's `<PresenceBar>` would. Renders nothing.
 */
export function PreviewViewer({ postId }: { postId: Identifier }) {
  const { dataProvider } = useCheloneContext();
  useEffect(() => {
    assertRealtimeDataProvider(dataProvider, "PreviewViewer");
    const session = createPresenceSession({
      dataProvider,
      topic: presenceTopic("posts", postId),
      user: { id: "alan", name: "Alan Turing" },
    });
    session.start();
    return () => session.stop();
  }, [dataProvider, postId]);
  return null;
}
