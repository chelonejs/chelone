import { Layout } from "@chelone/react";

/** `<Layout>` shows the admin sidebar, app bar, and page content. */
export default function LayoutDemo() {
  return (
    <div className="relative h-96 w-full overflow-hidden rounded-md border [contain:layout_paint] [&_[data-slot=sidebar-container]]:h-full [&_[data-slot=sidebar-wrapper]]:min-h-full [&_main]:h-96">
      <Layout>
        <h2 className="py-4 text-xl font-semibold">Posts</h2>
        <p>Select a resource in the sidebar to start managing records.</p>
      </Layout>
    </div>
  );
}
