import type { LooseRecord } from "@chelone/core";
import type { Author, Place, Post } from "@chelone/demo-data";

// The data provider types every row as a `LooseRecord`. Each seed type must
// stay assignable to it without an index signature. `vue-tsc` checks this file.
function acceptsLooseRecord(_record: LooseRecord): void {}

declare const author: Author;
declare const post: Post;
declare const place: Place;

acceptsLooseRecord(author);
acceptsLooseRecord(post);
acceptsLooseRecord(place);
