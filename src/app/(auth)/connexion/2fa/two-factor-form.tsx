"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { FormField } from "@/components/form-field";
import { StatusMessage } from "@/components/status-message";
import { authClient } from "@/lib/auth-client";

export function TwoFactorForm() {
  const router = useRouter();
  const [useBackup, setUseBackup] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    const code = String(form.get("code")).replace(/\s/g, "");
    const trustDevice = form.get("trustDevice") === "on";
    const { error: verifyError } = useBackup
      ? await authClient.twoFactor.verifyBackupCode({ code, trustDevice })
      : await authClient.twoFactor.verifyTotp({ code, trustDevice });
    setPending(false);
    if (verifyError) {
      setError(
        verifyError.status === 429
          ? "Trop de tentatives. Réessaie dans une minute."
          : "Code invalide ou expiré.",
      );
      return;
    }
    router.push("/aujourdhui");
  }

  return (
    <form onSubmit={handleSubmit} className="card flex flex-col gap-4" noValidate>
      <FormField
        key={useBackup ? "backup" : "totp"}
        id="code"
        label={useBackup ? "Code de secours" : "Code à 6 chiffres"}
        hint={useBackup ? "Un des codes de secours enregistrés lors de l'activation." : "Affiché dans ton application d'authentification."}
        inputMode={useBackup ? "text" : "numeric"}
        autoComplete="one-time-code"
        pattern={useBackup ? undefined : "[0-9]{6}"}
        required
      />
      <div className="flex items-center gap-2">
        <input id="trustDevice" name="trustDevice" type="checkbox" className="size-5" />
        <label htmlFor="trustDevice">Faire confiance à cet appareil pendant 30 jours</label>
      </div>
      <StatusMessage message={error} />
      <button type="submit" className="btn-primary" disabled={pending}>
        {pending ? "Vérification…" : "Valider"}
      </button>
      <button type="button" className="btn-secondary" onClick={() => setUseBackup((value) => !value)}>
        {useBackup ? "Utiliser l'application d'authentification" : "Utiliser un code de secours"}
      </button>
    </form>
  );
}
