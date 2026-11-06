import { Loading } from "@chelone/react";

/** `<Loading>` shows a spinner and a message while posts load. */
export default function LoadingDemo() {
  return (
    <Loading
      delay={0}
      loadingPrimary="Loading posts"
      loadingSecondary="Please wait while your records load."
    />
  );
}
