import { describe, expect, it } from "vitest";
import { matchCsvHeaders } from "./match-headers";

describe("matchCsvHeaders", () => {
  it("pairs a field with the header that equals it ignoring case, spaces, underscores and hyphens", () => {
    expect(
      matchCsvHeaders(
        ["firstName", "last_name", "email"],
        ["First Name", "LAST-NAME", " Email "],
      ),
    ).toEqual({
      firstName: "First Name",
      last_name: "LAST-NAME",
      email: " Email ",
    });
  });

  it("falls back to a header that contains the field and then a field that contains the header", () => {
    expect(
      matchCsvHeaders(
        ["email", "phoneNumber"],
        ["Customer Email Address", "phone"],
      ),
    ).toEqual({
      email: "Customer Email Address",
      phoneNumber: "phone",
    });
  });

  it("lets an exact match take a header before a looser match can", () => {
    // "title" is listed first and also sits inside "subtitle", but "subtitle"
    // equals the second field, so the first field must not take it.
    expect(
      matchCsvHeaders(["title", "subtitle"], ["subtitle", "Main Title"]),
    ).toEqual({ title: "Main Title", subtitle: "subtitle" });
  });

  it("ignores a header that is only punctuation", () => {
    expect(matchCsvHeaders(["name"], ["_", " - ", "", "Name"])).toEqual({
      name: "Name",
    });
    expect(matchCsvHeaders(["name"], ["_", " - ", ""])).toEqual({});
  });

  it("leaves a field with no match out of the result", () => {
    const result = matchCsvHeaders(["name", "age"], ["Name"]);

    expect(result).toEqual({ name: "Name" });
    expect("age" in result).toBe(false);
  });

  it("pairs a field named like an Object.prototype member", () => {
    const result = matchCsvHeaders(
      ["constructor", "toString", "__proto__"],
      ["Constructor", "toString", "__proto__"],
    );

    expect(Object.keys(result)).toEqual([
      "constructor",
      "toString",
      "__proto__",
    ]);
    expect(Object.getOwnPropertyDescriptor(result, "__proto__")?.value).toBe(
      "__proto__",
    );
    expect(result.constructor).toBe("Constructor");
    expect(result.toString).toBe("toString");
  });
});
