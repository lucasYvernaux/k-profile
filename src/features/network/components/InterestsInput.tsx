"use client";

import { useId, useState } from "react";
import { Btn, Input } from "@/shared/ui/primitives";
import { DynIcon } from "@/shared/ui/icon";
import { INTEREST_SUGGESTIONS, interestKey, interestName, type Interest } from "../domain/interests";
import { InterestChip } from "./PersonBits";

/** Chip editor for a person's domains, suggesting the existing ones first. */
export function InterestsInput({
  value,
  onChange,
  known,
}: {
  value: string[];
  onChange: (names: string[]) => void;
  known: Interest[];
}) {
  const [text, setText] = useState("");
  const listId = useId();
  const keys = new Set(value.map(interestKey));
  const knownByKey = new Map(known.map((i) => [i.key, i]));

  const add = (raw: string) => {
    const key = interestKey(raw);
    if (!key || keys.has(key) || value.length >= 30) return setText("");
    // reuse the existing spelling of a known domain
    onChange([...value, knownByKey.get(key)?.name ?? interestName(raw).slice(0, 40)]);
    setText("");
  };

  const suggestions = [...known.map((i) => i.name), ...INTEREST_SUGGESTIONS.filter((s) => !knownByKey.has(interestKey(s)))].filter(
    (s) => !keys.has(interestKey(s))
  );
  const quick = known.filter((i) => !keys.has(i.key)).slice(0, 10);

  return (
    <div>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {value.map((name) => {
            const key = interestKey(name);
            return (
              <span key={key} className="inline-flex items-center">
                <InterestChip interest={knownByKey.get(key) ?? { name, key, color: null }} />
                <button type="button" onClick={() => onChange(value.filter((v) => interestKey(v) !== key))} className="p-0.5 text-smoke hover:text-blood" aria-label={`Retirer ${name}`}>
                  <DynIcon name="x" className="w-3 h-3" />
                </button>
              </span>
            );
          })}
        </div>
      )}
      <div className="flex gap-2">
        <Input
          list={listId}
          placeholder="Mangas, escalade, cuisine…"
          value={text}
          maxLength={40}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              add(text);
            }
          }}
        />
        <datalist id={listId}>
          {suggestions.map((s) => <option key={s} value={s} />)}
        </datalist>
        <Btn disabled={!text.trim()} onClick={() => add(text)}>
          <DynIcon name="plus" className="w-3.5 h-3.5" /> Domaine
        </Btn>
      </div>
      {quick.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {quick.map((i) => <InterestChip key={i.id} interest={i} onClick={() => add(i.name)} />)}
        </div>
      )}
    </div>
  );
}
