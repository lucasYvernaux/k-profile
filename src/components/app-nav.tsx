"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useId, useState } from "react";

/*
 * Main navigation, grouped (ADR 0010: the merge brought 11 new pages).
 * Small screens: a disclosure button shows or hides the list (WAI-ARIA APG
 * "Disclosure navigation menu"); it closes itself on navigation.
 * Large screens: always visible in the side column.
 */

type NavItem = { href: string; label: string };
type NavGroup = { id: string; label: string; items: readonly NavItem[] };

const GROUPS: readonly NavGroup[] = [
  {
    id: "quotidien",
    label: "Quotidien",
    items: [
      { href: "/aujourdhui", label: "Aujourd'hui" },
      { href: "/routine", label: "Routine" },
      { href: "/habitudes", label: "Habitudes" },
      { href: "/journal", label: "Journal émotionnel" },
      { href: "/bilan", label: "Bilan du jour" },
      { href: "/consommations", label: "Consommations" },
    ],
  },
  {
    id: "vie",
    label: "Vie",
    items: [
      { href: "/sante", label: "Santé" },
      { href: "/reseau", label: "Réseau" },
      { href: "/entretien", label: "Entretien" },
    ],
  },
  {
    id: "vision",
    label: "Vision et bilans",
    items: [
      { href: "/tableau-de-bord", label: "Tableau de bord" },
      { href: "/objectifs", label: "Objectifs" },
      { href: "/feuille-de-route", label: "Feuille de route" },
      { href: "/revue-hebdo", label: "Revue hebdomadaire" },
      { href: "/audit-mensuel", label: "Audit mensuel" },
      { href: "/revue", label: "Revue trimestrielle" },
      { href: "/manifeste", label: "Manifeste" },
    ],
  },
  {
    id: "outils",
    label: "Outils",
    items: [
      { href: "/atelier", label: "Atelier" },
      { href: "/reglages", label: "Réglages" },
    ],
  },
];

function isCurrent(href: string, pathname: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppNav() {
  const pathname = usePathname();
  const listId = useId();
  // Open for the page where it was opened: navigating elsewhere closes it.
  const [openOn, setOpenOn] = useState<string | null>(null);
  const open = openOn === pathname;

  return (
    <nav aria-label="Navigation principale" className="flex flex-col gap-3">
      <button
        type="button"
        className="btn-secondary self-start lg:hidden"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpenOn(open ? null : pathname)}
      >
        Menu
      </button>
      <div id={listId} className={`${open ? "flex" : "hidden"} flex-col gap-4 lg:flex`}>
        {GROUPS.map((group) => (
          <div key={group.id} className="flex flex-col gap-1">
            <span id={`${listId}-${group.id}`} className="px-3 text-sm font-semibold uppercase tracking-wide text-muted">
              {group.label}
            </span>
            <ul aria-labelledby={`${listId}-${group.id}`} className="flex flex-col gap-0.5">
              {group.items.map(({ href, label }) => {
                const current = isCurrent(href, pathname);
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      aria-current={current ? "page" : undefined}
                      className={`flex min-h-11 items-center rounded-lg border-l-2 px-3 font-semibold transition-colors ${
                        current
                          ? "border-accent bg-selection text-white"
                          : "border-transparent hover:border-accent hover:bg-accent-soft hover:text-accent"
                      }`}
                    >
                      {label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </nav>
  );
}
