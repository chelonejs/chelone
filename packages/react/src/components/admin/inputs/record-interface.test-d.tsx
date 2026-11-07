/**
 * The reference inputs, the search input, `<InPlaceEditor>` and `<JobMonitor>`
 * take a record typed by an interface: an interface has no index signature, so
 * a `LooseRecord` bound would refuse it.
 */

import { describe, expectTypeOf, it } from "vitest";
import { JobMonitor, type JobMonitorProps } from "../widgets/job-monitor";
import { InPlaceEditor, type InPlaceEditorProps } from "./in-place-editor";
import type { ReferenceArrayInputProps } from "./reference-array-input";
import type { ReferenceInputProps } from "./reference-input";
import type { SearchInputProps } from "./search-input";

interface Post {
  id: number;
  title: string;
  author_id: number;
  tag_ids: number[];
}

declare function acceptReferenceInput(props: ReferenceInputProps<Post>): void;
declare function acceptReferenceArrayInput(
  props: ReferenceArrayInputProps<Post>,
): void;
declare function acceptSearchInput(props: SearchInputProps<Post>): void;

describe("inputs and widgets typed by an interface", () => {
  it("the reference and search inputs take a path of the record", () => {
    acceptReferenceInput({ source: "author_id", reference: "authors" });
    acceptReferenceArrayInput({ source: "tag_ids", reference: "tags" });
    acceptSearchInput({ source: "title" });
    // @ts-expect-error "author_idd" is not a path of Post
    acceptReferenceInput({ source: "author_idd", reference: "authors" });
    // @ts-expect-error "tag_idz" is not a path of Post
    acceptReferenceArrayInput({ source: "tag_idz", reference: "tags" });
    // @ts-expect-error "titel" is not a path of Post
    acceptSearchInput({ source: "titel" });
  });

  it("InPlaceEditor's onSuccess receives the record", () => {
    expectTypeOf<InPlaceEditorProps<Post>["onSuccess"]>().toEqualTypeOf<
      ((record: Post) => void) | undefined
    >();
    <InPlaceEditor<Post>
      source="title"
      onSuccess={(record) => {
        expectTypeOf(record).toEqualTypeOf<Post>();
      }}
    />;
  });

  it("JobMonitor's statusSource is a key of the record", () => {
    <JobMonitor<Post> statusSource="title" />;
    // @ts-expect-error `status` is not a key of Post
    <JobMonitor<Post> statusSource="status" />;
    expectTypeOf<JobMonitorProps<Post>["statusSource"]>().not.toBeAny();
  });
});
