"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { can } from "@/lib/permissions";
import AxonautPanel from "@/components/AxonautPanel";

/* ─── Rôles réels (lib/permissions.ts n'en connaît que 2) ──────────────── */

const ROLES: Record<"admin" | "collaborateur", { label: string; color: string; bg: string }> = {
  admin:         { label: "Administrateur", color: "#B0892B", bg: "rgba(201,162,78,.14)" },
  collaborateur: { label: "Collaborateur",   color: "#5C5A52", bg: "#EEEDE6" },
};
const DEPTS = ["Direction", "Production", "Commercial", "Comptabilité"];

// Permissions réellement dérivées de lib/permissions.ts (pas de toggles par
// utilisateur en base — la permission suit le rôle, jamais l'inverse).
const PERM_ROWS: { key: Parameters<typeof can>[1]; label: string; desc: string }[] = [
  { key: "manage_users",          label: "Gérer les collaborateurs",   desc: "Inviter, modifier les rôles, désactiver des comptes" },
  { key: "manage_billing",        label: "Accéder à la facturation",   desc: "Voir et modifier les données de facturation" },
  { key: "update_project",        label: "Modifier tous les projets",  desc: "Éditer un projet même sans y être assigné" },
  { key: "view_all_tickets",      label: "Voir tous les tickets",      desc: "Accès à l'ensemble des tickets, pas seulement les siens" },
  { key: "view_all_opportunities",label: "Voir toutes les opportunités", desc: "Accès au pipeline complet de l'équipe" },
];

type AdminUser = {
  id: string; nom: string; email: string; pole: string; poste: string;
  avatar: string; avatarUrl: string | null; color: string;
  role: "admin" | "collaborateur"; actif: boolean; baseHeures: number;
  status: "active" | "inactive" | "pending";
  lastSignInAt: string | null; createdAt: string; projectCount: number;
};

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join("").toUpperCase();
}

function statusInfo(status: AdminUser["status"]) {
  const m = {
    active:   { label: "Actif",      color: "#1F8A5B", bg: "#E7F3EB", dot: "#3FBF77" },
    inactive: { label: "Inactif",    color: "#74726A", bg: "#F0EFEA", dot: "#A6A498" },
    pending:  { label: "En attente", color: "#B0892B", bg: "rgba(201,162,78,.14)", dot: "#C9A24E" },
  };
  return m[status];
}

function fmtSince(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
}
function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}
function fmtLastSeen(iso: string | null) {
  if (!iso) return "Jamais connecté";
  const d = new Date(iso);
  const now = new Date();
  const time = d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  if (d.toDateString() === now.toDateString()) return `Aujourd'hui · ${time}`;
  const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return `Hier · ${time}`;
  return `${d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })} · ${time}`;
}

function genTempPassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let out = "";
  for (let i = 0; i < 10; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

function IconClose() {
  return <svg width="17" height="17" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="5" x2="15" y2="15"/><line x1="15" y1="5" x2="5" y2="15"/></svg>;
}
function IconDiamond({ size = 11 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M10 3l1.7 4.3L16 9l-4.3 1.7L10 15l-1.7-4.3L4 9l4.3-1.7z"/></svg>;
}
function IconPerson({ size = 11 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="10" cy="7" r="3"/><path d="M4 16.5c0-3.2 2.7-5.2 6-5.2s6 2 6 5.2"/></svg>;
}
function roleIcon(role: "admin" | "collaborateur", size?: number) {
  return role === "admin" ? <IconDiamond size={size} /> : <IconPerson size={size} />;
}
function IconDots() {
  return <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor"><circle cx="4" cy="10" r="1.6"/><circle cx="10" cy="10" r="1.6"/><circle cx="16" cy="10" r="1.6"/></svg>;
}
function IconEdit() {
  return <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M3 15.5V17h1.5l8-8-1.5-1.5-8 8Z"/><path d="M11 5l1.5-1.5a1.4 1.4 0 0 1 2 2L13 7"/></svg>;
}
function IconKey() {
  return <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="9" width="12" height="8" rx="2"/><path d="M6.5 9V6.5a3.5 3.5 0 0 1 7 0V9"/></svg>;
}
function IconMail() {
  return <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="14" height="10" rx="1.6"/><path d="M3.5 6l6.5 5 6.5-5"/></svg>;
}

/* ─── Page principale ───────────────────────────────────────────────────── */

export default function AdministrationPage() {
  const { currentUser, canAccessAdmin } = useAuth();

  const [users, setUsers]     = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState("");
  const [filterRole, setFilterRole]     = useState<"tous" | "admin" | "collaborateur">("tous");
  const [filterStatus, setFilterStatus] = useState<"tous" | AdminUser["status"]>("tous");
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [detailId, setDetailId]     = useState<string | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [tempPasswords, setTempPasswords] = useState<Record<string, string>>({});
  const [resettingId, setResettingId]     = useState<string | null>(null);
  const [actionError, setActionError]     = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const r = await fetch("/api/admin/users", { cache: "no-store" });
      const d = await r.json();
      setUsers(Array.isArray(d.users) ? d.users : []);
    } catch {}
    finally { setLoading(false); }
  }
  useEffect(() => { if (canAccessAdmin) load(); }, [canAccessAdmin]);

  if (!canAccessAdmin) {
    return (
      <div style={{ margin: "-32px -40px", background: "#F5F5F2", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-plus-jakarta), system-ui, sans-serif" }}>
        <div style={{ textAlign: "center", maxWidth: 420 }}>
          <div style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 26, fontWeight: 800, color: "#16150F", marginBottom: 8 }}>Accès refusé</div>
          <p style={{ color: "#8C8B83", fontSize: 15, lineHeight: 1.6 }}>
            Seuls les administrateurs peuvent accéder à la page Administration.<br />
            Vous êtes connecté(e) en tant que <strong style={{ color: "#33322C" }}>{currentUser.nom}</strong>.
          </p>
        </div>
      </div>
    );
  }

  async function patchUser(id: string, patch: Record<string, unknown>) {
    const previous = users;
    setUsers(prev => prev.map(u => {
      if (u.id !== id) return u;
      const merged = { ...u, ...patch } as AdminUser;
      // status est dérivé de actif + lastSignInAt côté serveur (GET) — une
      // mise à jour optimiste qui ne touche que `actif` désynchroniserait le
      // badge affiché (il resterait "Actif" malgré la désactivation) tant
      // que la page n'est pas rechargée.
      if ("actif" in patch) {
        merged.status = !merged.lastSignInAt ? "pending" : merged.actif ? "active" : "inactive";
      }
      return merged;
    }));
    setActionError(null);
    try {
      const r = await fetch(`/api/admin/users/${id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        setUsers(previous);
        setActionError(d.error ?? "Échec de la modification");
      }
    } catch {
      setUsers(previous);
      setActionError("Erreur réseau");
    }
  }

  async function resetPassword(u: AdminUser) {
    setResettingId(u.id);
    setActionError(null);
    const pwd = genTempPassword();
    try {
      const r = await fetch("/api/admin/users/reset-password", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: u.email, newPassword: pwd }),
      });
      const d = await r.json();
      if (r.ok) setTempPasswords(prev => ({ ...prev, [u.id]: pwd }));
      else setActionError(d.error ?? "Échec de la réinitialisation");
    } catch {
      setActionError("Erreur réseau");
    } finally {
      setResettingId(null);
    }
  }

  async function resendInvite(u: AdminUser) {
    setActionError(null);
    try {
      const r = await fetch(`/api/admin/users/${u.id}/resend-invite`, { method: "POST" });
      if (!r.ok) { const d = await r.json().catch(() => ({})); setActionError(d.error ?? "Échec de l'envoi"); }
    } catch {
      setActionError("Erreur réseau");
    }
  }

  const filtered = users.filter(u => {
    if (search.trim() && !(u.nom + u.email).toLowerCase().includes(search.trim().toLowerCase())) return false;
    if (filterRole !== "tous" && u.role !== filterRole) return false;
    if (filterStatus !== "tous" && u.status !== filterStatus) return false;
    return true;
  });

  const stats = {
    total:  users.length,
    active: users.filter(u => u.status === "active").length,
    pending: users.filter(u => u.status === "pending").length,
    admins: users.filter(u => u.role === "admin").length,
  };

  const detailUser = users.find(u => u.id === detailId) ?? null;

  return (
    <div style={{ margin: "-32px -40px", background: "#F5F5F2", minHeight: "100vh", fontFamily: "var(--font-plus-jakarta), system-ui, sans-serif" }}>
      {actionError && (
        <div style={{ position: "fixed", top: 20, right: 20, zIndex: 100, background: "#FBEAE0", border: "1px solid #F0B08A", color: "#9A3412", fontSize: 15, fontWeight: 600, padding: "10px 16px", borderRadius: 10, boxShadow: "0 12px 30px -10px rgba(20,20,15,.3)", display: "flex", alignItems: "center", gap: 10 }}>
          {actionError}
          <span onClick={() => setActionError(null)} style={{ cursor: "pointer", opacity: .6 }}>×</span>
        </div>
      )}

      <div style={{ padding: "24px 30px 40px", display: "flex", flexDirection: "column", gap: 20 }}>

        {/* ── TITRE ── */}
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <div>
            <h1 style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 34, fontWeight: 800, color: "#16150F", margin: 0, letterSpacing: "-.015em" }}>Administration</h1>
            <div style={{ fontSize: 13.5, color: "#8C8B83", marginTop: 5 }}>Gestion des collaborateurs, rôles et accès au CRM</div>
          </div>
          <button onClick={() => setInviteOpen(true)} style={{ display: "flex", alignItems: "center", gap: 7, background: "#0A0A0A", color: "#E9D7A6", fontSize: 13.5, fontWeight: 600, padding: "10px 17px", borderRadius: 10, cursor: "pointer", border: "1px solid #0A0A0A", fontFamily: "inherit", whiteSpace: "nowrap" }}>
            <span style={{ fontSize: 16, lineHeight: 1 }}>+</span>Créer un utilisateur
          </button>
        </div>

        {/* ── STAT CARDS ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16 }}>
          <div style={{ background: "#0A0A0A", borderRadius: 16, padding: 20, color: "#EFE9DA", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: -40, right: -30, width: 130, height: 130, borderRadius: "50%", background: "radial-gradient(circle,rgba(201,162,78,.28),transparent 70%)", pointerEvents: "none" }} />
            <span style={{ fontSize: 10.5, letterSpacing: ".13em", textTransform: "uppercase", color: "#B79B5E", fontWeight: 700, position: "relative" }}>Collaborateurs</span>
            <div style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 42, fontWeight: 800, lineHeight: 1, marginTop: 12, color: "#F4ECD7", position: "relative" }}>{stats.total}</div>
            <div style={{ fontSize: 12.5, color: "#8E8876", marginTop: 9, position: "relative" }}>comptes au total</div>
          </div>
          <div style={statCardBox}>
            <span style={statCardLabel}>Actifs</span>
            <div style={{ ...statCardValue, color: "#1F8A5B" }}>{stats.active}</div>
            <div style={statCardHint}>connectés régulièrement</div>
          </div>
          <div style={statCardBox}>
            <span style={statCardLabel}>Comptes en attente</span>
            <div style={{ ...statCardValue, color: "#B0892B" }}>{stats.pending}</div>
            <div style={statCardHint}>en attente d&apos;activation</div>
          </div>
          <div style={statCardBox}>
            <span style={statCardLabel}>Administrateurs</span>
            <div style={{ ...statCardValue, color: "#16150F" }}>{stats.admins}</div>
            <div style={statCardHint}>accès complet</div>
          </div>
        </div>

        {/* ── FILTRES ── */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9, background: "#fff", border: "1px solid #E2E1DA", borderRadius: 10, padding: "9px 13px", minWidth: 260, flex: 1, maxWidth: 340 }}>
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="#A6A498" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="9" r="6"/><line x1="13.5" y1="13.5" x2="18" y2="18"/></svg>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher un collaborateur…" style={{ flex: 1, border: "none", outline: "none", background: "transparent", fontFamily: "inherit", fontSize: 13, color: "#1C1B16" }} />
          </div>
          <span style={{ width: 1, height: 24, background: "#E2E1DA" }} />
          <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: "#A6A498" }}>Rôle</span>
            {(["tous", "admin", "collaborateur"] as const).map(k => (
              <FilterChip key={k} on={filterRole === k} label={k === "tous" ? "Tous" : ROLES[k].label} onClick={() => setFilterRole(k)} />
            ))}
          </div>
          <span style={{ width: 1, height: 24, background: "#E2E1DA" }} />
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: "#A6A498" }}>Statut</span>
            {([["tous", "Tous"], ["active", "Actif"], ["inactive", "Inactif"], ["pending", "En attente"]] as const).map(([k, label]) => (
              <FilterChip key={k} on={filterStatus === k} label={label} onClick={() => setFilterStatus(k)} />
            ))}
          </div>
        </div>

        {/* ── TABLE ── */}
        <div style={{ background: "#fff", border: "1px solid #ECEBE4", borderRadius: 18, padding: "6px 22px 10px", boxShadow: "0 1px 2px rgba(20,20,15,.04)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "2.1fr 1.3fr 1.2fr 1fr 1.2fr 0.9fr", gap: 14, padding: "15px 0 12px", borderBottom: "1px solid #EEEDE6" }}>
            <span style={hCell}>Collaborateur</span>
            <span style={hCell}>Rôle</span>
            <span style={hCell}>Département</span>
            <span style={hCell}>Statut</span>
            <span style={hCell}>Dernière connexion</span>
            <span style={{ ...hCell, textAlign: "right" }}>Actions</span>
          </div>

          {loading ? (
            <div style={{ padding: 32, textAlign: "center", color: "#A6A498", fontSize: 15 }}>Chargement…</div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: 32, textAlign: "center", color: "#A6A498", fontSize: 15 }}>Aucun collaborateur ne correspond aux filtres.</div>
          ) : filtered.map(u => (
            <UserRow
              key={u.id}
              u={u}
              isSelf={u.email === currentUser.email}
              menuOpen={menuOpenId === u.id}
              onOpenDetail={() => setDetailId(u.id)}
              onToggleMenu={() => setMenuOpenId(o => o === u.id ? null : u.id)}
              onCloseMenu={() => setMenuOpenId(null)}
              onResetPassword={() => { setDetailId(u.id); resetPassword(u); }}
              onResendInvite={() => resendInvite(u)}
              onToggleActive={() => patchUser(u.id, { actif: !u.actif })}
            />
          ))}
        </div>

        {/* ── INTÉGRATION AXONAUT ── */}
        <AxonautPanel />
      </div>

      {/* ── MODAL INVITATION ── */}
      {inviteOpen && (
        <InviteModal
          onClose={() => setInviteOpen(false)}
          onCreated={() => { setInviteOpen(false); load(); }}
        />
      )}

      {/* ── DÉTAIL / ÉDITION (tiroir latéral) ── */}
      {detailUser && (
        <DetailPanel
          user={detailUser}
          isSelf={detailUser.email === currentUser.email}
          tempPassword={tempPasswords[detailUser.id] ?? null}
          resetting={resettingId === detailUser.id}
          onClose={() => setDetailId(null)}
          onPatch={(patch) => patchUser(detailUser.id, patch)}
          onResetPassword={() => resetPassword(detailUser)}
        />
      )}
    </div>
  );
}

const statCardBox: React.CSSProperties = { background: "#fff", border: "1px solid #ECEBE4", borderRadius: 16, padding: 20, boxShadow: "0 1px 2px rgba(20,20,15,.04)" };
const statCardLabel: React.CSSProperties = { fontSize: 10.5, letterSpacing: ".13em", textTransform: "uppercase", color: "#9A998F", fontWeight: 700 };
const statCardValue: React.CSSProperties = { fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 34, fontWeight: 800, lineHeight: 1, marginTop: 12 };
const statCardHint: React.CSSProperties = { fontSize: 12.5, color: "#8C8B83", marginTop: 9 };
const hCell: React.CSSProperties = { fontSize: 10.5, letterSpacing: ".1em", textTransform: "uppercase", color: "#A6A498", fontWeight: 700 };

function FilterChip({ on, label, onClick }: { on: boolean; label: string; onClick: () => void }) {
  return (
    <span onClick={onClick} style={{ padding: "6px 12px", borderRadius: 99, fontSize: 12.5, fontWeight: 600, cursor: "pointer", color: on ? "#fff" : "#7C7B73", background: on ? "#0A0A0A" : "#F0EFEA", border: `1px solid ${on ? "#0A0A0A" : "#E5E4DD"}` }}>
      {label}
    </span>
  );
}

function MenuItem({ icon, label, onClick, color = "#33322C", disabled, title }: {
  icon: React.ReactNode; label: string; onClick: () => void; color?: string; disabled?: boolean; title?: string;
}) {
  const [h, setH] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
      title={title}
      style={{ display: "flex", alignItems: "center", gap: 9, padding: "9px 11px", borderRadius: 8, cursor: disabled ? "not-allowed" : "pointer", color, fontSize: 13, fontWeight: 600, background: h && !disabled ? "#F5F4EF" : "transparent", opacity: disabled ? 0.45 : 1 }}
    >
      {icon}{label}
    </div>
  );
}

function UserRow({ u, isSelf, menuOpen, onOpenDetail, onToggleMenu, onCloseMenu, onResetPassword, onResendInvite, onToggleActive }: {
  u: AdminUser;
  isSelf: boolean;
  menuOpen: boolean;
  onOpenDetail: () => void;
  onToggleMenu: () => void;
  onCloseMenu: () => void;
  onResetPassword: () => void;
  onResendInvite: () => void;
  onToggleActive: () => void;
}) {
  const [hover, setHover] = useState(false);
  const st = statusInfo(u.status);
  const ro = ROLES[u.role];

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={onOpenDetail}
      style={{
        display: "grid", gridTemplateColumns: "2.1fr 1.3fr 1.2fr 1fr 1.2fr 0.9fr", gap: 14, alignItems: "center",
        padding: "12px 0", borderBottom: "1px solid #F2F1EB",
        cursor: "pointer", background: hover ? "#FBFAF6" : "transparent", transition: "background .12s ease",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
        {u.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={u.avatarUrl} alt="" style={{ width: 34, height: 34, borderRadius: "50%", objectFit: "cover", flex: "none", opacity: u.status === "inactive" ? 0.45 : 1 }} />
        ) : (
          <span style={{ width: 34, height: 34, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#fff", background: u.color, flex: "none", opacity: u.status === "inactive" ? 0.45 : 1 }}>{u.avatar || initials(u.nom)}</span>
        )}
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: "#1C1B16", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", display: "flex", alignItems: "center", gap: 6 }}>
            {u.nom}
            {isSelf && <span style={{ fontSize: 10.5, fontWeight: 700, color: "#B0892B", background: "rgba(201,162,78,.14)", borderRadius: 4, padding: "1px 6px" }}>VOUS</span>}
          </div>
          <div style={{ fontSize: 11.5, color: "#A6A498", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{u.email}</div>
        </div>
      </div>
      <div><span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11.5, fontWeight: 700, color: ro.color, background: ro.bg, borderRadius: 99, padding: "4px 10px", whiteSpace: "nowrap" }}>{roleIcon(u.role)}{ro.label}</span></div>
      <div style={{ fontSize: 12.5, color: "#5C5A52" }}>{u.pole || "—"}</div>
      <div><span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11.5, fontWeight: 700, color: st.color, background: st.bg, borderRadius: 99, padding: "4px 10px", whiteSpace: "nowrap" }}><span style={{ width: 6, height: 6, borderRadius: "50%", background: st.dot }} />{st.label}</span></div>
      <div style={{ fontSize: 12.5, color: "#8C8B83" }}>{fmtLastSeen(u.lastSignInAt)}</div>
      <div style={{ position: "relative", display: "flex", justifyContent: "flex-end" }}>
        <span onClick={(e) => { e.stopPropagation(); onToggleMenu(); }} style={{ width: 30, height: 30, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", color: "#A6A498", cursor: "pointer", background: menuOpen ? "#F0EFEA" : "transparent" }}>
          <IconDots />
        </span>
        {menuOpen && (
          <>
            <div onClick={(e) => { e.stopPropagation(); onCloseMenu(); }} style={{ position: "fixed", inset: 0, zIndex: 20 }} />
            <div onClick={e => e.stopPropagation()} style={{ position: "absolute", top: 34, right: 0, zIndex: 30, background: "#fff", border: "1px solid #E6E5DE", borderRadius: 12, boxShadow: "0 20px 44px -18px rgba(20,20,15,.35)", padding: 6, width: 214 }}>
              <MenuItem icon={<IconEdit />} label="Modifier le rôle" onClick={() => { onCloseMenu(); onOpenDetail(); }} />
              <MenuItem icon={<IconKey />} label="Réinitialiser le mot de passe" onClick={() => { onCloseMenu(); onResetPassword(); }} />
              {u.status === "pending" && (
                <MenuItem icon={<IconMail />} label="Renvoyer l'invitation" onClick={() => { onCloseMenu(); onResendInvite(); }} />
              )}
              <div style={{ borderTop: "1px solid #F0EFEA", marginTop: 2 }}>
                <MenuItem
                  icon={u.actif ? <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="10" cy="10" r="7"/><line x1="6" y1="6" x2="14" y2="14"/></svg> : <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M4 10.5 8 14l8-8.5"/></svg>}
                  label={u.actif ? "Désactiver le compte" : "Réactiver le compte"}
                  color={u.actif ? "#B7501A" : "#1F8A5B"}
                  disabled={isSelf}
                  title={isSelf ? "Vous ne pouvez pas désactiver votre propre compte" : undefined}
                  onClick={() => { if (isSelf) return; onCloseMenu(); onToggleActive(); }}
                />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ─── Modal invitation (centrée) ─────────────────────────────────────── */

const fieldLabel: React.CSSProperties = { fontSize: 11, letterSpacing: ".08em", textTransform: "uppercase", color: "#A6A498", fontWeight: 700, display: "block", marginBottom: 6 };
const fieldInput: React.CSSProperties = { width: "100%", boxSizing: "border-box", fontFamily: "inherit", fontSize: 13.5, color: "#1C1B16", background: "#fff", border: "1px solid #E2E1DA", borderRadius: 9, padding: "10px 12px", outline: "none" };

function InviteModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "collaborateur">("collaborateur");
  const [dept, setDept] = useState(DEPTS[1]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    if (!name.trim() || !email.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const r = await fetch("/api/admin/users/create", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nom: name.trim(), email: email.trim(), role, pole: dept, sendInvite: true }),
      });
      const d = await r.json();
      if (r.ok) {
        setSaved(true);
        setTimeout(onCreated, 700);
      } else {
        setError(d.error ?? "Échec de la création");
      }
    } catch {
      setError("Erreur réseau");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div onClick={onClose} className="modal-overlay-in" style={{ position: "fixed", inset: 0, background: "rgba(16,15,11,.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 70, padding: 30 }}>
      <div onClick={e => e.stopPropagation()} className="modal-panel-in" style={{ width: 520, maxWidth: "100%", background: "#fff", borderRadius: 18, boxShadow: "0 30px 70px -20px rgba(16,15,11,.5)", overflow: "hidden", display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 22px", background: "#0A0A0A", flex: "none" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ width: 30, height: 30, borderRadius: 8, background: "rgba(201,162,78,.16)", display: "flex", alignItems: "center", justifyContent: "center", color: "#E4C77B" }}>
              <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="7" r="3.2"/><path d="M3 16.5c0-3.2 2.4-5.2 5-5.2s5 2 5 5.2"/><path d="M14.5 5.5v4M12.5 7.5h4"/></svg>
            </span>
            <span style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 18, fontWeight: 700, color: "#F4ECD7" }}>Inviter un collaborateur</span>
          </div>
          <span onClick={onClose} style={{ width: 28, height: 28, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", color: "#8E8876", cursor: "pointer" }}><IconClose /></span>
        </div>

        <div style={{ padding: "20px 22px", display: "flex", flexDirection: "column", gap: 15 }}>
          {error && (
            <div style={{ background: "#FBEAE0", border: "1px solid #F0C5B0", borderRadius: 9, padding: "9px 12px", fontSize: 13.5, color: "#C2410C" }}>{error}</div>
          )}
          <div>
            <label style={fieldLabel}>Nom complet</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Ex. Camille Roussel" style={fieldInput} />
          </div>
          <div>
            <label style={fieldLabel}>E-mail professionnel</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="prenom@groupe-echo.fr" style={fieldInput} />
          </div>
          <div>
            <label style={{ ...fieldLabel, marginBottom: 8 }}>Rôle</label>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {(Object.keys(ROLES) as (keyof typeof ROLES)[]).map(k => {
                const on = role === k;
                const ro = ROLES[k];
                return (
                  <span key={k} onClick={() => setRole(k)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 13px", borderRadius: 10, fontSize: 12.5, fontWeight: 600, cursor: "pointer", color: on ? "#fff" : ro.color, background: on ? "#0A0A0A" : ro.bg, border: `1.5px solid ${on ? "#0A0A0A" : "transparent"}` }}>
                    {roleIcon(k)}{ro.label}
                  </span>
                );
              })}
            </div>
          </div>
          <div>
            <label style={{ ...fieldLabel, marginBottom: 8 }}>Département</label>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {DEPTS.map(d => {
                const on = dept === d;
                return (
                  <span key={d} onClick={() => setDept(d)} style={{ padding: "7px 13px", borderRadius: 99, fontSize: 12.5, fontWeight: 600, cursor: "pointer", color: on ? "#fff" : "#5C5A52", background: on ? "#0A0A0A" : "#F5F4EF", border: `1px solid ${on ? "#0A0A0A" : "#E5E4DD"}` }}>{d}</span>
                );
              })}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "16px 22px", borderTop: "1px solid #EEEDE6", background: "#FBFBF9", flex: "none" }}>
          <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, color: "#8C8B83" }}><IconMail />Un e-mail d&apos;invitation sera envoyé</span>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={onClose} style={{ background: "#fff", border: "1px solid #E2E1DA", color: "#33322C", fontSize: 13, fontWeight: 600, padding: "9px 16px", borderRadius: 10, cursor: "pointer", fontFamily: "inherit" }}>Annuler</button>
            <button
              onClick={handleSave}
              disabled={saving || !name.trim() || !email.trim()}
              style={{ display: "flex", alignItems: "center", gap: 7, background: saved ? "#1F8A5B" : "linear-gradient(135deg,#D8B25C,#A07B26)", color: saved ? "#fff" : "#1A1206", fontSize: 13, fontWeight: 700, padding: "9px 18px", borderRadius: 10, cursor: "pointer", border: "none", fontFamily: "inherit", opacity: saving ? 0.7 : 1 }}
            >
              {saved ? "Invitation envoyée ✓" : saving ? "Envoi…" : "Envoyer l'invitation"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Détail / édition (tiroir latéral) ─────────────────────────────────── */

function DetailPanel({ user, isSelf, tempPassword, resetting, onClose, onPatch, onResetPassword }: {
  user: AdminUser;
  isSelf: boolean;
  tempPassword: string | null;
  resetting: boolean;
  onClose: () => void;
  onPatch: (patch: Record<string, unknown>) => void;
  onResetPassword: () => void;
}) {
  const st = statusInfo(user.status);
  const deptOptions = DEPTS.includes(user.pole) || !user.pole ? DEPTS : [user.pole, ...DEPTS];

  return (
    <div onClick={onClose} className="modal-overlay-in" style={{ position: "fixed", inset: 0, background: "rgba(16,15,11,.5)", zIndex: 60, display: "flex", justifyContent: "flex-end" }}>
      <div onClick={e => e.stopPropagation()} className="modal-slide-in" style={{ width: 520, maxWidth: "100%", height: "100%", background: "#F5F5F2", display: "flex", flexDirection: "column", boxShadow: "-30px 0 70px -20px rgba(16,15,11,.5)" }}>
        <div style={{ background: "#0A0A0A", padding: "24px 24px 22px", position: "relative", overflow: "hidden", flex: "none" }}>
          <div style={{ position: "absolute", top: -60, right: -30, width: 220, height: 220, borderRadius: "50%", background: "radial-gradient(circle,rgba(201,162,78,.20),transparent 68%)" }} />
          <span onClick={onClose} style={{ position: "absolute", top: 18, right: 18, width: 28, height: 28, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", color: "#8E8876", cursor: "pointer" }}><IconClose /></span>
          <div style={{ display: "flex", alignItems: "center", gap: 16, position: "relative" }}>
            <span style={{ width: 58, height: 58, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", flex: "none", fontSize: 18, fontWeight: 700, color: "#fff", background: user.color, border: "2px solid rgba(255,255,255,.15)" }}>{user.avatar || initials(user.nom)}</span>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 21, fontWeight: 800, color: "#F4ECD7" }}>{user.nom}</div>
              <div style={{ fontSize: 12.5, color: "#AEA890", marginTop: 2 }}>{user.email}</div>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 700, color: st.color, background: st.bg, borderRadius: 99, padding: "3px 9px", marginTop: 8 }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: st.dot }} />{st.label}
              </span>
            </div>
          </div>
        </div>

        <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "20px 24px 26px", display: "flex", flexDirection: "column", gap: 20 }}>

          {isSelf && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#F0EFEA", border: "1px solid #E6E5DE", borderRadius: 10, padding: "9px 13px", fontSize: 13, fontWeight: 600, color: "#7C7B73" }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#A6A498", flex: "none" }} />
              C&apos;est votre propre compte — rôle et statut ne peuvent pas être modifiés ici.
            </div>
          )}

          {/* rôle */}
          <div>
            <div style={{ ...hCell, marginBottom: 9 }}>Rôle</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {(Object.keys(ROLES) as (keyof typeof ROLES)[]).map(k => {
                const on = user.role === k;
                const ro = ROLES[k];
                const disabled = isSelf;
                return (
                  <span key={k} onClick={() => !disabled && onPatch({ role: k })} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 13px", borderRadius: 10, fontSize: 12.5, fontWeight: 600, cursor: disabled ? "default" : "pointer", color: on ? "#fff" : ro.color, background: on ? "#0A0A0A" : ro.bg, border: `1.5px solid ${on ? "#0A0A0A" : "transparent"}`, opacity: disabled && !on ? 0.5 : 1 }}>
                    {roleIcon(k)}{ro.label}
                  </span>
                );
              })}
            </div>
          </div>

          {/* département */}
          <div>
            <div style={{ ...hCell, marginBottom: 9 }}>Département</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {deptOptions.map(d => {
                const on = user.pole === d;
                return (
                  <span key={d} onClick={() => onPatch({ pole: d })} style={{ padding: "7px 13px", borderRadius: 99, fontSize: 12.5, fontWeight: 600, cursor: "pointer", color: on ? "#fff" : "#5C5A52", background: on ? "#0A0A0A" : "#F5F4EF", border: `1px solid ${on ? "#0A0A0A" : "#E5E4DD"}` }}>{d}</span>
                );
              })}
            </div>
          </div>

          {/* permissions (lecture seule, dérivées du rôle) */}
          <div style={{ background: "#fff", border: "1px solid #ECEBE4", borderRadius: 14, padding: "6px 16px" }}>
            <div style={{ ...hCell, padding: "14px 0 5px" }}>Permissions du rôle</div>
            {PERM_ROWS.map(p => {
              const on = can(user.role, p.key);
              return (
                <div key={p.key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, padding: "13px 0", borderTop: "1px solid #F2F1EB" }}>
                  <div>
                    <div style={{ fontSize: 13.5, fontWeight: 600, color: "#1C1B16" }}>{p.label}</div>
                    <div style={{ fontSize: 12, color: "#8C8B83", marginTop: 2 }}>{p.desc}</div>
                  </div>
                  <span style={{ width: 46, height: 26, borderRadius: 99, background: on ? "#C9A24E" : "#D6D4CB", padding: 3, flex: "none", display: "flex" }}>
                    <span style={{ width: 20, height: 20, borderRadius: "50%", background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,.25)", transform: `translateX(${on ? 20 : 0}px)`, transition: "transform .18s ease" }} />
                  </span>
                </div>
              );
            })}
          </div>

          {/* infos compte */}
          <div style={{ background: "#fff", border: "1px solid #ECEBE4", borderRadius: 14, padding: "15px 16px" }}>
            <div style={{ ...hCell, marginBottom: 11 }}>Informations du compte</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
              <InfoRow label="Membre depuis" value={fmtSince(user.createdAt)} />
              <InfoRow label="Dernière connexion" value={user.lastSignInAt ? fmtDateTime(user.lastSignInAt) : "Jamais connecté"} />
              <InfoRow label="Projets assignés" value={String(user.projectCount)} />
            </div>
          </div>

          {/* mot de passe */}
          <div style={{ background: "#fff", border: "1px solid #ECEBE4", borderRadius: 14, padding: "15px 16px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14 }}>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: "#1C1B16" }}>Mot de passe</div>
                <div style={{ fontSize: 12, color: "#8C8B83", marginTop: 2, lineHeight: 1.4 }}>En cas de perte, générez un nouveau mot de passe temporaire.</div>
              </div>
              <button onClick={onResetPassword} disabled={resetting} style={{ background: "#F5F4EF", border: "1px solid #E2E1DA", color: "#33322C", fontSize: 12.5, fontWeight: 700, padding: "8px 14px", borderRadius: 9, cursor: resetting ? "wait" : "pointer", fontFamily: "inherit", whiteSpace: "nowrap", flex: "none", opacity: resetting ? 0.6 : 1 }}>
                {resetting ? "…" : "Réinitialiser"}
              </button>
            </div>
            {tempPassword && (
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 12, background: "#F7F6F2", border: "1px solid #E5E4DD", borderRadius: 10, padding: "10px 13px" }}>
                <svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="#1F8A5B" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flex: "none" }}><path d="M4 10.5 8 14l8-8.5"/></svg>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 11, color: "#8C8B83" }}>Mot de passe temporaire — à transmettre au collaborateur</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#1C1B16", fontFamily: "monospace", letterSpacing: ".03em", marginTop: 2 }}>{tempPassword}</div>
                </div>
              </div>
            )}
          </div>

          {/* zone danger */}
          <div style={{ background: "#FBEAE0", border: "1px solid #F0C5B0", borderRadius: 14, padding: "15px 16px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14 }}>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: "#B7501A" }}>{user.actif ? "Désactiver le compte" : "Compte désactivé"}</div>
                <div style={{ fontSize: 12, color: "#B7834E", marginTop: 2, lineHeight: 1.4 }}>
                  {isSelf ? "Vous ne pouvez pas désactiver votre propre compte." : user.actif ? "Révoque immédiatement l'accès au CRM pour ce collaborateur." : "Ce collaborateur n'a plus accès au CRM."}
                </div>
              </div>
              <button
                onClick={() => !isSelf && onPatch({ actif: !user.actif })}
                disabled={isSelf}
                style={{ background: "#fff", border: "1px solid #E0C6A6", color: "#B7501A", fontSize: 12.5, fontWeight: 700, padding: "8px 14px", borderRadius: 9, cursor: isSelf ? "not-allowed" : "pointer", fontFamily: "inherit", whiteSpace: "nowrap", flex: "none", opacity: isSelf ? 0.5 : 1 }}
              >
                {user.actif ? "Désactiver" : "Réactiver"}
              </button>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "15px 24px", borderTop: "1px solid #EAE9E3", background: "#FBFBF9", flex: "none" }}>
          <button onClick={onClose} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 7, background: "#0A0A0A", color: "#E9D7A6", fontSize: 13, fontWeight: 700, padding: 11, borderRadius: 10, cursor: "pointer", border: "none", fontFamily: "inherit" }}>Fermer</button>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between" }}>
      <span style={{ fontSize: 12.5, color: "#8C8B83" }}>{label}</span>
      <span style={{ fontSize: 12.5, fontWeight: 600, color: "#33322C" }}>{value}</span>
    </div>
  );
}
