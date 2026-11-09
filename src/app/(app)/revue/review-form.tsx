"use client";

import { useActionState } from "react";
import { StatusMessage } from "@/components/status-message";
import { SubmitButton } from "@/components/submit-button";
import { PILLAR_IDS, PILLARS } from "@/domain/pillars";
import { MAX_SCORE, MIN_SCORE, REVIEW_PROMPTS, type QuarterlyReviewInput } from "@/domain/review";
import { INITIAL_FORM_STATE } from "@/lib/form-state";
import { saveReviewAction } from "./actions";

interface ReviewFormProps {
  quarter: string;
  existing?: QuarterlyReviewInput;
}

export function ReviewForm({ quarter, existing }: ReviewFormProps) {
  const [state, action] = useActionState(saveReviewAction, INITIAL_FORM_STATE);
  return (
    <form action={action} className="flex flex-col gap-6">
      <input type="hidden" name="quarter" value={quarter} />
      <fieldset className="flex flex-col gap-3">
        <legend className="label">Note de 1 à 10 pour chaque pilier</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {PILLAR_IDS.map((pillar) => {
            const error = state.fieldErrors?.[`scores.${pillar}`];
            return (
              <div key={pillar} className="field">
                <label htmlFor={`score-${pillar}`} className="label">{PILLARS[pillar].name}</label>
                <input
                  id={`score-${pillar}`}
                  name={`score.${pillar}`}
                  type="number"
                  min={MIN_SCORE}
                  max={MAX_SCORE}
                  step={1}
                  required
                  defaultValue={existing?.scores[pillar]}
                  className="input"
                  aria-invalid={error ? true : undefined}
                  aria-describedby={error ? `score-${pillar}-error` : undefined}
                />
                {error && <p id={`score-${pillar}-error`} className="error-text">Note entière de 1 à 10.</p>}
              </div>
            );
          })}
        </div>
      </fieldset>
      {(Object.keys(REVIEW_PROMPTS) as (keyof typeof REVIEW_PROMPTS)[]).map((key) => (
        <div key={key} className="field">
          <label htmlFor={key} className="label">{REVIEW_PROMPTS[key]}</label>
          <textarea id={key} name={key} rows={3} maxLength={2000} defaultValue={existing?.[key]} className="input" />
        </div>
      ))}
      <StatusMessage message={state.message} tone={state.status === "error" ? "error" : "success"} />
      <SubmitButton>Enregistrer la revue {quarter}</SubmitButton>
    </form>
  );
}
