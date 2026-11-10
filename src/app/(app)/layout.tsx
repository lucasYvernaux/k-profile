import Link from "next/link";
import { AppNav } from "@/components/app-nav";
import { OfflineSync } from "@/components/offline-sync";
import { SignOutButton } from "@/components/sign-out-button";
import { NotificationWatcher } from "@/shared/layout/NotificationWatcher";

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <header className="hairline-top border-b border-line bg-black/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <Link href="/aujourdhui" className="font-display text-2xl font-bold text-accent text-glow" aria-label="K, accueil">
            K
          </Link>
          <SignOutButton />
        </div>
      </header>
      <OfflineSync />
      <NotificationWatcher />
      <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-6 lg:flex-row lg:gap-8">
        <div className="lg:sticky lg:top-6 lg:max-h-[calc(100vh-3rem)] lg:w-60 lg:shrink-0 lg:self-start lg:overflow-y-auto">
          <AppNav />
        </div>
        <main id="contenu" tabIndex={-1} className="flex min-w-0 flex-1 flex-col gap-6 outline-none">
          {children}
        </main>
      </div>
      <footer className="mx-auto w-full max-w-7xl px-4 py-6 text-sm text-muted">
        K ne pose aucun diagnostic et ne donne pas de conseil médical, fiscal ou financier personnalisé.
        Pour cela, adresse-toi à un professionnel de santé, un psychologue, un expert-comptable ou un conseiller
        financier.
      </footer>
    </>
  );
}
