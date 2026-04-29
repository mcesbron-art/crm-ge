import { redirect } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import PreviewBar from "@/components/PreviewBar";
import { AuthProvider } from "@/lib/auth-context";
import { getServerSession } from "@/lib/auth-server";

/**
 * Layout protégé : redirige vers /login si pas de session valide.
 *
 * Tout ce qui est dans `app/(app)/*` nécessite d'être connecté.
 * Les pages /login et /sign/[token] sont publiques (hors de ce groupe).
 */
export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await getServerSession();

  if (!user) {
    redirect("/login");
  }

  // On ne passe que les champs publics au client (pas de hash, pas de session)
  const initialUser = {
    id: user.id,
    nom: user.nom,
    email: user.email,
    pole: user.pole,
    avatar: user.avatar,
    color: user.color,
    role: user.role,
    base: user.base,
    actif: user.actif,
  };

  return (
    <AuthProvider initialUser={initialUser}>
      <div className="min-h-screen bg-gris">
        <Sidebar />
        <main className="app-main">
          <PreviewBar />
          {children}
        </main>
      </div>
    </AuthProvider>
  );
}
