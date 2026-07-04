"use client";

import { Slot as SlotPrimitive } from "radix-ui";
import type React from "react";

const Slot: typeof SlotPrimitive.Slot = SlotPrimitive.Slot;
const Slottable = SlotPrimitive.Slottable as React.FC<{
  children: React.ReactNode;
}>;

export { Slot, SlotPrimitive, Slottable };
