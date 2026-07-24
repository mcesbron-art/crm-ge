import "server-only";
import { createSupabaseAdminClient } from "@/lib/supabase-server";
import { can } from "@/lib/permissions";

/**
 * Un ticket est visible par l'assigné principal, un collaborateur
 * additionnel (ticket_collaborators), ou un rôle avec view_all_tickets —
 * admin uniquement. Centralisé ici car réutilisé par plusieurs routes
 * (détail du ticket, commentaires) qui ne doivent jamais désynchroniser
 * cette règle de visibilité.
 */
export async function canViewTicket(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  ticketId: string,
  session: { id: string; role: "admin" | "collaborateur" },
): Promise<boolean> {
  if (can(session.role, "view_all_tickets")) return true;
  const { data: ticket } = await supabase.from("tickets").select("assigned_to").eq("id", ticketId).maybeSingle();
  if (ticket?.assigned_to === session.id) return true;
  const { data: collab } = await supabase.from("ticket_collaborators").select("ticket_id").eq("ticket_id", ticketId).eq("collaborateur_id", session.id).maybeSingle();
  return !!collab;
}
