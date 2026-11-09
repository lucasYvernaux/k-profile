"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { FormField } from "@/components/form-field";
import { StatusMessage } from "@/components/status-message";
import { authClient } from "@/lib/auth-client";

const MIN_PASSWORD_LENGTH = 12;

export function SignUpForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password"));
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Le mot de passe doit contenir au moins ${MIN_PASSWORD_LENGTH} caractères.`);
      return;
    }
    if (password !== form.get("passwordConfirm")) {
      setError("Les deux mots de passe ne correspondent pas.");
      return;
    }
    setPending(true);
    setError(null);
    const { error: signUpError } = await authClient.signUp.email({
      name: String(form.get("name")),
      email: String(form.get("email")),
      password,
    });
    setPending(false);
    if (signUpError) {
      setError(
        signUpError.status === 429
          ? "Trop de tentatives. Réessaie dans une minute."
          : "Inscription impossible. Les inscriptions sont peut-être fermées, ou l'email est déjà utilisé.",
      );
      return;
    }
    router.push("/securite/2fa");
  }

  return (
    <form onSubmit={handleSubmit} className="card flex flex-col gap-4" noValidate>
      <FormField id="name" label="Prénom ou pseudo" autoComplete="nickname" required maxLength={60} />
      <FormField id="email" label="Email" type="email" autoComplete="email" required />
      <FormField
        id="password"
        label="Mot de passe"
        type="password"
        autoComplete="new-password"
        hint={`Au moins ${MIN_PASSWORD_LENGTH} caractères. Une phrase de passe est plus simple à retenir.`}
        minLength={MIN_PASSWORD_LENGTH}
        required
      />
      <FormField
        id="passwordConfirm"
        label="Confirmer le mot de passe"
        type="password"
        autoComplete="new-password"
        required
      />
      <StatusMessage message={error} />
      <button type="submit" className="btn-primary" disabled={pending}>
        {pending ? "Création…" : "Créer le compte"}
      </button>
    </form>
  );
}
