import { MenuLive, useCreate } from "@chelone/react";
import { Button } from "@/components/ui/button";

export const mode = "realtime";

/** Writes a post the way a second user's browser would, over the same provider. */
function AddPost() {
  const { mutate } = useCreate("posts");
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() =>
        mutate({
          data: {
            title: `Post added at ${new Date().toLocaleTimeString()}`,
            body: "Added by another user.",
            author_id: 1,
            views: 0,
            published: false,
          },
        })
      }
    >
      Another user adds a post
    </Button>
  );
}

/** `<MenuLive>` counts the posts created since the user last opened the link.
 *  The count clears while the link's route is open: this link goes to the
 *  `<ListLive>` page, so opening it resets the badge. */
export default function MenuLiveDemo() {
  return (
    <div className="flex w-56 flex-col gap-4">
      <MenuLive
        items={[
          {
            to: "/docs/realtime/list-live",
            resource: "posts",
            label: "Unread posts",
          },
        ]}
      />
      <AddPost />
    </div>
  );
}
