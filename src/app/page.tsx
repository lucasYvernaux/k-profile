import Link from "next/link";
import { Logo } from "@/components/logo";

export default function HomePage() {
  return (
    <main id="contenu" className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center gap-6 px-4 py-12">
      <h1 className="flex items-center gap-3 font-display text-4xl font-bold text-accent">
        <Logo className="size-11" />
        <span className="text-glow">Hespéride</span>
      </h1>
      <p className="text-lg">
        Un coach personnel pour construire, sur 4 à 5 ans, la version saine du profil K : calme,
        franchise, corps solide, esprit maker, stratégie, famille choisie et présence.
      </p>
      <p className="text-muted">
        Pas de série qui casse, pas de culpabilisation : deux habitudes à la fois, et la régularité
        plutôt que la perfection.
      </p>
      <div className="flex flex-wrap gap-3">
        <Link href="/connexion" className="btn-primary">
          Se connecter
        </Link>
        <Link href="/inscription" className="btn-secondary">
          Créer le compte
        </Link>
      </div>
    </main>
  );
}
