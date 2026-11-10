"use client";

import { useEffect, useState, type FormEvent } from "react";
import { FormField } from "@/components/form-field";
import { StatusMessage } from "@/components/status-message";

function base64UrlToBytes(value: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const raw = atob((value + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (char) => char.charCodeAt(0));
}

type Support = "checking" | "unsupported" | "unconfigured" | "ready";

export function PushSettings({ publicKey }: { publicKey?: string }) {
  const [support, setSupport] = useState<Support>("checking");
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    async function detect() {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        setSupport("unsupported");
        return;
      }
      if (!publicKey) {
        setSupport("unconfigured");
        return;
      }
      const registration = await navigator.serviceWorker.ready;
      setSubscription(await registration.pushManager.getSubscription());
      setSupport("ready");
    }
    void detect();
  }, [publicKey]);

  async function subscribe(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!publicKey) {
      return;
    }
    const reminderTime = String(new FormData(event.currentTarget).get("reminderTime"));
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      setMessage("Notifications refusées par le navigateur.");
      return;
    }
    const registration = await navigator.serviceWorker.ready;
    const created = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: base64UrlToBytes(publicKey),
    });
    const response = await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...created.toJSON(), reminderTime }),
    });
    setSubscription(created);
    setMessage(response.ok ? `Rappel activé à ${reminderTime}.` : "Activation impossible, réessaie.");
  }

  async function unsubscribe() {
    if (!subscription) {
      return;
    }
    await fetch("/api/push/subscribe", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endpoint: subscription.endpoint }),
    });
    await subscription.unsubscribe();
    setSubscription(null);
    setMessage("Rappel désactivé.");
  }

  if (support === "checking") {
    return <p role="status">Vérification…</p>;
  }
  if (support === "unsupported") {
    return <p>Ce navigateur ne gère pas les notifications push. Sur iPhone, installe d&apos;abord Hespéride sur l&apos;écran d&apos;accueil.</p>;
  }
  if (support === "unconfigured") {
    return <p>Les notifications ne sont pas configurées sur ce serveur (clés VAPID absentes).</p>;
  }
  return (
    <div className="flex flex-col gap-4">
      <p>Un rappel discret pour le journal du soir. Le texte de la notification ne contient aucune donnée personnelle.</p>
      {subscription ? (
        <button type="button" className="btn-secondary self-start" onClick={unsubscribe}>
          Désactiver le rappel sur cet appareil
        </button>
      ) : (
        <form onSubmit={subscribe} className="flex flex-col gap-3">
          <FormField id="reminderTime" label="Heure du rappel" type="time" defaultValue="21:30" required />
          <button type="submit" className="btn-primary self-start">Activer le rappel sur cet appareil</button>
        </form>
      )}
      <StatusMessage message={message} tone="success" />
    </div>
  );
}
