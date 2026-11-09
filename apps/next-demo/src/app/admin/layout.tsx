import { cookies } from "next/headers";
import type { ReactNode } from "react";
import { AdminShell } from "../../admin-shell";
import { readSession } from "../../auth";

/**
 * Every admin page prefetches per request, and the shell reads
 * `useSearchParams`, which a static prerender would refuse without a
 * `<Suspense>` boundary, so the whole segment renders on demand. Reading the
 * session cookie needs a request anyway.
 */
export const dynamic = "force-dynamic";

/**
 * The server layout: the client shell around whichever page Next renders. The
 * proxy keeps a logged-out visit from getting this far, so the session read
 * here is for the shell's first render.
 */
export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = readSession(await cookies());
  return <AdminShell session={session}>{children}</AdminShell>;
}
