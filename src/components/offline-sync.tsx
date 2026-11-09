"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { flushQueue, pendingCount } from "@/lib/offline-queue";

/** Registers the service worker, shows the offline state and replays the queue. */
export function OfflineSync() {
  const router = useRouter();
  const [online, setOnline] = useState(true);
  const [pending, setPending] = useState(0);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/", updateViaCache: "none" })
        .catch(() => undefined);
    }

    async function sync() {
      setOnline(navigator.onLine);
      if (!navigator.onLine) {
        setPending(await pendingCount().catch(() => 0));
        return;
      }
      const sent = await flushQueue().catch(() => 0);
      setPending(await pendingCount().catch(() => 0));
      if (sent > 0) {
        router.refresh();
      }
    }

    void sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, [router]);

  const message = !online
    ? "Hors ligne : tes saisies du jour sont gardées sur cet appareil et partiront au retour du réseau."
    : pending > 0
      ? `${pending} saisie(s) en attente d'envoi.`
      : "";

  return (
    <div role="status" aria-live="polite" className={message ? "warning mx-auto mt-4 w-full max-w-5xl" : "sr-only"}>
      {message}
    </div>
  );
}
