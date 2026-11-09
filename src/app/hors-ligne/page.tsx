import type { Metadata } from "next";
import Link from "next/link";
import { OfflineSync } from "@/components/offline-sync";
import { JournalForm } from "@/components/journal-form";

export const metadata: Metadata = { title: "Hors ligne" };

/** Static page served by the service worker when the network is down. */
export default function OfflinePage() {
  return (
    <main id="contenu" className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-8">
      <h1 className="page-title">Hors ligne</h1>
      <OfflineSync />
      <p>
        Pas de réseau pour l&apos;instant. Tu peux quand même écrire ton journal : l&apos;entrée reste
        sur cet appareil et sera envoyée automatiquement au retour de la connexion.
      </p>
      <section className="card flex flex-col gap-4" aria-labelledby="offline-journal-title">
        <h2 id="offline-journal-title" className="section-title">Journal du soir</h2>
        <JournalForm />
      </section>
      <p>
        <Link href="/aujourdhui" className="link">Réessayer la page du jour</Link>
      </p>
    </main>
  );
}
