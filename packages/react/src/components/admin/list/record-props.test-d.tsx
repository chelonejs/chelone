import { describe, it } from "vitest";
import { ApprovalQueue } from "./approval-queue";
import { PivotGrid } from "./pivot-grid";
import { RecordTimeline } from "./record-timeline";

interface Post {
  id: number;
  title: string;
  status: string;
  views: number;
  createdAt: string;
}

describe("list views over an interface record", () => {
  it("each view takes an interface as its record", () => {
    <PivotGrid<Post> rowSource="status" columnSource="title" />;
    <RecordTimeline<Post> messageSource="title" timestampSource="createdAt" />;
    <ApprovalQueue<Post> titleSource="title" statusSource="status" />;
  });

  it("each view rejects a source the record lacks", () => {
    // @ts-expect-error Post has no `nope`
    <PivotGrid<Post> rowSource="nope" columnSource="title" />;
    // @ts-expect-error Post has no `nope`
    <RecordTimeline<Post> messageSource="nope" timestampSource="createdAt" />;
    // @ts-expect-error Post has no `nope`
    <ApprovalQueue<Post> titleSource="nope" />;
  });
});
