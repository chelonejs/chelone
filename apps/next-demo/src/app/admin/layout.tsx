import type { ReactNode } from "react";
import { AdminShell } from "../../admin-shell";

/**
 * Every admin page prefetches per request, and the shell reads
 * `useSearchParams`, which a static prerender would refuse without a
 * `<Suspense>` boundary, so the whole segment renders on demand.
 */
export const dynamic = "force-dynamic";

/** The server layout: the client shell around whichever page Next renders. */
export default function AdminLayout({ children }: { children: ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}
