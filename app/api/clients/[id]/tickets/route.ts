import { NextResponse } from "next/server";
import { createSupabaseServerClient, getServerSession } from "@/lib/supabase-server";
import { can } from "@/lib/permissions";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const profile = await getServerSession();
  if (!profile) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const supabase = createSupabaseServerClient();

  // Même scoping que GET /api/tickets : un collaborateur sans view_all_tickets
  // ne voit que les tickets où il est assigné (principal ou collaborateur
  // additionnel) — sinon cette route "par client" fuiterait des tickets
  // d'autres collaborateurs que la liste principale protège correctement.
  let allowedIds: string[] | null = null;
  if (!can(profile.role, "view_all_tickets")) {
    const [{ data: assignedRows }, { data: collabRows }] = await Promise.all([
      supabase.from("tickets").select("id").eq("assigned_to", profile.id),
      supabase.from("ticket_collaborators").select("ticket_id").eq("collaborateur_id", profile.id),
    ]);
    allowedIds = Array.from(new Set([
      ...(assignedRows ?? []).map(r => r.id as string),
      ...(collabRows ?? []).map(r => r.ticket_id as string),
    ]));
    if (allowedIds.length === 0) return NextResponse.json({ tickets: [] });
  }

  // Pas de jointure vers collaborateurs via created_by : cette colonne stocke
  // l'UID Supabase Auth, pas collaborateurs.id (FK volontairement retirée en
  // migration 010_fix_ticket_assigned_to_fk.sql) — un embed PostgREST dessus
  // échoue toujours ("no relationship in schema cache").
  let query = supabase
    .from("tickets")
    .select("*")
    .eq("axonaut_company_id", Number(params.id));
  if (allowedIds) query = query.in("id", allowedIds);

  const { data, error } = await query.order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ tickets: data ?? [] });
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const profile = await getServerSession();
  if (!profile) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!can(profile.role, "create_ticket")) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const body = await req.json();
  const { titre, description, priorite } = body;
  if (!titre?.trim()) return NextResponse.json({ error: "Titre requis" }, { status: 400 });

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("tickets")
    .insert({
      axonaut_company_id: Number(params.id),
      titre: titre.trim(),
      description: description?.trim() || null,
      priorite: priorite ?? "normale",
      created_by: profile.authId,
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ticket: data });
}

export const dynamic = "force-dynamic";
export const revalidate = 0;
