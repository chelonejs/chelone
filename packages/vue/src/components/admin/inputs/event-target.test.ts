/**
 * `targetOf` — the guard the admin inputs use to read an event's target as the
 * element they expect instead of casting it. Tested through a real dispatched
 * event, which is how a handler receives one.
 */

import { describe, expect, expectTypeOf, it } from "vitest";
import { targetOf } from "./event-target";

/** The event `element` received when `type` was dispatched on it. */
function dispatched(element: Element, type: string): Event {
  let received: Event | undefined;
  element.addEventListener(type, (event) => {
    received = event;
  });
  element.dispatchEvent(new Event(type));
  if (!received) throw new Error("fixture: the event was not delivered");
  return received;
}

describe("targetOf", () => {
  it("returns the target when it is an instance of the class", () => {
    const input = document.createElement("input");
    document.body.append(input);
    const event = dispatched(input, "input");

    const target = targetOf(event, HTMLInputElement);

    expectTypeOf(target).toEqualTypeOf<HTMLInputElement | undefined>();
    expect(target).toBe(input);
  });

  it("returns undefined for a target of another class or none", () => {
    const select = document.createElement("select");
    document.body.append(select);
    const event = dispatched(select, "change");

    expect(targetOf(event, HTMLInputElement)).toBeUndefined();
    expect(targetOf(new Event("input"), HTMLInputElement)).toBeUndefined();
  });
});
