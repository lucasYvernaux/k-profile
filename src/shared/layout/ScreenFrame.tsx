"use client";

import type { ReactNode } from "react";
import { MotionConfig } from "framer-motion";
import { useHydrated } from "@/shared/lib/use-hydrated";

/** Placeholder shown until the screen renders in the browser. */
function ScreenSkeleton() {
  return (
    <div className="animate-pulse space-y-4" aria-busy="true" aria-label="Chargement">
      <div className="h-3 w-40 rounded bg-raise" />
      <div className="h-7 w-64 max-w-full rounded bg-raise" />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-40 rounded-2xl bg-raise/60" />
        ))}
      </div>
    </div>
  );
}

/**
 * Frame of the screens merged from NYX-KAIROS (ADR 0010).
 *
 * - They share the app colour tokens (ADR 0013); `life-zone` only scopes
 *   their slider and touch-screen rules (globals.css).
 * - Animations follow the system "reduce motion" setting (WCAG 2.3.3).
 * - These screens read the device clock and load their data in the browser:
 *   they render after hydration, with a skeleton meanwhile.
 *
 * Navigation, skip link and <main> come from the (app) layout.
 */
export function ScreenFrame({ children }: { children: ReactNode; title?: string }) {
  const hydrated = useHydrated();
  return (
    <MotionConfig reducedMotion="user">
      <div className="life-zone">{hydrated ? children : <ScreenSkeleton />}</div>
    </MotionConfig>
  );
}
