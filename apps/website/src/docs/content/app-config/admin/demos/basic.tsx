/** `<Admin>` is the root of the reference admin: this frame is that app, a menu, an app bar and the `posts` resource with its list, create, edit and show views. */
export default function AdminDemo() {
  return (
    <iframe
      title="The reference admin"
      src="/demo/posts"
      className="h-[28rem] w-full rounded-md border"
    />
  );
}
