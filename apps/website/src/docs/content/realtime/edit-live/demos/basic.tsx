import {
  EditLive,
  NumberInput,
  TextInput,
  Toolbar,
  useUpdate,
} from "@chelone/react";
import { Button } from "@/components/ui/button";

export const mode = "realtime";

/** Renames post 1 the way a second user's browser would, over the same provider. */
function RenamePost() {
  const { mutate } = useUpdate("posts");
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() =>
        mutate({
          id: 1,
          data: { title: `Renamed at ${new Date().toLocaleTimeString()}` },
        })
      }
    >
      Another user renames post 1
    </Button>
  );
}

/** `<EditLive>` shows the rename as soon as the form is clean. Type in the
 *  title first and the change is held until the form is saved or reset. */
export default function EditLiveDemo() {
  return (
    <EditLive id={1} actions={<RenamePost />}>
      <TextInput source="title" />
      <NumberInput source="views" min={0} />
      <Toolbar />
    </EditLive>
  );
}
