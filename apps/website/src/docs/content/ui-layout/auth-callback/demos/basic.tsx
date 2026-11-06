import { AuthCallback } from "@chelone/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

/** `<AuthCallback>` shows its loading spinner with callback execution paused. */
export default function AuthCallbackDemo() {
  // The preview has no auth provider. Pause queries locally to keep the loading state.
  const [queryClient] = useState(
    () => new QueryClient({ defaultOptions: { queries: { enabled: false } } }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <AuthCallback />
    </QueryClientProvider>
  );
}
