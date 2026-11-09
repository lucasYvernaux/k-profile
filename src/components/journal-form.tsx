"use client";

import { useState, type FormEvent } from "react";
import { EMOTION_SUGGESTIONS, EMOTIONS_PER_ENTRY, journalEntrySchema, MAX_CONTEXT_LENGTH } from "@/domain/emotions";
import { useSync } from "@/lib/use-sync";
import { FormField } from "./form-field";
import { StatusMessage } from "./status-message";

function localDayKey(): string {
  return new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

/** Quick evening entry: 3 one-word emotions and why. Works offline. */
export function JournalForm({ day }: { day?: string }) {
  const { send, message, pending } = useSync();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formKey, setFormKey] = useState(0);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const candidate = {
      day: day ?? localDayKey(),
      emotions: form.getAll("emotion").map(String),
      context: String(form.get("context") ?? ""),
    };
    const parsed = journalEntrySchema.safeParse(candidate);
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path.join(".");
        next[key] ??= issue.message;
      }
      setErrors(next);
      return;
    }
    setErrors({});
    const result = await send({ kind: "journal", clientId: crypto.randomUUID(), ...parsed.data });
    if (result === "sent" || result === "queued") {
      setFormKey((value) => value + 1);
    }
  }

  return (
    <form key={formKey} onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
      <fieldset className="flex flex-col gap-3">
        <legend className="label">Trois émotions de la journée, un mot chacune</legend>
        <div className="grid gap-3 sm:grid-cols-3">
          {Array.from({ length: EMOTIONS_PER_ENTRY }, (_, index) => (
            <FormField
              key={index}
              id={`emotion-${index}`}
              name="emotion"
              label={`Émotion ${index + 1}`}
              list="emotion-suggestions"
              autoComplete="off"
              maxLength={40}
              required
              error={errors[`emotions.${index}`]}
            />
          ))}
        </div>
        {errors.emotions && <p className="error-text">{errors.emotions}</p>}
        <datalist id="emotion-suggestions">
          {EMOTION_SUGGESTIONS.map((word) => (
            <option key={word} value={word} />
          ))}
        </datalist>
      </fieldset>
      <div className="field">
        <label htmlFor="context" className="label">Pourquoi ? Contexte</label>
        <p id="context-hint" className="hint">Quelques phrases suffisent. 5 minutes maximum.</p>
        <textarea id="context" name="context" rows={4} maxLength={MAX_CONTEXT_LENGTH} className="input" aria-describedby="context-hint" />
      </div>
      <StatusMessage message={message} tone="success" />
      <button type="submit" className="btn-primary self-start" disabled={pending}>
        Enregistrer l&apos;entrée
      </button>
    </form>
  );
}
