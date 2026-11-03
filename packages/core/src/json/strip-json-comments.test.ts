import { describe, expect, it } from "vitest";
import { stripJsonComments } from "./strip-json-comments";

describe("stripJsonComments", () => {
  it("removes comments and trailing commas outside strings and leaves string contents alone", () => {
    const text = `{
  // line comment
  "url": "http://example.com/*not a comment*/", /* block */
  "list": [1, 2,],
  "tail": "a,]",
}`;
    expect(JSON.parse(stripJsonComments(text))).toEqual({
      url: "http://example.com/*not a comment*/",
      list: [1, 2],
      tail: "a,]",
    });
  });
});
