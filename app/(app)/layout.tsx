import { redirect } from "next/navigation";
import PreviewBar from "@/components/PreviewBar";
import { AuthProvider } from "@/lib/auth-context";
import { ThemeProvider } from "@/lib/theme-context";
import { getServerSession } from "@/lib/supabase-server";
import AppLayoutWrapper from "@/components/AppLayoutWrapper";

/**
 * Layout protégé : redirige vers /login si pas de session Supabase valide.
 *
 * Tout ce qui est dans `app/(app)/*` nécessite d'être connecté.
 * Les pages publiques (login, forgot-password, reset-password, sign/[token])
 * sont hors de ce groupe.
 */
export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const profile = await getServerSession();

  if (!profile) {
    redirect("/login");
  }

  // On passe au client uniquement les champs publics (jamais l'authId direct,
  // mais l'id du profil collaborateur — qui est un UUID public).
  const initialUser = {
    // Pour compatibilité avec le mock numérique : on utilise un id incrémental
    // basé sur l'email (les UUID Supabase sont gardés serveur-side).
    // Pour les calculs côté client, on génère un id stable.
    id: hashEmailToId(profile.email),
    nom: profile.nom,
    email: profile.email,
    pole: profile.pole ?? "",
    avatar: profile.avatar ?? profile.nom.slice(0, 2).toUpperCase(),
    avatarUrl: profile.avatarUrl,
    color: profile.color ?? "#999999",
    role: profile.role,
    base: profile.base,
    actif: profile.actif,
  };

  return (
    <ThemeProvider>
      <AuthProvider initialUser={initialUser}>
        <AppLayoutWrapper>
          <PreviewBar />
          {children}
        </AppLayoutWrapper>
      </AuthProvider>
    </ThemeProvider>
  );
}

/** Mapping stable email → id numérique (compatibilité avec mocks).
 *  Pour les 7 utilisateurs initiaux on conserve les ids 0-6.
 *  Les nouveaux utilisateurs auront des ids dérivés du hash de leur email.
 */
function hashEmailToId(email: string): number {
  const known: Record<string, number> = {
    "m.cesbron@groupe-echo.fr": 0,    // Maryline (Direction)
    "maryline@groupe-echo.fr": 0,     // alias
    "noemie@groupe-echo.fr": 1,
    "amandine@groupe-echo.fr": 2,
    "jeremy@groupe-echo.fr": 3,
    "marcellin@groupe-echo.fr": 4,
    "arthur@groupe-echo.fr": 5,
    "fanny@groupe-echo.fr": 6,
  };
  const lower = email.toLowerCase();
  if (lower in known) return known[lower];
  // Hash simple pour les autres (sera > 100 pour éviter collisions)
  let h = 0;
  for (let i = 0; i < lower.length; i++) h = (h * 31 + lower.charCodeAt(i)) | 0;
  return 100 + Math.abs(h % 10000);
}
