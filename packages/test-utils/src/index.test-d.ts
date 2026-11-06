import { expectTypeOf, it } from "vitest";
import { defined, elementOf, intersectionEntry } from "./index";

it("defined strips null and undefined and keeps every other type", () => {
  const maybeString: string | null | undefined = "a";
  expectTypeOf(defined(maybeString)).toEqualTypeOf<string>();

  const maybeNumber: number | null = 1;
  expectTypeOf(defined(maybeNumber)).toEqualTypeOf<number>();

  const maybeBoolean: boolean | undefined = false;
  expectTypeOf(defined(maybeBoolean)).toEqualTypeOf<boolean>();

  const element: HTMLElement = document.body;
  expectTypeOf(defined(element)).toEqualTypeOf<HTMLElement>();
});

it("elementOf narrows a node to the element type it is asked for", () => {
  const node: Node | null | undefined = document.querySelector("input");

  expectTypeOf(
    elementOf(node, HTMLInputElement),
  ).toEqualTypeOf<HTMLInputElement>();
  expectTypeOf(
    elementOf(node, HTMLAnchorElement),
  ).toEqualTypeOf<HTMLAnchorElement>();
});

it("intersectionEntry hands the callback a whole entry", () => {
  expectTypeOf(
    intersectionEntry(true),
  ).toEqualTypeOf<IntersectionObserverEntry>();
});
