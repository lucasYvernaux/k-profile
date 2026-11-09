"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { FormField } from "@/components/form-field";
import { StatusMessage } from "@/components/status-message";
import { authClient } from "@/lib/auth-client";
import { clearOfflineData } from "@/lib/offline-queue";

const CONFIRMATION = "SUPPRIMER";

export function DeleteAccount() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    if (form.get("confirmation") !== CONFIRMATION) {
      setError(`Écris ${CONFIRMATION} pour confirmer.`);
      return;
    }
    setPending(true);
    setError(null);
    const { error: deleteError } = await authClient.deleteUser({ password: String(form.get("deletePassword")) });
    setPending(false);
    if (deleteError) {
      setError("Suppression impossible : mot de passe incorrect ou session trop ancienne. Reconnecte-toi puis réessaie.");
      return;
    }
    await clearOfflineData();
    router.push("/");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
      <p>
        Supprime définitivement ton compte et toutes tes données : habitudes, journal, audits, revues.
        La clé de chiffrement de ton compte est détruite avec lui. Pense à exporter tes données avant.
      </p>
      <FormField id="deletePassword" label="Mot de passe" type="password" autoComplete="current-password" required />
      <FormField id="confirmation" label={`Écris ${CONFIRMATION} pour confirmer`} autoComplete="off" required />
      <StatusMessage message={error} />
      <button type="submit" className="btn-danger self-start" disabled={pending}>
        {pending ? "Suppression…" : "Supprimer définitivement mon compte"}
      </button>
    </form>
  );
}
