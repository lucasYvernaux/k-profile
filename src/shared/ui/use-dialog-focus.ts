"use client";

import { useEffect, useRef } from "react";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/*
 * Recently focused elements, most recent last. Fields with autoFocus (and the dialog
 * container itself) take the focus during React's commit, before the effect below runs,
 * so document.activeElement is already inside the dialog: the opener is the most recent
 * element focused outside it.
 */
const recentFocus: HTMLElement[] = [];
if (typeof document !== "undefined") {
  document.addEventListener("focusin", (e) => {
    if (!(e.target instanceof HTMLElement)) return;
    recentFocus.push(e.target);
    if (recentFocus.length > 10) recentFocus.shift();
  });
}

function lastFocusedOutside(node: HTMLElement): HTMLElement | null {
  for (let i = recentFocus.length - 1; i >= 0; i--) {
    const el = recentFocus[i];
    if (el.isConnected && !node.contains(el)) return el;
  }
  return null;
}

/**
 * Keyboard behaviour of a modal dialog (WAI-ARIA dialog pattern, WCAG 2.1.2 / 2.4.3):
 * focus moves into the dialog when it opens, Tab cycles inside it, Escape closes it,
 * and focus returns to the element that opened it.
 *
 * Put the returned ref on the dialog element, with tabIndex={-1}.
 */
export function useDialogFocus<T extends HTMLElement>(open: boolean, onClose: () => void) {
  const ref = useRef<T>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const node = ref.current;
    const active = document.activeElement as HTMLElement | null;
    const previous = node && active && node.contains(active) ? lastFocusedOutside(node) : active;
    // a field with autoFocus already took the focus: keep it
    if (node && !node.contains(document.activeElement)) node.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (e.key !== "Tab" || !node) return;
      const items = [...node.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => el.offsetParent !== null);
      if (items.length === 0) {
        e.preventDefault();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && (document.activeElement === first || document.activeElement === node)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      previous?.focus?.();
    };
  }, [open]);

  return ref;
}
