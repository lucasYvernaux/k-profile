import type { Metadata } from "next";
import { TwoFactorForm } from "./two-factor-form";

export const metadata: Metadata = { title: "Vérification en deux étapes" };

export default function TwoFactorPage() {
  return (
    <>
      <h1 className="page-title">Vérification en deux étapes</h1>
      <TwoFactorForm />
    </>
  );
}
