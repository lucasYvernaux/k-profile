"use client";

import { useEffect, useId, useState } from "react";
import { apiFetch, apiSend } from "@/shared/lib/api-client";

/*
 * Settings of the "life" modules shown on the K Réglages page (ADR 0010):
 * - optional gamification (off by default), stored on the server;
 * - local alerts (phase changes, upkeep, water), stored on this device only,
 *   as in NYX-KAIROS (keys kept so existing devices keep their choice).
 */

function readFlag(key: string): boolean {
  try {
    return localStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}

function writeFlag(key: string, on: boolean) {
  try {
    localStorage.setItem(key, on ? "1" : "0");
  } catch {
    // Storage blocked (private mode): the choice is simply not remembered.
  }
}

export function LifeSettings() {
  const gamificationId = useId();
  const alertsId = useId();
  const dndId = useId();
  const [gamification, setGamification] = useState<boolean | null>(null);
  const [alerts, setAlerts] = useState(false);
  const [dnd, setDnd] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("default");
  const [status, setStatus] = useState("");

  useEffect(() => {
    let active = true;
    apiFetch("/api/settings/gamification")
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { enabled: boolean } | null) => {
        if (active && data) setGamification(data.enabled);
      })
      .catch(() => undefined);
    // Device-only preferences, read after hydration.
    /* eslint-disable react-hooks/set-state-in-effect */
    setAlerts(readFlag("nyx_notifs"));
    setDnd(readFlag("nyx_dnd"));
    setPermission("Notification" in window ? Notification.permission : "unsupported");
    /* eslint-enable react-hooks/set-state-in-effect */
    return () => {
      active = false;
    };
  }, []);

  async function toggleGamification(enabled: boolean) {
    setGamification(enabled);
    const response = await apiSend("/api/settings/gamification", "PUT", { enabled });
    setStatus(
      response.ok
        ? enabled
          ? "Gamification activée : score, séries et badges sont visibles."
          : "Gamification désactivée."
        : "Échec de l'enregistrement.",
    );
    if (!response.ok) setGamification(!enabled);
  }

  async function toggleAlerts(on: boolean) {
    if (on && "Notification" in window) {
      const result = await Notification.requestPermission();
      setPermission(result);
      on = result === "granted";
    }
    writeFlag("nyx_notifs", on);
    setAlerts(on);
    setStatus(on ? "Alertes locales activées sur cet appareil." : "Alertes locales désactivées sur cet appareil.");
  }

  function toggleDnd(on: boolean) {
    writeFlag("nyx_dnd", on);
    setDnd(on);
    setStatus(on ? "Mode « Ne pas déranger » activé." : "Mode « Ne pas déranger » désactivé.");
  }

  return (
    <section aria-labelledby="life-settings-title" className="card flex flex-col gap-4">
      <h2 id="life-settings-title" className="section-title">
        Routine, progression et alertes
      </h2>

      <div className="flex items-start gap-3">
        <input
          id={gamificationId}
          type="checkbox"
          className="mt-1 h-6 w-6 shrink-0"
          checked={gamification === true}
          disabled={gamification === null}
          onChange={(event) => toggleGamification(event.target.checked)}
          aria-describedby={`${gamificationId}-hint`}
        />
        <div>
          <label htmlFor={gamificationId} className="label">
            Afficher la gamification (niveaux, séries, badges)
          </label>
          <p id={`${gamificationId}-hint`} className="hint">
            Désactivée par défaut. Les séries peuvent pousser à culpabiliser après un jour manqué : active-la seulement si
            elle te motive.
          </p>
        </div>
      </div>

      <div className="flex items-start gap-3">
        <input
          id={alertsId}
          type="checkbox"
          className="mt-1 h-6 w-6 shrink-0"
          checked={alerts}
          disabled={permission === "unsupported"}
          onChange={(event) => toggleAlerts(event.target.checked)}
          aria-describedby={`${alertsId}-hint`}
        />
        <div>
          <label htmlFor={alertsId} className="label">
            Alertes locales sur cet appareil
          </label>
          <p id={`${alertsId}-hint`} className="hint">
            Changement de phase de la routine, entretien à faire, eau. Elles s&apos;affichent seulement quand
            l&apos;application est ouverte. Permission du navigateur :{" "}
            {permission === "unsupported" ? "non prise en charge" : permission === "granted" ? "accordée" : permission === "denied" ? "refusée" : "à demander"}.
          </p>
        </div>
      </div>

      <div className="flex items-start gap-3">
        <input
          id={dndId}
          type="checkbox"
          className="mt-1 h-6 w-6 shrink-0"
          checked={dnd}
          onChange={(event) => toggleDnd(event.target.checked)}
        />
        <label htmlFor={dndId} className="label">
          Ne pas déranger (coupe les alertes locales)
        </label>
      </div>

      <p role="status" className="hint min-h-6">
        {status}
      </p>
    </section>
  );
}
