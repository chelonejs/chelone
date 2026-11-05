import type { LooseRecord } from "@chelone/core";
import type { PreviewAuthor, PreviewPost } from "./preview-fixtures";

// The data provider types every row as a `LooseRecord`. Each fixture type must
// stay assignable to it without an index signature. `tsc` checks this file.
function acceptsLooseRecord(_record: LooseRecord): void {}

declare const author: PreviewAuthor;
declare const post: PreviewPost;

acceptsLooseRecord(author);
acceptsLooseRecord(post);
