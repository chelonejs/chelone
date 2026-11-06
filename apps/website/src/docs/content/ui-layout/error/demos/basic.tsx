import { Error as ErrorPage } from "@chelone/react";

/** `<Error>` shows the fallback for a failed request. */
export default function ErrorDemo() {
  return (
    <ErrorPage
      error={new Error("The posts could not be loaded.")}
      errorInfo={null}
      resetErrorBoundary={() => {}}
    />
  );
}
