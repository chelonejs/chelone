import { describe, expect, it } from "vitest";
import {
  lockResourceTopic,
  lockTopic,
  presenceTopic,
  recordTopic,
  resourceTopic,
} from "./topics";

describe("topic helpers", () => {
  it("resourceTopic formats a resource topic", () => {
    expect(resourceTopic("posts")).toBe("resource/posts");
  });

  it('recordTopic gives the same topic for 1 and "1"', () => {
    expect(recordTopic("posts", 42)).toBe("resource/posts/42");
    expect(recordTopic("posts", 1)).toBe(recordTopic("posts", "1"));
  });

  it("lockResourceTopic and lockTopic format the lock topics", () => {
    expect(lockResourceTopic("posts")).toBe("lock/posts");
    expect(lockTopic("posts", 42)).toBe("lock/posts/42");
  });

  it('presenceTopic builds presence/resource/id and treats 1 and "1" alike', () => {
    expect(presenceTopic("posts", 42)).toBe("presence/posts/42");
    expect(presenceTopic("posts", 1)).toBe(presenceTopic("posts", "1"));
  });
});
