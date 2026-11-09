"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { SyncItem } from "@/domain/sync";
import { sendOrQueue, type SendResult } from "./offline-queue";

const MESSAGES: Record<SendResult, string> = {
  sent: "Enregistré.",
  queued: "Gardé sur cet appareil, envoi au retour du réseau.",
  rejected: "Saisie refusée : vérifie les valeurs.",
  "signed-out": "Session expirée : reconnecte-toi.",
};

/** Sends a daily input (or queues it offline) and exposes an announcement. */
export function useSync() {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function send(item: SyncItem, { refresh = true } = {}): Promise<SendResult> {
    setPending(true);
    const result = await sendOrQueue(item);
    setPending(false);
    setMessage(MESSAGES[result]);
    if (result === "sent" && refresh) {
      router.refresh();
    }
    if (result === "signed-out") {
      router.push("/connexion");
    }
    return result;
  }

  return { send, message, pending };
}
