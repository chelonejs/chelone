import { hasProperty } from "../guards";

/**
 * RHF-compatible event extraction: DOM/synthetic change events yield
 * `target.checked` for checkboxes and `target.value` otherwise; anything
 * else (a raw value, a custom picker's payload) passes through untouched.
 */
// type-escape: dom: the input is whatever a change handler receives, a DOM or synthetic event or a raw value, and the output is the value it carries, which only the field knows
export function extractEventValue(input: unknown): unknown {
  if (!hasProperty(input, "target")) return input;
  const { target } = input;
  const hasValue = hasProperty(target, "value");
  const hasChecked = hasProperty(target, "checked");
  if (!hasValue && !hasChecked) return input;
  const isCheckbox = hasProperty(target, "type") && target.type === "checkbox";
  if (isCheckbox) return hasChecked ? target.checked : undefined;
  return hasValue ? target.value : undefined;
}
