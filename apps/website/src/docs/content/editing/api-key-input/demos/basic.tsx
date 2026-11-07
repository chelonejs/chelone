import {
  ApiKeyField,
  ApiKeyInput,
  RecordContextProvider,
} from "@chelone/react";
import { useState } from "react";

export const mode = "record";

/** `<ApiKeyInput>` asks for confirmation, then runs `onRotate`; here that swaps the key shown beside it. */
export default function ApiKeyInputDemo() {
  const [rotations, setRotations] = useState(0);
  const record = { id: 1, apiKey: `ck_live_4f9a21c${rotations}` };

  return (
    <RecordContextProvider value={record}>
      <div className="flex flex-wrap items-center gap-4">
        <ApiKeyField source="apiKey" />
        <ApiKeyInput
          source="apiKey"
          onRotate={() => setRotations((count) => count + 1)}
        />
      </div>
    </RecordContextProvider>
  );
}
