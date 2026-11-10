"use client";

import { useEffect, useRef } from "react";
import { PHASES, TIMER_CATEGORIES } from "@/shared/domain/constants";
import { appliesOn, minutesOf, nowHM, todayKey } from "@/shared/lib/dates";
import { expectedWaterAt, type IntakeConfig } from "@/features/intake/domain/intake";
import { apiFetch } from "@/shared/lib/api-client";

type TimerLite = { id: number; name: string; category: string; status: string; remaining: number; isActive: boolean };

function notifEnabled(): boolean {
  if (typeof window === "undefined") return false;
  const dnd = localStorage.getItem("nyx_dnd") === "1";
  if (dnd) return false;
  return localStorage.getItem("nyx_notifs") === "1" && "Notification" in window && Notification.permission === "granted";
}

function fire(title: string, body: string) {
  if (!notifEnabled()) return;
  try {
    if (navigator.serviceWorker?.controller || true) {
      new Notification(title, { body, icon: "/icon.png", badge: "/icon.png" });
    }
  } catch {
    /* noop */
  }
}

export function NotificationWatcher() {
  const lastPhase = useRef<string>("");
  const timersWarned = useRef<string>("");

  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default" && localStorage.getItem("nyx_notifs") === "1") {
      Notification.requestPermission().catch(() => {});
    }

    async function tick() {
      // No polling at all unless the user turned local alerts on (Réglages).
      if (!notifEnabled()) return;
      // Phase actuelle — depuis la routine configurée en base (repli : constantes)
      const hm = nowHM();
      const m = minutesOf(hm);
      let routine = PHASES.map((p) => ({ key: p.key, title: p.title, start: p.start, end: p.end }));
      try {
        const res = await apiFetch("/api/phase-defs", { cache: "no-store" });
        if (res.ok) {
          const defs = (await res.json()) as { key: string; title: string; startTime: string; endTime: string; isActive: boolean; daysOfWeek: string | null }[];
          const act = defs
            .filter((d) => d.isActive && appliesOn(d.daysOfWeek, todayKey()))
            .map((d) => ({ key: d.key, title: d.title, start: d.startTime, end: d.endTime }));
          if (act.length > 0) routine = act;
        }
      } catch { /* noop */ }
      const phase = routine.find((p) => m >= minutesOf(p.start) && m < minutesOf(p.end));
      const key = phase?.key ?? "nuit";
      if (lastPhase.current && lastPhase.current !== key) {
        if (phase) {
          fire(`Phase : ${phase.title}`, `Il est ${hm}. Nouvelle phase active dans la routine.`);
        }
      }
      lastPhase.current = key;

      // Rappel journal à 20h25 / bilan dimanche 19h
      const now = new Date();
      const reminderFlag = localStorage.getItem(`nyx_remind_${todayKey()}_${now.getHours()}`);
      if (!reminderFlag) {
        if (now.getHours() === 20 && now.getMinutes() >= 25 && now.getMinutes() < 35) {
          fire("Journal de bord", "Ouvre le Livre des Ombres — analyse émotionnelle du soir.");
          localStorage.setItem(`nyx_remind_${todayKey()}_${now.getHours()}`, "1");
        }
        if (now.getDay() === 0 && now.getHours() === 19) {
          fire("Rapport de Guerre", "Dimanche soir : rédige ton bilan hebdomadaire.");
          localStorage.setItem(`nyx_remind_${todayKey()}_${now.getHours()}`, "1");
        }
      }

      // Hydratation : rappel si la cadence n'est pas tenue
      try {
        const res = await apiFetch(`/api/intake?date=${todayKey()}`, { cache: "no-store" });
        if (res.ok) {
          const data = (await res.json()) as {
            config: IntakeConfig;
            today: { kind: string; amount: number; hour: number; minute: number }[];
          };
          const cfg = data.config;
          const total = data.today.filter((l) => l.kind === "water").reduce((s, l) => s + l.amount, 0);
          const expected = expectedWaterAt(cfg, now.getHours(), now.getMinutes());
          const deficit = expected - total;
          const inWindow = hm >= cfg.waterStart && hm <= cfg.waterEnd;
          const last = Number(localStorage.getItem("nyx_water_last") ?? 0);
          const elapsedMin = (Date.now() - last) / 60000;

          if (inWindow && deficit >= 250 && elapsedMin >= (cfg.waterReminderMin || 90)) {
            const pct = Math.round((total / cfg.waterGoal) * 100);
            fire(
              "Hydratation en retard",
              `${Math.round(deficit)} ml de retard sur ta cadence. ${(total / 1000).toFixed(2)} L / ${(cfg.waterGoal / 1000).toFixed(1)} L (${pct} %). Bois un verre.`
            );
            localStorage.setItem("nyx_water_last", String(Date.now()));
          }

          // Bilan de fin de fenêtre : objectif non atteint
          const endFlag = `nyx_water_end_${todayKey()}`;
          if (hm >= cfg.waterEnd && total < cfg.waterGoal && !localStorage.getItem(endFlag)) {
            fire("Objectif d'hydratation manqué", `${(total / 1000).toFixed(2)} L sur ${(cfg.waterGoal / 1000).toFixed(1)} L. Il reste ${Math.round(cfg.waterGoal - total)} ml.`);
            localStorage.setItem(endFlag, "1");
          }

          // Caféine : alerte au premier dépassement de l'heure limite
          const caffFlag = `nyx_caff_${todayKey()}`;
          const lateCaff = data.today.some((l) => l.kind === "caffeine" && `${String(l.hour).padStart(2, "0")}:${String(l.minute).padStart(2, "0")}` > cfg.caffeineCutoff);
          const caffTotal = data.today.filter((l) => l.kind === "caffeine").reduce((s, l) => s + l.amount, 0);
          if (!localStorage.getItem(caffFlag) && (lateCaff || caffTotal > cfg.caffeineLimit)) {
            fire(
              caffTotal > cfg.caffeineLimit ? "Limite de caféine dépassée" : "Caféine tardive",
              caffTotal > cfg.caffeineLimit
                ? `${Math.round(caffTotal)} mg sur ${cfg.caffeineLimit} mg autorisés aujourd'hui.`
                : `Prise après ${cfg.caffeineCutoff} — ton sommeil va en payer le prix.`
            );
            localStorage.setItem(caffFlag, "1");
          }
        }
      } catch { /* noop */ }

      // Timers dus
      try {
        const res = await apiFetch("/api/timers", { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          const due = (data.timers as TimerLite[]).filter((t) => t.isActive && (t.status === "late" || t.status === "soon"));
          const sig = due.map((t) => `${t.id}:${t.status}`).join("|");
          if (sig !== timersWarned.current && due.length > 0) {
            const first = due[0];
            fire(
              `${due.length} cycle${due.length > 1 ? "s" : ""} domestique${due.length > 1 ? "s" : ""} en attente`,
              `${first.name} — ${TIMER_CATEGORIES[first.category] ?? first.category}${due.length > 1 ? ` (+${due.length - 1} autres)` : ""}`
            );
            timersWarned.current = sig;
          }
        }
      } catch {
        /* noop */
      }
    }

    tick();
    const t = setInterval(tick, 30000);
    return () => clearInterval(t);
  }, []);

  return null;
}
