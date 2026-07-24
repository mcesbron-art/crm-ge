import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/supabase-server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import ProfilClient from "./ProfilClient";

export const dynamic = "force-dynamic";

export default async function ProfilPage() {
  const session = await getServerSession();
  if (!session) redirect("/login");

  const supabase = createSupabaseServerClient();
  const { data: profile } = await supabase
    .from("collaborateurs")
    .select("nom, email, telephone, bio, poste, pole, avatar_url, color, role, created_at")
    .eq("id", session.id)
    .single();

  return (
    <ProfilClient
      initial={{
        id: session.id,
        nom: profile?.nom ?? session.nom,
        email: profile?.email ?? session.email,
        telephone: profile?.telephone ?? "",
        bio: profile?.bio ?? "",
        poste: profile?.poste ?? "",
        pole: profile?.pole ?? session.pole ?? "",
        avatarUrl: profile?.avatar_url ?? null,
        color: profile?.color ?? session.color ?? "#C9A24E",
        role: session.role,
        createdAt: profile?.created_at ?? null,
      }}
    />
  );
}
