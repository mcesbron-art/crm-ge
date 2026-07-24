import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) return NextResponse.json({ error: "token requis" }, { status: 400 });

  const admin = createSupabaseAdminClient();

  const { data: validation, error } = await admin
    .from("bat_validations")
    .select("id, bat_url, status, client_email, project_id")
    .eq("token", token)
    .single();

  if (error || !validation) {
    return NextResponse.json({ error: "Lien invalide ou expiré" }, { status: 404 });
  }

  const { data: project } = await admin
    .from("projects")
    .select("name, client_name")
    .eq("id", validation.project_id)
    .single();

  return NextResponse.json({
    status:       validation.status,
    bat_url:      validation.bat_url,
    project_name: project?.name ?? "Projet",
    client_name:  project?.client_name ?? "",
  });
}
