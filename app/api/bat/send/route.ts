import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient, getServerSession } from "@/lib/supabase-server";
import { sendBatValidationEmail } from "@/lib/email";
import { can } from "@/lib/permissions";

export const dynamic = "force-dynamic";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://crm-ge-pi.vercel.app";

// BAT au niveau projet (bat_validations/bat-files) — envoyé depuis le
// panneau détail de la page Projets, qui est en lecture seule pour le
// Collaborateur (spec permissions) : réservé à update_project (admin).
export async function POST(req: NextRequest) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  if (!can(session.role, "update_project")) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const form = await req.formData();
  const file        = form.get("file") as File | null;
  const projectId   = form.get("project_id") as string | null;
  const clientEmail = form.get("client_email") as string | null;
  const sendEmail   = form.get("send_validation") === "true";

  if (!file || !projectId) {
    return NextResponse.json({ error: "file et project_id requis" }, { status: 400 });
  }
  if (sendEmail && !clientEmail) {
    return NextResponse.json({ error: "client_email requis pour la validation" }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();

  // 1. Récupérer les infos du projet
  const { data: project } = await admin
    .from("projects")
    .select("id, name, client_name, assigned_to")
    .eq("id", projectId)
    .single();

  if (!project) return NextResponse.json({ error: "Projet introuvable" }, { status: 404 });

  // 2. Upload vers Supabase Storage
  const ext = file.name.split(".").pop() ?? "pdf";
  const path = `${projectId}/${Date.now()}.${ext}`;
  const bytes = await file.arrayBuffer();

  const { error: uploadErr } = await admin.storage
    .from("bat-files")
    .upload(path, bytes, { contentType: file.type, upsert: true });

  if (uploadErr) {
    return NextResponse.json({ error: `Upload échoué : ${uploadErr.message}` }, { status: 500 });
  }

  const { data: { publicUrl } } = admin.storage.from("bat-files").getPublicUrl(path);

  // 3. Créer la ligne bat_validations (ou remplacer la précédente)
  const { data: validation, error: insertErr } = await admin
    .from("bat_validations")
    .insert({
      project_id:   projectId,
      bat_url:      publicUrl,
      client_email: clientEmail ?? "",
      status:       "pending",
    })
    .select()
    .single();

  if (insertErr) {
    return NextResponse.json({ error: insertErr.message }, { status: 500 });
  }

  // 4. Envoyer l'email si demandé
  let emailSent = false;
  let emailError: string | null = null;

  if (sendEmail && clientEmail && validation) {
    const validateUrl = `${APP_URL}/bat/${validation.token}`;
    try {
      const result = await sendBatValidationEmail({
        to:          clientEmail,
        projectName: project.name,
        clientName:  project.client_name,
        batUrl:      publicUrl,
        validateUrl,
      });
      if ((result as { error?: { message?: string } } | null)?.error) {
        emailError = (result as { error: { message?: string } }).error.message ?? "Erreur Resend inconnue";
      } else {
        emailSent = true;
      }
    } catch (e) {
      emailError = e instanceof Error ? e.message : "Erreur lors de l'envoi de l'email";
      console.error("[bat/send] Email error:", e);
    }
  }

  return NextResponse.json({
    ok:           true,
    bat_url:      publicUrl,
    validation_id: validation?.id,
    email_sent:   emailSent,
    email_error:  emailError,
  });
}
