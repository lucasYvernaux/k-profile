"use client";

/* Small reusable person widgets: avatar, intimacy, contact channel, domain and "en froid" badges. */

import { DynIcon } from "@/shared/ui/icon";
import {
  CHANNELS,
  COLD_COLOR,
  channelHref,
  displayName,
  freshness,
  initials,
  intimacyMeta,
  type Channel,
  type Freshness,
  type Person,
} from "../domain/network";
import { interestColor, type Interest } from "../domain/interests";

const SELF_COLOR = "#e6c35c";

function freshnessLabel(fr: Freshness): string {
  return fr.status === "late" ? "À recontacter" : fr.status === "soon" ? "Bientôt" : "À jour";
}

/** Status shown by the corner badge: one wording for the tooltip and the screen-reader name. */
function avatarStatus(p: Person, fr: Freshness): string | null {
  if (p.coldSince) return "En froid";
  if (p.deceased) return "Décédé·e";
  return fr.status !== "none" ? freshnessLabel(fr) : null;
}

/** `decorative`: the surrounding control already names the person (no duplicate announcement). */
export function Avatar({ p, size = 44, decorative = false }: { p: Person; size?: number; decorative?: boolean }) {
  const m = intimacyMeta(p.intimacy);
  const fr = freshness(p);
  const ring = p.isSelf ? SELF_COLOR : p.coldSince ? COLD_COLOR : p.deceased ? "#525252" : m.color;
  const status = avatarStatus(p, fr);
  return (
    <div
      className="relative shrink-0"
      style={{ width: size, height: size }}
      {...(decorative
        ? { "aria-hidden": true }
        : { role: "img", "aria-label": status ? `${displayName(p)} (${status})` : displayName(p) })}
    >
      <div
        className={`w-full h-full rounded-full flex items-center justify-center font-display font-bold ${p.deceased ? "grayscale opacity-70" : ""}`}
        style={{
          background: `radial-gradient(circle at 30% 25%, ${ring}33, #141414 70%)`,
          border: `2px ${p.coldSince ? "dashed" : "solid"} ${ring}`,
          color: "#e5e5e5",
          fontSize: size * 0.36,
          boxShadow: p.intimacy >= 5 && !p.coldSince && !p.deceased ? `0 0 14px ${m.color}55` : undefined,
        }}
      >
        {p.isSelf ? "MOI" : initials(p)}
      </div>
      {p.coldSince ? (
        <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#0c1a24] border border-sky-300/60 flex items-center justify-center" title="En froid" aria-hidden="true">
          <DynIcon name="snowflake" className="w-2.5 h-2.5" style={{ color: COLD_COLOR }} />
        </span>
      ) : p.deceased ? (
        <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#1a1a1a] border border-line2 text-[9px] text-dust flex items-center justify-center" title="Décédé·e" aria-hidden="true">
          †
        </span>
      ) : (
        fr.status !== "none" && (
          <span
            className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#1a1a1a]"
            style={{ background: fr.color }}
            title={freshnessLabel(fr)}
            aria-hidden="true"
          />
        )
      )}
    </div>
  );
}

export function IntimacyDots({ level }: { level: number }) {
  const m = intimacyMeta(level);
  return (
    <span className="inline-flex items-center gap-1.5" role="img" aria-label={m.label}>
      <span className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((i) => (
          <span key={i} className="w-1.5 h-1.5 rounded-full" style={{ background: i <= level ? m.color : "#333333" }} />
        ))}
      </span>
      <span className="text-[10px] font-semibold" style={{ color: m.color }}>{m.label}</span>
    </span>
  );
}

export function ChannelBadge({ c, compact = false }: { c: Channel; compact?: boolean }) {
  const m = CHANNELS[c.kind] ?? CHANNELS.autre;
  const href = channelHref(c);
  // The value is read out after the visible label, so the accessible name starts with
  // the visible text (WCAG 2.5.3 Label in Name); `title` keeps the hover tooltip.
  const inner = (
    <>
      <DynIcon name={m.icon} className="w-3 h-3" style={{ color: m.color }} />
      <span>{compact ? m.short : m.label}</span>
      <span className="sr-only"> : {c.value}</span>
    </>
  );
  const cls = "inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border transition-colors";
  const style = { borderColor: `${m.color}55`, background: `${m.color}12`, color: "#e5e5e5" };
  return href ? (
    <a href={href} target={href.startsWith("http") ? "_blank" : undefined} rel="noreferrer" onClick={(e) => e.stopPropagation()} className={`${cls} hover:brightness-125`} style={style} title={c.value}>
      {inner}
    </a>
  ) : (
    <span className={cls} style={style} title={c.value}>{inner}</span>
  );
}

export function InterestChip({
  interest,
  active = false,
  count,
  onClick,
}: {
  interest: Pick<Interest, "name" | "key" | "color">;
  active?: boolean;
  count?: number;
  onClick?: () => void;
}) {
  const color = interestColor(interest);
  const cls = `inline-flex items-center gap-1 text-[10px] font-semibold px-2 rounded-full border transition-colors ${onClick ? "py-1.5 sm:py-0.5" : "py-0.5"}`;
  const style = active
    ? { borderColor: color, background: `${color}30`, color: "#fafafa" }
    : { borderColor: `${color}55`, background: `${color}12`, color: "#d4d4d4" };
  const content = (
    <>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
      {interest.name}
      {count !== undefined && <span>· {count}</span>}
    </>
  );
  return onClick ? (
    <button type="button" onClick={(e) => { e.stopPropagation(); onClick(); }} className={`${cls} hover:brightness-125`} style={style}>
      {content}
    </button>
  ) : (
    <span className={cls} style={style}>{content}</span>
  );
}

export function ColdBanner({ p, onEnd }: { p: Person; onEnd?: () => void }) {
  if (!p.coldSince) return null;
  return (
    <div className="flex items-start gap-3 rounded-xl border border-sky-300/30 bg-sky-300/[0.05] px-3 py-2.5">
      <DynIcon name="snowflake" className="w-4 h-4 mt-0.5 shrink-0" style={{ color: COLD_COLOR }} />
      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-semibold" style={{ color: COLD_COLOR }}>
          En froid depuis le {new Date(`${p.coldSince}T00:00:00`).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
        </p>
        {p.coldReason ? (
          <p className="text-[11px] text-dust whitespace-pre-wrap mt-0.5">{p.coldReason}</p>
        ) : (
          <p className="text-[10px] text-smoke mt-0.5">Pas de motif noté. Pas de rappel de contact tant que ça dure.</p>
        )}
      </div>
      {onEnd && (
        <button onClick={onEnd} className="text-[10px] px-2.5 py-1 rounded-lg border border-line text-dust hover:text-ash hover:border-jade/50 shrink-0">
          Réconciliés
        </button>
      )}
    </div>
  );
}
