import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase-server";
import { sendBatResponseEmail, sendFacturationEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://crm-ge-pi.vercel.app";

export async function POST(req: NextRequest) {
  const { token, action, comment } = await req.json() as {
    token: string;
    action: "approve" | "reject";
    comment?: string;
  };

  console.log("[bat/respond] received:", { token: token?.slice(0, 8), action, hasComment: !!comment });

  if (!token || !action) {
    return NextResponse.json({ error: "token et action requis" }, { status: 400 });
  }
  if (action === "reject" && !comment?.trim()) {
    return NextResponse.json({ error: "Commentaire obligatoire en cas de refus" }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();

  // 1. Récupérer la validation
  const { data: validation, error: fetchErr } = await admin
    .from("bat_validations")
    .select("id, project_id, client_email, status")
    .eq("token", token)
    .single();

  console.log("[bat/respond] validation fetch:", { found: !!validation, status: validation?.status, err: fetchErr?.message });

  if (fetchErr || !validation) {
    return NextResponse.json({ error: "Token invalide ou expiré" }, { status: 404 });
  }
  if (validation.status !== "pending") {
    return NextResponse.json({ error: "Ce BAT a déjà été traité" }, { status: 409 });
  }

  // 2. Récupérer le projet
  const { data: project } = await admin
    .from("projects")
    .select("id, name, client_name, assigned_to")
    .eq("id", validation.project_id)
    .single();

  console.log("[bat/respond] project:", { name: project?.name, assigned_to: project?.assigned_to });

  // 3. Lookup collaborateur assigné
  let assigneeName = "L'équipe";
  let assigneeEmail: string | null = null;
  if (project?.assigned_to) {
    const { data: collab, error: collabErr } = await admin
      .from("collaborateurs")
      .select("nom, email")
      .eq("id", project.assigned_to)
      .single();
    console.log("[bat/respond] collab lookup:", { found: !!collab, email: collab?.email, err: collabErr?.message });
    if (collab) {
      assigneeName  = collab.nom;
      assigneeEmail = (collab as { nom: string; email?: string }).email ?? null;
    }
  }

  const notifyTo = assigneeEmail ?? process.env.FACTURATION_EMAIL ?? null;
  const projectUrl = `${APP_URL}/projets?project=${validation.project_id}`;
  console.log("[bat/respond] notifyTo:", notifyTo, "| FACTURATION_EMAIL:", process.env.FACTURATION_EMAIL);

  // 4. Mettre à jour bat_validations
  const now = new Date().toISOString();
  await admin
    .from("bat_validations")
    .update({
      status:         action === "approve" ? "approved" : "rejected",
      client_comment: comment?.trim() ?? null,
      responded_at:   now,
    })
    .eq("id", validation.id);

  console.log("[bat/respond] bat_validations updated to:", action === "approve" ? "approved" : "rejected");

  if (action === "approve") {
    // 5a. Passer le projet en "À facturer"
    const { error: projErr } = await admin
      .from("projects")
      .update({ status: "a_facturer" })
      .eq("id", validation.project_id);
    console.log("[bat/respond] project status → a_facturer, err:", projErr?.message ?? "none");

    // 6a. Email notification chargé de projet
    if (notifyTo) {
      console.log("[bat/respond] sending response email to:", notifyTo);
      try {
        const r = await sendBatResponseEmail({
          to:           notifyTo,
          assigneeName,
          projectName:  project?.name ?? "Projet",
          clientName:   project?.client_name ?? "",
          action:       "approve",
          comment:      comment?.trim() ?? null,
          projectUrl,
        });
        console.log("[bat/respond] response email result:", JSON.stringify(r));
      } catch (e) {
        console.error("[bat/respond] response email FAILED:", e instanceof Error ? e.message : e);
      }
    } else {
      console.log("[bat/respond] no notifyTo — skipping response email");
    }

    // 7a. Email facturation
    console.log("[bat/respond] sending facturation email, FACTURATION_EMAIL:", process.env.FACTURATION_EMAIL);
    try {
      const r2 = await sendFacturationEmail({
        projectName:  project?.name ?? "Projet",
        clientName:   project?.client_name ?? "",
        assigneeName,
      });
      console.log("[bat/respond] facturation email result:", JSON.stringify(r2));
    } catch (e) {
      console.error("[bat/respond] facturation email FAILED:", e instanceof Error ? e.message : e);
    }

    // 8a. Passer le projet en "Terminé"
    const { error: termineErr } = await admin
      .from("projects")
      .update({ status: "termine" })
      .eq("id", validation.project_id);
    console.log("[bat/respond] project status → termine, err:", termineErr?.message ?? "none");

  } else {
    // 5b. Le projet reste en "BAT envoyé" — pas de mise à jour du statut

    // 6b. Email notification chargé de projet
    if (notifyTo) {
      console.log("[bat/respond] sending reject notification to:", notifyTo);
      try {
        const r = await sendBatResponseEmail({
          to:           notifyTo,
          assigneeName,
          projectName:  project?.name ?? "Projet",
          clientName:   project?.client_name ?? "",
          action:       "reject",
          comment:      comment?.trim(),
          projectUrl,
        });
        console.log("[bat/respond] reject notification result:", JSON.stringify(r));
      } catch (e) {
        console.error("[bat/respond] reject notification FAILED:", e instanceof Error ? e.message : e);
      }
    } else {
      console.log("[bat/respond] no notifyTo — skipping reject notification");
    }
  }

  console.log("[bat/respond] done, returning ok");
  return NextResponse.json({ ok: true, action });
}
