import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient, getServerSession } from "@/lib/supabase-server";
import { canViewTicket } from "@/lib/ticket-access";
import { createNotification } from "@/lib/notifications";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function frenchDateTime(isoStr: string) {
  const d = new Date(isoStr);
  return (
    d.toLocaleDateString("fr-FR", { day: "numeric", month: "long" }) +
    ", " +
    d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
  );
}

function nameToInitials(nom: string) {
  return nom
    .split(" ")
    .map(w => w[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

type CommentRow = {
  id: string;
  content: string;
  created_at: string;
  author_id: string | null;
  collaborateurs: { nom: string; color: string | null } | null;
};

function formatComment(row: CommentRow, currentUserId: string) {
  const nom = row.collaborateurs?.nom ?? "Inconnu";
  return {
    id:              row.id,
    content:         row.content,
    created_at:      row.created_at,
    date:            frenchDateTime(row.created_at),
    author_nom:      nom,
    author_initials: nameToInitials(nom),
    author_color:    row.collaborateurs?.color ?? "#888",
    canDelete:       row.author_id === currentUserId,
  };
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const supabase = createSupabaseAdminClient();

  if (!(await canViewTicket(supabase, params.id, session))) {
    return NextResponse.json({ error: "Ticket introuvable" }, { status: 404 });
  }

  const { data, error } = await supabase
    .from("ticket_comments")
    .select("id, content, created_at, author_id, collaborateurs(nom, color)")
    .eq("ticket_id", params.id)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ comments: (data ?? []).map(r => formatComment(r as unknown as CommentRow, session.id)) });
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const body = await req.json();
  const content = body.content?.trim();
  if (!content) return NextResponse.json({ error: "Contenu requis" }, { status: 400 });

  const supabase = createSupabaseAdminClient();

  // Revérifié à chaque envoi (pas seulement à l'ouverture de la page) : si le
  // ticket a été réattribué entre-temps, ce collaborateur ne doit plus
  // pouvoir y répondre.
  if (!(await canViewTicket(supabase, params.id, session))) {
    return NextResponse.json({ error: "Ticket introuvable ou réattribué — merci de rafraîchir la page" }, { status: 404 });
  }

  const { data, error } = await supabase
    .from("ticket_comments")
    .insert({ ticket_id: params.id, author_id: session.id, content })
    .select("id, content, created_at, author_id, collaborateurs(nom, color)")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: ticket } = await supabase.from("tickets").select("titre, assigned_to").eq("id", params.id).maybeSingle();
  if (ticket?.assigned_to && ticket.assigned_to !== session.id) {
    await createNotification({
      recipientId: ticket.assigned_to,
      type: "ticket_comment",
      entityType: "ticket",
      entityId: params.id,
      title: "Nouveau commentaire sur un ticket",
      body: `${session.nom} a commenté « ${ticket.titre ?? ""} »`,
      link: `/tickets/${params.id}`,
    });
  }

  return NextResponse.json({ comment: formatComment(data as unknown as CommentRow, session.id) }, { status: 201 });
}
