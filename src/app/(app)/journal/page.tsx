import type { Metadata } from "next";
import { Suspense } from "react";
import { JournalForm } from "@/components/journal-form";
import { SubmitButton } from "@/components/submit-button";
import { emotionFrequencies } from "@/domain/emotions";
import { SOURCES } from "@/domain/sources";
import { listJournalEntries } from "@/server/data/entries";
import { requireAppContext } from "@/server/data/profile";
import { deleteJournalEntryAction } from "./actions";

export const metadata: Metadata = { title: "Journal émotionnel" };

const CLOUD_SIZES = ["text-sm", "text-base", "text-lg", "text-xl", "text-2xl"] as const;
const HISTORY_LIMIT = 60;

async function Journal() {
  const { user, today } = await requireAppContext();
  const entries = await listJournalEntries(user.id);
  const cloud = emotionFrequencies(entries);
  const history = entries.slice(0, HISTORY_LIMIT);

  return (
    <>
      <section className="card flex flex-col gap-4" aria-labelledby="new-entry-title">
        <h2 id="new-entry-title" className="section-title">Entrée du {today}</h2>
        <JournalForm day={today} />
      </section>

      <section className="card flex flex-col gap-4" aria-labelledby="cloud-title">
        <h2 id="cloud-title" className="section-title">Émotions les plus fréquentes</h2>
        {cloud.length === 0 ? (
          <p>Le nuage apparaîtra après tes premières entrées.</p>
        ) : (
          <ul className="flex flex-wrap items-baseline gap-x-4 gap-y-2" aria-label="Nuage des émotions, de la plus fréquente à la moins fréquente">
            {cloud.map(({ word, count, weight }) => (
              <li key={word} className={`${CLOUD_SIZES[weight - 1]} ${weight >= 4 ? "font-bold" : ""}`}>
                {word} <span className="text-sm font-normal text-muted">({count})</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card flex flex-col gap-4" aria-labelledby="history-title">
        <h2 id="history-title" className="section-title">Historique</h2>
        {history.length === 0 && <p>Aucune entrée pour l&apos;instant.</p>}
        <ul className="flex flex-col gap-3">
          {history.map((entry) => (
            <li key={entry.id} className="rounded-lg border border-border p-3">
              <article aria-labelledby={`entry-${entry.id}`}>
                <h3 id={`entry-${entry.id}`} className="font-semibold">
                  {entry.day} · {entry.emotions.join(", ")}
                </h3>
                {entry.context && <p className="mt-1 whitespace-pre-line">{entry.context}</p>}
                <form action={deleteJournalEntryAction} className="mt-2">
                  <input type="hidden" name="entryId" value={entry.id} />
                  <SubmitButton variant="secondary" pendingLabel="Suppression…">
                    <span>Supprimer<span className="sr-only"> l&apos;entrée du {entry.day}</span></span>
                  </SubmitButton>
                </form>
              </article>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}

export default function JournalPage() {
  return (
    <>
      <h1 className="page-title">Journal émotionnel</h1>
      <p>
        Nommer ses émotions est associé à une baisse de la réponse de l&apos;amygdale (Lieberman et
        al., 2007). Le journal ne remplace pas un suivi par un professionnel.{" "}
        <a href={SOURCES.lieberman2007.url} className="link" target="_blank" rel="noopener noreferrer">
          Source
        </a>
      </p>
      <p className="warning">
        En cas de détresse ou de pensées suicidaires, appelle le <strong>3114</strong>, numéro national de
        prévention du suicide (gratuit et confidentiel, 24 h/24 et 7 j/7). En cas de danger immédiat,
        appelle le <strong>15</strong> ou le <strong>112</strong>.{" "}
        <a href={SOURCES.suicidePrevention.url} className="link" target="_blank" rel="noopener noreferrer">
          En savoir plus
        </a>
      </p>
      <Suspense fallback={<p role="status">Chargement du journal…</p>}>
        <Journal />
      </Suspense>
    </>
  );
}
