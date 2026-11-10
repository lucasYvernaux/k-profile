"use client";

import { ReactNode, useId } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Cross as X } from "@getpapillon/papicons";
import { DynIcon } from "./icon";
import { useDialogFocus } from "./use-dialog-focus";

export function Card({ children, className = "", hairline = false }: { children: ReactNode; className?: string; hairline?: boolean }) {
  return <div className={`card-frame min-w-0 ${hairline ? "hairline-top" : ""} p-4 sm:p-5 ${className}`}>{children}</div>;
}

export function SectionTitle({ icon, title, right, sub }: { icon: string; title: string; right?: ReactNode; sub?: string }) {
  return (
    <div className="flex items-center justify-between gap-x-3 gap-y-2 flex-wrap mb-4">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-7 h-7 shrink-0 rounded-lg bg-ember/10 border border-ember/25 flex items-center justify-center">
          <DynIcon name={icon} className="w-3.5 h-3.5 text-ember" />
        </div>
        <div className="min-w-0">
          <h2 className="font-display text-[13px] font-bold tracking-[0.18em] uppercase text-ash leading-none">{title}</h2>
          {sub && <p className="text-[10px] text-smoke mt-1">{sub}</p>}
        </div>
      </div>
      {right}
    </div>
  );
}

type BtnVariant = "primary" | "ghost" | "danger" | "success" | "outline";

export function Btn({
  children,
  onClick,
  variant = "ghost",
  className = "",
  disabled = false,
  small = false,
  "aria-label": ariaLabel,
  type = "button",
}: {
  children: ReactNode;
  /** Required when the button only holds an icon */
  "aria-label"?: string;
  type?: "button" | "submit";
  onClick?: () => void;
  variant?: BtnVariant;
  className?: string;
  disabled?: boolean;
  small?: boolean;
}) {
  const styles: Record<BtnVariant, string> = {
    primary: "bg-gradient-to-r from-ember to-[#a8862a] text-black font-semibold hover:brightness-110",
    ghost: "bg-raise/60 text-dust border border-line2 hover:border-ember/50 hover:text-ash",
    outline: "border border-ember/40 text-ember hover:bg-ember/10",
    danger: "bg-blood/10 text-blood border border-blood/30 hover:bg-blood/20",
    success: "bg-jade/10 text-jade border border-jade/30 hover:bg-jade/20",
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg transition-all active:scale-[0.97] disabled:opacity-40 disabled:pointer-events-none ${
        small ? "text-[11px] px-2.5 py-1.5" : "text-xs px-3.5 py-2"
      } ${styles[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[10px] uppercase tracking-[0.16em] text-smoke mb-1.5">{label}</span>
      {children}
    </label>
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full bg-inset border border-border rounded-lg px-3 py-2 text-base sm:text-sm text-ash placeholder:text-smoke focus:outline-none focus:border-ember transition-colors ${props.className ?? ""}`}
    />
  );
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`w-full bg-inset border border-border rounded-lg px-3 py-2 text-base sm:text-sm text-ash placeholder:text-smoke focus:outline-none focus:border-ember transition-colors resize-y min-h-[70px] ${props.className ?? ""}`}
    />
  );
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`w-full bg-inset border border-border rounded-lg px-3 py-2 text-base sm:text-sm text-ash focus:outline-none focus:border-ember transition-colors ${props.className ?? ""}`}
    />
  );
}

export function Modal({
  open,
  onClose,
  title,
  children,
  wide = false,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  wide?: boolean;
}) {
  const dialogRef = useDialogFocus<HTMLDivElement>(open, onClose);
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            ref={dialogRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            // phones: sheet from the bottom edge (thumb reach), desktop: centred card
            className={`card-frame hairline-top w-full ${wide ? "sm:max-w-2xl" : "sm:max-w-md"} max-h-[92vh] sm:max-h-[85vh] overflow-y-auto overscroll-contain outline-none p-4 sm:p-5 sheet-mobile pb-[calc(env(safe-area-inset-bottom)+1rem)] sm:pb-5`}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-sm font-bold tracking-[0.14em] uppercase text-ash">{title}</h2>
              <button onClick={onClose} aria-label="Fermer" className="p-2 -mr-1 rounded-lg text-smoke hover:text-ash hover:bg-raise transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function Slider({
  label,
  value,
  onChange,
  min = 1,
  max = 10,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  const id = useId();
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label htmlFor={id} className="text-[10px] uppercase tracking-[0.16em] text-smoke">{label}</label>
        <span className="font-display text-sm font-bold text-flame">{value}</span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ ["--fill" as string]: `${pct}%` }}
        className="w-full"
      />
    </div>
  );
}

export function ProgressBar({ value, className = "", color = "#d4af37" }: { value: number; className?: string; color?: string }) {
  return (
    <div className={`h-1.5 rounded-full bg-line overflow-hidden ${className}`}>
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        className="h-full rounded-full"
        style={{ background: `linear-gradient(90deg, ${color}cc, ${color})`, boxShadow: `0 0 8px ${color}66` }}
      />
    </div>
  );
}

export function EmptyState({ icon, title, sub }: { icon: string; title: string; sub?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      <div className="w-12 h-12 rounded-xl border border-line bg-raise/40 flex items-center justify-center mb-3">
        <DynIcon name={icon} className="w-5 h-5 text-smoke" />
      </div>
      <p className="text-sm text-dust">{title}</p>
      {sub && <p className="text-[11px] text-smoke mt-1">{sub}</p>}
    </div>
  );
}
