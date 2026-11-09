"use client";

// Proves the rsc import walk stops at a client file.
import { useState } from "react";

export const useClientCount = () => useState(0);
