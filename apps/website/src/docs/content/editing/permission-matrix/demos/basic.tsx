import type { PermissionMatrixValue } from "@chelone/core";
import { PermissionMatrix } from "@chelone/react";
import { useState } from "react";

const initial: PermissionMatrixValue = {
  editor: [{ resource: "posts", action: ["list", "show", "edit"] }],
  viewer: [{ resource: "posts", action: ["list", "show"] }],
  admin: [{ resource: "*", action: "*" }],
};

/**
 * `<PermissionMatrix>` holds no state: it reports each click as the whole next
 * value. Tick a cell and the JSON below follows. The admin tab shows every cell
 * locked and checked, since one wildcard grant gives them.
 */
export default function PermissionMatrixDemo() {
  const [value, setValue] = useState(initial);

  return (
    <div className="flex w-full flex-col gap-4">
      <PermissionMatrix
        roles={["editor", "viewer", "admin"]}
        resources={["posts", "authors"]}
        value={value}
        onChange={setValue}
      />
      <pre className="max-h-48 overflow-auto rounded-md bg-muted p-3 text-xs">
        {JSON.stringify(value, null, 2)}
      </pre>
    </div>
  );
}
