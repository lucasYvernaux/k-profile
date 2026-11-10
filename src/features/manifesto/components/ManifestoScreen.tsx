"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useScroll, useSpring } from "framer-motion";
import { Flame } from "lucide-react";
import { ScreenFrame } from "@/shared/layout/ScreenFrame";
import { DynIcon } from "@/shared/ui/icon";
import { MANIFESTE, MANIFESTE_SUBTITLE, MANIFESTE_TITLE, manifesteWordCount, type MBlock, type MChapter } from "@/features/manifesto/domain/manifesto";

/* ---------- Rendu des blocs ---------- */

function Block({ b, dropCap }: { b: MBlock; dropCap?: boolean }) {
  switch (b.t) {
    case "p":
      if (dropCap) {
        const first = b.x.charAt(0);
        return (
          <p className="text-[14.5px] lg:text-[15.5px] leading-[1.85] text-dust">
            <span className="float-left font-display text-[54px] leading-[0.85] font-bold text-ember mr-2 mt-1 text-glow">{first}</span>
            {b.x.slice(1)}
          </p>
        );
      }
      return <p className="text-[14.5px] lg:text-[15.5px] leading-[1.85] text-dust">{b.x}</p>;
    case "sub":
      return (
        <h3 className="font-display text-[13px] lg:text-sm font-bold tracking-[0.14em] uppercase text-flame pt-6 flex items-center gap-2.5">
          <span className="w-4 h-px bg-gradient-to-r from-ember to-transparent" />
          {b.x}
        </h3>
      );
    case "list":
      return (
        <ul className="space-y-2">
          {b.items.map((it, i) => (
            <li key={i} className="flex gap-3 text-[13.5px] lg:text-[14px] leading-relaxed text-dust">
              <span className="text-ember mt-0.5 shrink-0">◆</span>
              <span>{it}</span>
            </li>
          ))}
        </ul>
      );
    case "olist":
      return (
        <ol className="space-y-2.5">
          {b.items.map((it, i) => (
            <li key={i} className="flex gap-3.5 text-[13.5px] lg:text-[14px] leading-relaxed text-dust">
              <span className="font-display text-[12px] font-bold text-blood shrink-0 w-6 h-6 rounded-md border border-blood/30 bg-blood/5 flex items-center justify-center mt-0.5">
                {i + 1}
              </span>
              <span>{it}</span>
            </li>
          ))}
        </ol>
      );
    case "dl":
      return (
        <div className="space-y-3">
          {b.items.map((item, i) => (
            <div key={i} className="rounded-xl border border-line/70 bg-raise/20 px-4 py-3.5 hover:border-ember/25 transition-colors">
              <p className="text-[12.5px] font-semibold text-ember mb-1">{item.k}</p>
              <p className="text-[13px] leading-relaxed text-dust">{item.v}</p>
            </div>
          ))}
        </div>
      );
    case "cmd":
      return (
        <div className="space-y-2">
          {b.items.map((it, i) => (
            <div key={i} className="flex gap-3.5 items-start">
              <span className="font-display text-[11px] font-bold text-black bg-gradient-to-br from-flame to-ember rounded-md w-6 h-6 flex items-center justify-center shrink-0 mt-0.5 glow-ember">
                {i + 1}
              </span>
              <p className="text-[13.5px] lg:text-[14px] leading-relaxed text-ash">{it}</p>
            </div>
          ))}
        </div>
      );
    case "quote":
      return (
        <div className="relative rounded-2xl border border-ember/30 bg-gradient-to-b from-ember/[0.07] to-transparent px-6 lg:px-10 py-8 text-center hairline-top">
          <Flame className="w-5 h-5 text-ember mx-auto mb-4 flicker" />
          <p className="font-display text-[15px] lg:text-[17px] leading-[2] text-ash whitespace-pre-line">{b.x}</p>
        </div>
      );
    case "formula":
      return (
        <div tabIndex={0} role="region" aria-label="Formule" className="rounded-2xl border border-ember/30 bg-[#0d0b08] px-6 py-8 text-center overflow-x-auto">
          <p className="font-display text-xl lg:text-2xl font-bold text-ash whitespace-nowrap" style={{ fontFamily: "var(--font-mono-family)" }}>
            S<sub className="text-sm text-ember">NK</sub>
            <span className="text-smoke mx-2">=</span>
            (Discipline<span className="text-smoke mx-2">×</span>Intelligence Temporelle)
            <sup className="text-sm text-flame">Charisme</sup>
            <span className="text-smoke mx-2">+</span>
            <span className="text-jade">Loyauté</span>
          </p>
        </div>
      );
  }
}

/* ---------- Rendu d'un chapitre ---------- */

