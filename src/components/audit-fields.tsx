import type { ReactNode } from "react";
import { BIG_FIVE_TRAITS } from "@/domain/audit";
import { SOURCES } from "@/domain/sources";
import { FormField } from "./form-field";

interface AuditFieldsProps {
  errors?: Record<string, string>;
  defaultDate: string;
}

function Fieldset({ legend, children, hint }: { legend: string; children: ReactNode; hint?: ReactNode }) {
  return (
    <fieldset className="card flex flex-col gap-4">
      <legend className="section-title px-1">{legend}</legend>
      {hint && <p className="hint">{hint}</p>}
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </fieldset>
  );
}

/** Phase 0 audit fields. Every field is optional except the test date. */
export function AuditFields({ errors = {}, defaultDate }: AuditFieldsProps) {
  const number = (name: string, label: string, hint?: string, step = "any") => (
    <FormField key={name} id={name} name={name} label={label} hint={hint} type="number" inputMode="decimal" step={step} min={0} error={errors[name]} />
  );
  return (
    <>
      <Fieldset
        legend="Personnalité (Big Five)"
        hint={
          <>
            K n&apos;intègre pas de questionnaire : passe un test basé sur l&apos;IPIP (
            <a href={SOURCES.ipip.url} className="link" target="_blank" rel="noopener noreferrer">
              ipip.ori.org
            </a>
            ) puis saisis tes percentiles (0 à 100). Ce n&apos;est pas un diagnostic.
          </>
        }
      >
        <FormField id="bigFive.takenOn" label="Date du test" type="date" defaultValue={defaultDate} required error={errors["bigFive.takenOn"]} />
        <FormField id="bigFive.instrument" label="Test utilisé" hint="Par exemple « IPIP-NEO-120 »." maxLength={120} error={errors["bigFive.instrument"]} />
        {Object.entries(BIG_FIVE_TRAITS).map(([trait, label]) => number(`bigFive.${trait}`, `${label} (percentile)`, undefined, "1"))}
      </Fieldset>

      <Fieldset legend="Corps">
        {number("body.weightKg", "Poids (kg)")}
        {number("body.waistCm", "Tour de taille (cm)")}
        {number("body.restingHeartRate", "Fréquence cardiaque au repos (bpm)", undefined, "1")}
        {number("body.pushUps", "Pompes d'affilée", undefined, "1")}
        <FormField id="body.wakeTime" label="Heure de lever actuelle" type="time" error={errors["body.wakeTime"]} />
        <FormField id="body.bedTime" label="Heure de coucher actuelle" type="time" error={errors["body.bedTime"]} />
      </Fieldset>

      <Fieldset legend="Activité professionnelle">
        {number("business.revenueLast12Months", "Chiffre d'affaires des 12 derniers mois (€)")}
        {number("business.dailyRate", "Taux journalier moyen (€)")}
        {number("business.biggestClientShare", "Part du plus gros client (%)", "Part de ce client dans le CA des 12 derniers mois.")}
        {number("business.workHoursPerWeek", "Heures de travail par semaine")}
      </Fieldset>

      <Fieldset legend="Argent">
        {number("money.savings", "Épargne de sécurité disponible (€)")}
        {number("money.monthlyExpenses", "Dépenses mensuelles (€)")}
      </Fieldset>

      <Fieldset legend="Cercle des 5" hint="Prénoms ou surnoms seulement, rien de plus : moins on stocke, mieux c'est.">
        {Array.from({ length: 5 }, (_, index) => (
          <FormField key={index} id={`closeCircle-${index}`} name="relationships.closeCircle" label={`Proche ${index + 1}`} maxLength={40} autoComplete="off" />
        ))}
      </Fieldset>

      <Fieldset legend="Habitudes actuelles">
        {number("habits.drinksPerWeek", "Verres d'alcool par semaine")}
        {number("habits.screenHoursPerDay", "Heures d'écran de loisir par jour")}
      </Fieldset>

      <div className="card field">
        <label htmlFor="notes" className="label">
          Notes libres
        </label>
        <textarea id="notes" name="notes" rows={4} maxLength={4000} className="input" />
      </div>
    </>
  );
}
