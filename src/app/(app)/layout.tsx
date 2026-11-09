import Link from "next/link";
import { AppNav } from "@/components/app-nav";
import { OfflineSync } from "@/components/offline-sync";
import { SignOutButton } from "@/components/sign-out-button";

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <Link href="/aujourdhui" className="text-2xl font-bold" aria-label="K, accueil">
            K
          </Link>
          <AppNav />
          <SignOutButton />
        </div>
      </header>
      <OfflineSync />
      <main id="contenu" className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-8">
        {children}
      </main>
      <footer className="mx-auto w-full max-w-5xl px-4 py-6 text-sm text-muted">
        K ne pose aucun diagnostic et ne donne pas de conseil fiscal ou financier personnalisé.
        Pour cela, adresse-toi à un psychologue, un expert-comptable ou un conseiller financier.
      </footer>
    </>
  );
}
