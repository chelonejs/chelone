// Proves the rsc import walk looks: a server file may not import a hook.
import { useState } from "react";

export const useCount = () => useState(0);
