"use client";

import { Direction } from "radix-ui";
import type * as React from "react";

interface DirectionProviderProps
  extends React.ComponentProps<typeof Direction.DirectionProvider> {
  direction?: React.ComponentProps<typeof Direction.DirectionProvider>["dir"];
}

function DirectionProvider({
  dir,
  direction,
  children,
}: DirectionProviderProps) {
  return (
    <Direction.DirectionProvider dir={direction ?? dir}>
      {children}
    </Direction.DirectionProvider>
  );
}

const useDirection = Direction.useDirection;

export { DirectionProvider, type DirectionProviderProps, useDirection };
