"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { FormField } from "@/components/form-field";
import { StatusMessage } from "@/components/status-message";
import { authClient } from "@/lib/auth-client";

export function SignInForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    const { data, error: signInError } = await authClient.signIn.email({
      email: String(form.get("email")),
      password: String(form.get("password")),
    });
    setPending(false);
    if (signInError) {
      setError(
        signInError.status === 429
          ? "Trop de tentatives. Réessaie dans une minute."
          : "Email ou mot de passe incorrect.",
      );
      return;
    }
    if (data && "twoFactorRedirect" in data && data.twoFactorRedirect) {
      router.push("/connexion/2fa");
      return;
    }
    router.push("/aujourdhui");
  }

  return (
    <form onSubmit={handleSubmit} className="card flex flex-col gap-4" noValidate>
      <FormField id="email" label="Email" type="email" autoComplete="username" required />
      <FormField id="password" label="Mot de passe" type="password" autoComplete="current-password" required />
      <StatusMessage message={error} />
      <button type="submit" className="btn-primary" disabled={pending}>
        {pending ? "Connexion…" : "Se connecter"}
      </button>
    </form>
  );
}
