import {
  RecordField,
  ShowLive,
  useCheloneContext,
  useRecordContext,
} from "@chelone/react";

export const mode = "view";

/** Writes through the provider the way another user's browser would. */
function RenameFromElsewhere() {
  const { dataProvider } = useCheloneContext();
  const record = useRecordContext();
  if (!record) return null;
  return (
    <button
      type="button"
      className="w-fit rounded-md border px-3 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
      onClick={() =>
        dataProvider.update("posts", {
          id: record.id,
          data: { title: `Renamed at ${new Date().toLocaleTimeString()}` },
        })
      }
    >
      Another user renames this post
    </button>
  );
}

/** The record refetches when it changes, with no reload and no refetch call. */
export default function ShowLiveDemo() {
  return (
    <ShowLive id={1} title={false}>
      <div className="flex flex-col gap-4">
        <RecordField source="title" />
        <RenameFromElsewhere />
      </div>
    </ShowLive>
  );
}
