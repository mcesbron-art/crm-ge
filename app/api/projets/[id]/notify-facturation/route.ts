import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { sendFacturationEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createSupabaseServerClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { data: project } = await supabase
    .from("projects")
    .select("name, client_name, assigned_to")
    .eq("id", params.id)
    .single();

  if (!project) return NextResponse.json({ error: "Projet introuvable" }, { status: 404 });

  let assigneeName = "Non assigné";
  if (project.assigned_to) {
    const { data: collab } = await supabase
      .from("collaborateurs")
      .select("nom")
      .eq("id", project.assigned_to)
      .single();
    if (collab) assigneeName = collab.nom;
  }

  await sendFacturationEmail({
    projectName:  project.name,
    clientName:   project.client_name,
    assigneeName,
  });

  await supabase
    .from("projects")
    .update({ status: "termine" })
    .eq("id", params.id);

  return NextResponse.json({ ok: true });
}
