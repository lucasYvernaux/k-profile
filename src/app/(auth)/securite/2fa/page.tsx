import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { requireSignedIn } from "@/server/session";
import { TwoFactorSetup } from "./two-factor-setup";

export const metadata: Metadata = { title: "Activer la double authentification" };

async function SetupGate() {
  const user = await requireSignedIn();
  if (user.twoFactorEnabled) {
    return (
      <p className="notice">
        La double authentification est déjà active.{" "}
        <Link href="/aujourdhui" className="link">
          Aller à aujourd&apos;hui
        </Link>
      </p>
    );
  }
  return <TwoFactorSetup />;
}

export default function TwoFactorSetupPage() {
  return (
    <>
      <h1 className="page-title">Activer la double authentification</h1>
      <Suspense fallback={<p role="status">Chargement…</p>}>
        <SetupGate />
      </Suspense>
    </>
  );
}
