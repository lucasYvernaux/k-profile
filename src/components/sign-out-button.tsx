"use client";

import { useRouter } from "next/navigation";
import { clearOfflineData } from "@/lib/offline-queue";
import { authClient } from "@/lib/auth-client";

export function SignOutButton() {
  const router = useRouter();
  async function signOut() {
    await authClient.signOut();
    await clearOfflineData();
    router.push("/connexion");
    router.refresh();
  }
  return (
    <button type="button" onClick={signOut} className="btn-secondary">
      Se déconnecter
    </button>
  );
}
