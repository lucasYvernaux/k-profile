import type { Metadata } from "next";
import Link from "next/link";
import { SignInForm } from "./sign-in-form";

export const metadata: Metadata = { title: "Connexion" };

export default function SignInPage() {
  return (
    <>
      <h1 className="page-title">Connexion</h1>
      <SignInForm />
      <p>
        Pas encore de compte ?{" "}
        <Link href="/inscription" className="link">
          Créer le compte
        </Link>
      </p>
    </>
  );
}
