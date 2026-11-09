import type { Metadata } from "next";
import { Suspense } from "react";
import { requireAppContext } from "@/server/data/profile";
import { env } from "@/server/env";
import { DeleteAccount } from "./delete-account";
import { PushSettings } from "./push-settings";
import { ScheduleEditor } from "./schedule-editor";

export const metadata: Metadata = { title: "Réglages" };

async function Settings() {
  const { profile } = await requireAppContext();
  return (
    <>
      <section id="journee-type" className="card flex flex-col gap-4" aria-labelledby="schedule-title">
        <h2 id="schedule-title" className="section-title">Journée type</h2>
        <ScheduleEditor schedule={profile.schedule} />
      </section>

      <section className="card flex flex-col gap-4" aria-labelledby="push-title">
        <h2 id="push-title" className="section-title">Rappel du soir</h2>
        <PushSettings publicKey={env().VAPID_PUBLIC_KEY || undefined} />
      </section>

      <section className="card flex flex-col gap-4" aria-labelledby="export-title">
        <h2 id="export-title" className="section-title">Exporter mes données</h2>
        <p>Toutes tes données, déchiffrées, dans un fichier que tu gardes.</p>
        <ul className="flex flex-wrap gap-3">
          <li><a href="/api/export?format=json" className="btn-secondary" download>Export complet (JSON)</a></li>
          <li><a href="/api/export?format=csv&amp;dataset=journal" className="btn-secondary" download>Journal (CSV)</a></li>
          <li><a href="/api/export?format=csv&amp;dataset=check-ins" className="btn-secondary" download>Habitudes cochées (CSV)</a></li>
        </ul>
      </section>

      <section className="card flex flex-col gap-4 border-2 border-danger" aria-labelledby="delete-title">
        <h2 id="delete-title" className="section-title">Supprimer mon compte</h2>
        <DeleteAccount />
      </section>
    </>
  );
}

export default function SettingsPage() {
  return (
    <>
      <h1 className="page-title">Réglages</h1>
      <Suspense fallback={<p role="status">Chargement…</p>}>
        <Settings />
      </Suspense>
    </>
  );
}