function Chapter({ c, index, onVisible }: { c: MChapter; index: number; onVisible: (id: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) onVisible(c.id); },
      { rootMargin: "-20% 0px -70% 0px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [c.id, onVisible]);

  return (
    <div ref={ref} id={c.id} className="scroll-mt-24">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-40px" }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="flex items-baseline gap-4 mb-5 pb-4 border-b border-line">
          <span className="font-display text-[11px] font-bold tracking-[0.2em] text-ember uppercase shrink-0 border border-ember/30 bg-ember/5 rounded-lg px-2.5 py-1">
            {c.label}
          </span>
          <h2 className="font-display text-xl lg:text-2xl font-bold text-ash">{c.title}</h2>
        </div>
        <div className="space-y-5">
          {c.blocks.map((b, i) => (
            <Block key={i} b={b} dropCap={index === 0 && i === 0 && b.t === "p"} />
          ))}
        </div>
      </motion.div>
    </div>
  );
}

/* ---------- Page ---------- */

export default function ManifestePage() {
  const [active, setActive] = useState(MANIFESTE[0].id);
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 90, damping: 24 });
  const words = manifesteWordCount();
  const minutes = Math.max(5, Math.round(words / 220));

  function go(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <ScreenFrame title="Le Codex">
      {/* Barre de progression de lecture */}
      <motion.div
        className="fixed top-14 lg:top-14 left-0 lg:left-60 right-0 h-[3px] z-40 origin-left bg-gradient-to-r from-ember via-flame to-ember"
        style={{ scaleX: progress, boxShadow: "0 0 12px rgba(212,175,55,0.6)" }}
      />

      {/* En-tête */}
      <div className="text-center mb-10 lg:mb-14 pt-2">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.8 }}
          className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-ember/25 to-blood/10 border border-ember/35 flex items-center justify-center glow-ember mb-5">
          <DynIcon name="scroll-text" className="w-7 h-7 text-flame" />
        </motion.div>
        <motion.h1
          initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.1 }}
          className="font-display text-2xl lg:text-4xl font-bold tracking-tight text-ash leading-tight"
        >
          {MANIFESTE_TITLE}
        </motion.h1>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }}
          className="text-[12px] lg:text-sm tracking-[0.3em] uppercase text-ember mt-3">
          {MANIFESTE_SUBTITLE}
        </motion.p>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="text-[11px] text-smoke mt-4">
          {MANIFESTE.length} chapitres · ≈ {minutes} min de lecture · à relire chaque mois
        </motion.p>
      </div>

      <div className="lg:grid lg:grid-cols-[240px_1fr] lg:gap-10">
        {/* TOC desktop */}
        <aside className="hidden lg:block">
          <div className="sticky top-24 space-y-1 max-h-[calc(100vh-8rem)] overflow-y-auto pr-2">
            <p className="text-[9px] uppercase tracking-[0.25em] text-smoke mb-3 px-2.5">Sommaire</p>
            {MANIFESTE.map((c) => (
              <button
                key={c.id}
                onClick={() => go(c.id)}
                className={`w-full text-left flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-all group ${
                  active === c.id ? "bg-ember/10 text-flame" : "text-smoke hover:text-dust hover:bg-raise/40"
                }`}
              >
                <span className={`w-[3px] h-4 rounded-full transition-all ${active === c.id ? "bg-ember" : "bg-transparent"}`} style={active === c.id ? { boxShadow: "0 0 8px rgba(212,175,55,0.7)" } : {}} />
                <span className="text-[11.5px] truncate">{c.title}</span>
              </button>
            ))}
          </div>
        </aside>

        {/* TOC mobile (chips) */}
        <div className="lg:hidden sticky top-14 z-30 -mx-4 px-4 py-2.5 bg-[#0a0a0a]/90 backdrop-blur border-b border-line mb-8 overflow-x-auto">
          <div className="flex gap-1.5 w-max">
            {MANIFESTE.map((c) => (
              <button
                key={c.id}
                onClick={() => go(c.id)}
                className={`text-[10.5px] whitespace-nowrap px-3 py-1.5 rounded-full border transition-all ${
                  active === c.id ? "border-ember bg-ember/15 text-ember" : "border-line text-smoke"
                }`}
              >
                {c.title}
              </button>
            ))}
          </div>
        </div>

        {/* Corps */}
        <article className="max-w-2xl mx-auto lg:mx-0 w-full space-y-14 lg:space-y-16">
          {MANIFESTE.map((c, i) => (
            <Chapter key={c.id} c={c} index={i} onVisible={setActive} />
          ))}

          {/* Signature */}
          <motion.div
            initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ duration: 1 }}
            className="text-center pt-6 pb-10"
          >
            <div className="flex items-center justify-center gap-4 mb-6">
              <span className="w-16 h-px bg-gradient-to-r from-transparent to-ember/60" />
              <Flame className="w-5 h-5 text-ember flicker" />
              <span className="w-16 h-px bg-gradient-to-l from-transparent to-ember/60" />
            </div>
            <p className="font-display text-lg lg:text-xl font-bold text-flame text-glow italic">Ad Ignem Per Aspera.</p>
            <p className="text-[12px] text-dust mt-2 italic">Vers le feu, par les chemins difficiles.</p>
            <p className="text-[10px] text-smoke mt-6 max-w-sm mx-auto leading-relaxed">
              Signé, L'Architecte que tu as toujours été, attendant de se réveiller.
            </p>
          </motion.div>
        </article>
      </div>
    </ScreenFrame>
  );
}
