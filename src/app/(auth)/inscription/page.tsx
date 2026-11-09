import type { Metadata } from "next";
import Link from "next/link";
import { SignUpForm } from "./sign-up-form";

export const metadata: Metadata = { title: "Créer le compte" };

export default function SignUpPage() {
  return (
    <>
      <h1 className="page-title">Créer le compte</h1>
      <p className="text-muted">
        K est une application personnelle. Les inscriptions sont fermées par défaut et ne
        s&apos;ouvrent que pour créer le premier compte.
      </p>
      <SignUpForm />
      <p>
        Déjà un compte ?{" "}
        <Link href="/connexion" className="link">
          Se connecter
        </Link>
      </p>
    </>
  );
}
