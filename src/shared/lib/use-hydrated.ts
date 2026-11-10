"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/**
 * false during the server render and the hydration pass, true afterwards.
 *
 * Use it to render content that depends on the browser's clock or time zone
 * (current time, today's date): the server runs in UTC, the browser in local time,
 * and rendering such values on both sides causes hydration mismatches.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(subscribe, () => true, () => false);
}
