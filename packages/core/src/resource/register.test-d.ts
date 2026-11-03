import { expectTypeOf, it } from "vitest";
import type { LooseRecord } from "./record";
import type {
  RegisteredRecord,
  RegisteredResourceName,
  RegisteredResources,
} from "./register";
import type { ResourceMap } from "./registry";
import type { AnySourcePath } from "./source-path";

// No file in this package augments `Register`: augmentation is global to a
// TypeScript program, and these types must resolve for apps that never register.

it("with no augmentation RegisteredResources is ResourceMap", () => {
  expectTypeOf<RegisteredResources>().toEqualTypeOf<ResourceMap>();
});

it("with no augmentation RegisteredResourceName is string", () => {
  expectTypeOf<RegisteredResourceName>().toEqualTypeOf<string>();
});

it("with no augmentation RegisteredRecord is LooseRecord", () => {
  expectTypeOf<RegisteredRecord<string>>().toEqualTypeOf<LooseRecord>();
});

it("with no augmentation AnySourcePath is string", () => {
  expectTypeOf<AnySourcePath>().toEqualTypeOf<string>();
});
