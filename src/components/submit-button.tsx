"use client";

import { useFormStatus } from "react-dom";
import type { ReactNode } from "react";

interface SubmitButtonProps {
  children: ReactNode;
  pendingLabel?: string;
  variant?: "primary" | "secondary" | "danger";
  className?: string;
}

export function SubmitButton({
  children,
  pendingLabel = "Enregistrement…",
  variant = "primary",
  className = "",
}: SubmitButtonProps) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={`btn-${variant} ${className}`} disabled={pending} aria-disabled={pending}>
      {pending ? pendingLabel : children}
    </button>
  );
}
