"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { FormField } from "@/components/form-field";
import { QrCode } from "@/components/qr-code";
import { StatusMessage } from "@/components/status-message";
import { authClient } from "@/lib/auth-client";

interface Enrolment {
  totpURI: string;
  backupCodes: string[];
}

function secretFrom(uri: string): string {
  return new URL(uri).searchParams.get("secret") ?? "";
}

export function TwoFactorSetup() {
  const router = useRouter();
  const [enrolment, setEnrolment] = useState<Enrolment | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function start(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    const { data, error: enableError } = await authClient.twoFactor.enable({
      password: String(form.get("password")),
      method: "totp",
    });
    setPending(false);
    if (enableError || !data || data.method !== "totp") {
      setError("Mot de passe incorrect, ou une activation est déjà en cours.");
      return;
    }
    setEnrolment({ totpURI: data.totpURI, backupCodes: data.backupCodes });
  }

  async function confirm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    const { error: verifyError } = await authClient.twoFactor.verifyTotp({
      code: String(form.get("code")).replace(/\s/g, ""),
    });
    setPending(false);
    if (verifyError) {
      setError("Code invalide. Vérifie l'heure de ton téléphone et réessaie.");
      return;
    }
    router.push("/onboarding");
    router.refresh();
  }

  if (!enrolment) {
    return (
      <form onSubmit={start} className="card flex flex-col gap-4" noValidate>
        <p>
          La double authentification est obligatoire : le journal et le suivi contiennent des
          données de santé. Il te faut une application TOTP (par exemple Aegis, 2FAS ou celle de
          ton gestionnaire de mots de passe).
        </p>
        <FormField id="password" label="Confirme ton mot de passe" type="password" autoComplete="current-password" required />
        <StatusMessage message={error} />
        <button type="submit" className="btn-primary" disabled={pending}>
          {pending ? "Préparation…" : "Commencer l'activation"}
        </button>
      </form>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="card flex flex-col gap-4" aria-labelledby="scan-title">
        <h2 id="scan-title" className="section-title">1. Ajoute le compte dans ton application</h2>
        <QrCode value={enrolment.totpURI} label="QR code à scanner avec ton application d'authentification" />
        <p>
          Ou saisis cette clé à la main :{" "}
          <code className="break-all rounded bg-accent-soft px-1 font-mono">{secretFrom(enrolment.totpURI)}</code>
        </p>
      </section>
      <section className="card flex flex-col gap-4" aria-labelledby="backup-title">
        <h2 id="backup-title" className="section-title">2. Range tes codes de secours</h2>
        <p>Chaque code ne sert qu&apos;une fois. Garde-les dans ton gestionnaire de mots de passe.</p>
        <ul className="grid grid-cols-2 gap-2 font-mono">
          {enrolment.backupCodes.map((code) => (
            <li key={code}>{code}</li>
          ))}
        </ul>
      </section>
      <form onSubmit={confirm} className="card flex flex-col gap-4" noValidate aria-labelledby="confirm-title">
        <h2 id="confirm-title" className="section-title">3. Confirme avec un code</h2>
        <FormField id="code" label="Code à 6 chiffres" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" required />
        <StatusMessage message={error} />
        <button type="submit" className="btn-primary" disabled={pending}>
          {pending ? "Vérification…" : "Activer la double authentification"}
        </button>
      </form>
    </div>
  );
}
