"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/aujourdhui", label: "Aujourd'hui" },
  { href: "/habitudes", label: "Habitudes" },
  { href: "/journal", label: "Journal" },
  { href: "/tableau-de-bord", label: "Tableau de bord" },
  { href: "/revue", label: "Revue" },
  { href: "/feuille-de-route", label: "Feuille de route" },
  { href: "/reglages", label: "Réglages" },
] as const;

export function AppNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Navigation principale">
      <ul className="flex flex-wrap gap-1">
        {LINKS.map(({ href, label }) => {
          const current = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={current ? "page" : undefined}
                className={`inline-flex min-h-11 items-center rounded-lg px-3 font-semibold ${
                  current ? "bg-accent text-accent-contrast" : "hover:bg-accent-soft"
                }`}
              >
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
