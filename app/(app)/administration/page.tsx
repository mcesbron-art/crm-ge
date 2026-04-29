"use client";

import { useState } from "react";
import { useAuth, type AppUser, type Role } from "@/lib/auth-context";
import { COLORS } from "@/lib/mock-data";
import AxonautPanel from "@/components/AxonautPanel";

const COULEURS_DISPO = [
  "#8E24AA", "#1E88E5", "#43A047", "#FB8C00",
  "#E53935", "#00897B", "#5E35B1", "#D81B60",
  "#3949AB", "#00ACC1", "#7CB342", "#F4511E",
];

const ROLE_OPTIONS: { value: Role; label: string; description: string }[] = [
  { value: "direction",     label: "Direction",     description: "Tous droits + page Administration" },
  { value: "admin",         label: "Admin",         description: "Tous droits données (chiffres) sauf Administration" },
  { value: "collaborateur", label: "Collaborateur", description: "État des dossiers, pas de montants/marges" },
];

export default function AdministrationPage() {
  const { currentUser, users, addUser, updateUser, toggleActif, canAccessAdmin } = useAuth();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  // GUARD : seul "direction" peut voir cette page
  if (!canAccessAdmin) {
    return (
      <div className="animate-fadeIn">
        <div style={{
          background: COLORS.blanc, borderRadius: 16,
          border: `1px solid ${COLORS.grisBorder}`, padding: "48px 32px",
          textAlign: "center",
        }}>
          <div style={{ fontSize: 48, marginBottom: 12, color: COLORS.grisMoyen }}>⛔</div>
          <h1 style={{
            fontFamily: "var(--font-dm-serif-display), Georgia, serif",
            fontSize: 24, color: COLORS.noir, margin: "0 0 8px",
          }}>Accès refusé</h1>
          <p style={{ color: COLORS.grisMoyen, fontSize: 14 }}>
            Seule la Direction peut accéder à la page Administration.<br />
            Vous êtes connecté(e) en tant que <strong>{currentUser.nom}</strong> ({currentUser.role}).
          </p>
        </div>
      </div>
    );
  }

  const sortedUsers = [...users].sort((a, b) => {
    const order: Record<Role, number> = { direction: 0, admin: 1, collaborateur: 2 };
    if (order[a.role] !== order[b.role]) return order[a.role] - order[b.role];
    return a.nom.localeCompare(b.nom);
  });

  const stats = {
    direction:     users.filter((u) => u.role === "direction" && u.actif).length,
    admin:         users.filter((u) => u.role === "admin" && u.actif).length,
    collaborateur: users.filter((u) => u.role === "collaborateur" && u.actif).length,
    inactifs:      users.filter((u) => !u.actif).length,
  };

  return (
    <div className="animate-fadeIn">
      {/* HEADER */}
      <div style={{ marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h1 style={{
            fontFamily: "var(--font-dm-serif-display), Georgia, serif",
            fontSize: 30, color: COLORS.noir, margin: "0 0 4px", fontWeight: 400,
          }}>Administration</h1>
          <p style={{ color: COLORS.grisMoyen, fontSize: 14, margin: 0 }}>
            Gestion des utilisateurs et de leurs droits d&apos;accès
          </p>
        </div>
        <button
          onClick={() => { setShowAddForm(true); setEditingId(null); }}
          style={{
            padding: "10px 20px", background: COLORS.noir, border: "none",
            borderRadius: 10, fontSize: 13, fontWeight: 600, color: COLORS.dore, cursor: "pointer",
          }}
        >+ Ajouter un utilisateur</button>
      </div>

      {/* KPI */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 28 }}>
        {[
          { label: "Direction",     value: stats.direction,     accent: true },
          { label: "Admin",         value: stats.admin,         color: COLORS.dore },
          { label: "Collaborateurs", value: stats.collaborateur, color: COLORS.noir },
          { label: "Inactifs",      value: stats.inactifs,      color: COLORS.grisMoyen },
        ].map((kpi, i) => (
          <div key={i} style={{
            background: kpi.accent ? COLORS.noir : COLORS.blanc,
            borderRadius: 14, padding: "20px",
            border: kpi.accent ? "none" : `1px solid ${COLORS.grisBorder}`,
          }}>
            <div style={{
              fontSize: 11, color: kpi.accent ? "#888" : COLORS.grisMoyen,
              textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6,
            }}>{kpi.label}</div>
            <div style={{
              fontSize: 32, fontWeight: 700,
              color: kpi.accent ? COLORS.dore : kpi.color,
              fontFamily: "var(--font-dm-serif-display), Georgia, serif", lineHeight: 1.1,
            }}>{kpi.value}</div>
          </div>
        ))}
      </div>

      {/* PANNEAU AXONAUT */}
      <AxonautPanel />

      {/* INFO BANNER */}
      <div style={{
        background: COLORS.dorePale, border: `1px solid ${COLORS.dore}33`,
        borderRadius: 12, padding: "12px 16px", marginBottom: 20,
        fontSize: 12, color: COLORS.noir, lineHeight: 1.6,
      }}>
        <strong style={{ color: COLORS.dore }}>Rôles :</strong>{" "}
        <strong>Direction</strong> = tous droits + cette page · <strong>Admin</strong> = tous droits données mais pas cette page · <strong>Collaborateur</strong> = pas de montants/marges, juste l&apos;état des dossiers et son temps.
      </div>

      {/* LISTE */}
      <div style={{
        background: COLORS.blanc, borderRadius: 16,
        border: `1px solid ${COLORS.grisBorder}`, overflow: "hidden",
      }}>
        <div style={{
          display: "grid", gridTemplateColumns: "auto 2fr 2fr 1fr 0.8fr 1fr 1fr",
          padding: "12px 20px", background: COLORS.gris,
          borderBottom: `1px solid ${COLORS.grisBorder}`,
          fontSize: 10, fontWeight: 700, color: COLORS.grisMoyen,
          textTransform: "uppercase", letterSpacing: 0.5,
          alignItems: "center", gap: 12,
        }}>
          <div style={{ width: 36 }}>•</div>
          <div>Utilisateur</div>
          <div>Pôle</div>
          <div>Rôle</div>
          <div style={{ textAlign: "center" }}>Base</div>
          <div style={{ textAlign: "center" }}>Statut</div>
          <div style={{ textAlign: "right" }}>Actions</div>
        </div>

        {sortedUsers.map((u) => (
          <UserRow
            key={u.id}
            user={u}
            isCurrent={u.id === currentUser.id}
            isEditing={editingId === u.id}
            onEdit={() => { setEditingId(u.id); setShowAddForm(false); }}
            onCancelEdit={() => setEditingId(null)}
            onSave={(patch) => { updateUser(u.id, patch); setEditingId(null); }}
            onToggleActif={() => toggleActif(u.id)}
          />
        ))}

        {showAddForm && (
          <AddUserForm
            onCancel={() => setShowAddForm(false)}
            onCreate={(u) => { addUser(u); setShowAddForm(false); }}
            existingEmails={users.map((u) => u.email)}
          />
        )}
      </div>
    </div>
  );
}

/* =====================================================================
   USER ROW (avec mode édition inline)
   ===================================================================== */
function UserRow({
  user, isCurrent, isEditing, onEdit, onCancelEdit, onSave, onToggleActif,
}: {
  user: AppUser;
  isCurrent: boolean;
  isEditing: boolean;
  onEdit: () => void;
  onCancelEdit: () => void;
  onSave: (patch: Partial<AppUser>) => void;
  onToggleActif: () => void;
}) {
  const [draft, setDraft] = useState<Partial<AppUser>>({
    nom: user.nom, email: user.email, pole: user.pole,
    role: user.role, base: user.base, color: user.color,
  });

  if (isEditing) {
    return (
      <div style={{
        display: "grid", gridTemplateColumns: "auto 1fr",
        padding: "16px 20px", background: COLORS.dorePale,
        borderBottom: `1px solid ${COLORS.grisBorder}`,
        gap: 16, alignItems: "start",
      }}>
        <div
          style={{
            width: 36, height: 36, borderRadius: "50%",
            background: draft.color, color: "#fff",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 14, fontWeight: 700,
          }}
        >{user.avatar}</div>
        <div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 10 }}>
            <Input label="Nom" value={draft.nom!} onChange={(v) => setDraft({ ...draft, nom: v })} />
            <Input label="Email" value={draft.email!} onChange={(v) => setDraft({ ...draft, email: v })} type="email" />
            <Input label="Pôle" value={draft.pole!} onChange={(v) => setDraft({ ...draft, pole: v })} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 100px 1fr", gap: 10, marginBottom: 12 }}>
            <Select
              label="Rôle"
              value={draft.role!}
              onChange={(v) => setDraft({ ...draft, role: v as Role })}
              options={ROLE_OPTIONS.map((r) => ({ value: r.value, label: r.label }))}
            />
            <Input
              label="Base h/sem"
              value={String(draft.base)}
              onChange={(v) => setDraft({ ...draft, base: parseInt(v) || 35 })}
              type="number"
            />
            <ColorPicker
              label="Couleur"
              value={draft.color!}
              onChange={(v) => setDraft({ ...draft, color: v })}
            />
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button
              onClick={onCancelEdit}
              style={{
                padding: "8px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer",
                background: "transparent", border: `1px solid ${COLORS.grisBorder}`, color: COLORS.grisMoyen,
              }}
            >Annuler</button>
            <button
              onClick={() => onSave(draft)}
              style={{
                padding: "8px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer",
                background: COLORS.noir, border: "none", color: COLORS.dore,
              }}
            >Enregistrer</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      display: "grid", gridTemplateColumns: "auto 2fr 2fr 1fr 0.8fr 1fr 1fr",
      padding: "14px 20px", borderBottom: `1px solid ${COLORS.grisBorder}`,
      alignItems: "center", gap: 12,
      opacity: user.actif ? 1 : 0.5,
    }}>
      <div
        style={{
          width: 36, height: 36, borderRadius: "50%",
          background: user.color, color: "#fff",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 14, fontWeight: 700,
        }}
      >{user.avatar}</div>
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontWeight: 600, fontSize: 14, color: COLORS.noir }}>{user.nom}</span>
          {isCurrent && (
            <span style={{
              fontSize: 9, padding: "2px 6px", borderRadius: 4,
              background: COLORS.dore, color: COLORS.noir, fontWeight: 700,
              textTransform: "uppercase", letterSpacing: 0.5,
            }}>Vous</span>
          )}
        </div>
        <div style={{ fontSize: 11, color: COLORS.grisMoyen }}>{user.email}</div>
      </div>
      <div style={{ fontSize: 13, color: COLORS.noir }}>{user.pole}</div>
      <div>
        <RoleBadge role={user.role} />
      </div>
      <div style={{ textAlign: "center", fontSize: 13, fontWeight: 600, color: COLORS.noir }}>
        {user.base}h
      </div>
      <div style={{ textAlign: "center" }}>
        <span style={{
          padding: "4px 10px", borderRadius: 12, fontSize: 11, fontWeight: 700,
          background: user.actif ? COLORS.vertBg : "#ECEFF1",
          color: user.actif ? COLORS.vert : COLORS.grisMoyen,
        }}>
          {user.actif ? "Actif" : "Inactif"}
        </span>
      </div>
      <div style={{ display: "flex", gap: 6, justifyContent: "flex-end", flexWrap: "wrap" }}>
        <PasswordResetButton email={user.email} nom={user.nom} />
        <button
          onClick={onEdit}
          style={{
            padding: "5px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer",
            background: COLORS.blanc, border: `1px solid ${COLORS.grisBorder}`, color: COLORS.noir,
          }}
        >Modifier</button>
        <button
          onClick={onToggleActif}
          disabled={isCurrent}
          title={isCurrent ? "Vous ne pouvez pas vous désactiver vous-même" : ""}
          style={{
            padding: "5px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600,
            cursor: isCurrent ? "not-allowed" : "pointer",
            background: COLORS.blanc,
            border: `1px solid ${user.actif ? COLORS.rouge + "44" : COLORS.vert + "44"}`,
            color: user.actif ? COLORS.rouge : COLORS.vert,
            opacity: isCurrent ? 0.5 : 1,
          }}
        >
          {user.actif ? "Désactiver" : "Réactiver"}
        </button>
      </div>
    </div>
  );
}

/* =====================================================================
   PASSWORD RESET — bouton + modal
   ===================================================================== */
function PasswordResetButton({ email, nom }: { email: string; nom: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title={`Réinitialiser le mot de passe de ${nom}`}
        style={{
          padding: "5px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer",
          background: COLORS.blanc, border: `1px solid ${COLORS.dore}66`, color: COLORS.dore,
        }}
      >🔑 Mot de passe</button>
      {open && <PasswordResetModal email={email} nom={nom} onClose={() => setOpen(false)} />}
    </>
  );
}

function PasswordResetModal({
  email, nom, onClose,
}: {
  email: string;
  nom: string;
  onClose: () => void;
}) {
  const [mode, setMode] = useState<"email" | "direct">("email");
  const [newPassword, setNewPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  async function submit() {
    setSubmitting(true);
    setResult(null);
    try {
      const body =
        mode === "email"
          ? { email, sendEmail: true }
          : { email, newPassword };
      const r = await fetch("/api/admin/users/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await r.json();
      if (!r.ok) {
        setResult({ ok: false, message: data.error ?? "Erreur" });
      } else {
        setResult({ ok: true, message: data.message ?? "Opération réussie" });
      }
    } catch (e) {
      setResult({
        ok: false,
        message: e instanceof Error ? e.message : "Erreur réseau",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 100, padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: COLORS.blanc, borderRadius: 16, padding: 24,
          width: "100%", maxWidth: 480,
          boxShadow: "0 24px 80px rgba(0,0,0,0.3)",
        }}
      >
        <h2 style={{
          fontFamily: "var(--font-dm-serif-display), Georgia, serif",
          fontSize: 22, color: COLORS.noir, margin: "0 0 4px",
        }}>Réinitialiser le mot de passe</h2>
        <p style={{ fontSize: 13, color: COLORS.grisMoyen, marginBottom: 20 }}>
          Pour <strong style={{ color: COLORS.noir }}>{nom}</strong>{" "}
          <span style={{ fontFamily: "monospace" }}>({email})</span>
        </p>

        {/* Choix du mode */}
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          <button
            onClick={() => { setMode("email"); setResult(null); }}
            style={{
              flex: 1, padding: "10px",
              borderRadius: 8,
              border: `2px solid ${mode === "email" ? COLORS.dore : COLORS.grisBorder}`,
              background: mode === "email" ? COLORS.dorePale : COLORS.blanc,
              color: mode === "email" ? COLORS.dore : COLORS.grisMoyen,
              fontSize: 12, fontWeight: 600, cursor: "pointer", textAlign: "center",
            }}
          >
            <div style={{ fontSize: 18, marginBottom: 4 }}>✉</div>
            Envoyer un email
            <div style={{ fontSize: 10, fontWeight: 400, color: COLORS.grisMoyen, marginTop: 2 }}>
              L&apos;utilisateur définit son MDP
            </div>
          </button>
          <button
            onClick={() => { setMode("direct"); setResult(null); }}
            style={{
              flex: 1, padding: "10px",
              borderRadius: 8,
              border: `2px solid ${mode === "direct" ? COLORS.dore : COLORS.grisBorder}`,
              background: mode === "direct" ? COLORS.dorePale : COLORS.blanc,
              color: mode === "direct" ? COLORS.dore : COLORS.grisMoyen,
              fontSize: 12, fontWeight: 600, cursor: "pointer", textAlign: "center",
            }}
          >
            <div style={{ fontSize: 18, marginBottom: 4 }}>🔑</div>
            Définir directement
            <div style={{ fontSize: 10, fontWeight: 400, color: COLORS.grisMoyen, marginTop: 2 }}>
              Vous tapez le MDP
            </div>
          </button>
        </div>

        {/* Input password si mode direct */}
        {mode === "direct" && (
          <div style={{ marginBottom: 16 }}>
            <label style={{
              display: "block", fontSize: 10, fontWeight: 600, color: COLORS.grisMoyen,
              textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4,
            }}>Nouveau mot de passe (8 car. min)</label>
            <input
              type="text"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="ex: cafe-lune-42"
              style={{
                width: "100%", padding: "8px 10px",
                border: `1px solid ${COLORS.grisBorder}`, borderRadius: 6,
                fontSize: 13, color: COLORS.noir, background: COLORS.blanc,
                outline: "none", fontFamily: "monospace",
              }}
            />
            <p style={{ fontSize: 10, color: COLORS.grisMoyen, marginTop: 4, lineHeight: 1.4 }}>
              ⚠ À transmettre à l&apos;utilisateur en main propre ou par téléphone
              (pas par email en clair).
            </p>
          </div>
        )}

        {/* Résultat */}
        {result && (
          <div style={{
            padding: "10px 14px", marginBottom: 16,
            background: result.ok ? COLORS.vertBg : COLORS.rougeBg,
            border: `1px solid ${result.ok ? COLORS.vert + "55" : COLORS.rouge + "55"}`,
            borderRadius: 8,
            color: result.ok ? "#1B5E20" : COLORS.rouge,
            fontSize: 12, fontWeight: 600,
          }}>
            {result.ok ? "✓ " : "✗ "}{result.message}
          </div>
        )}

        {/* Actions */}
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button
            onClick={onClose}
            disabled={submitting}
            style={{
              padding: "9px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer",
              background: "transparent", border: `1px solid ${COLORS.grisBorder}`, color: COLORS.grisMoyen,
            }}
          >{result?.ok ? "Fermer" : "Annuler"}</button>
          {!result?.ok && (
            <button
              onClick={submit}
              disabled={submitting || (mode === "direct" && newPassword.length < 8)}
              style={{
                padding: "9px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600,
                cursor: submitting ? "wait" : "pointer",
                background: COLORS.noir, border: "none", color: COLORS.dore,
                opacity: submitting || (mode === "direct" && newPassword.length < 8) ? 0.5 : 1,
              }}
            >{submitting ? "..." : (mode === "email" ? "Envoyer l'email" : "Définir le mot de passe")}</button>
          )}
        </div>
      </div>
    </div>
  );
}

/* =====================================================================
   ADD USER FORM
   ===================================================================== */
function AddUserForm({
  onCancel, onCreate, existingEmails,
}: {
  onCancel: () => void;
  onCreate: (u: Omit<AppUser, "id">) => void;
  existingEmails: string[];
}) {
  const [nom, setNom] = useState("");
  const [email, setEmail] = useState("");
  const [pole, setPole] = useState("");
  const [role, setRole] = useState<Role>("collaborateur");
  const [base, setBase] = useState(35);
  const [color, setColor] = useState(COULEURS_DISPO[0]);

  const avatar = nom ? nom.trim().split(/\s+/).map((s) => s[0]?.toUpperCase()).join("").slice(0, 2) || "?" : "?";

  const valid = nom.trim() && email.trim() && pole.trim() && !existingEmails.includes(email.trim());
  const emailExists = email.trim() && existingEmails.includes(email.trim());

  return (
    <div style={{
      padding: "20px", background: "#FFFCF6",
      borderTop: `2px solid ${COLORS.dore}`,
    }}>
      <div style={{ marginBottom: 12, display: "flex", alignItems: "center", gap: 12 }}>
        <div
          style={{
            width: 40, height: 40, borderRadius: "50%",
            background: color, color: "#fff",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 14, fontWeight: 700, flexShrink: 0,
          }}
        >{avatar}</div>
        <div style={{
          fontFamily: "var(--font-dm-serif-display), Georgia, serif",
          fontSize: 18, color: COLORS.noir,
        }}>Nouvel utilisateur</div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
        <Input label="Nom *" value={nom} onChange={setNom} placeholder="ex: Sophie Martin" />
        <div>
          <Input
            label="Email *"
            type="email"
            value={email}
            onChange={setEmail}
            placeholder="prenom@groupe-echo.fr"
          />
          {emailExists && (
            <div style={{ fontSize: 11, color: COLORS.rouge, marginTop: 4 }}>
              Cet email existe déjà
            </div>
          )}
        </div>
        <Input label="Pôle *" value={pole} onChange={setPole} placeholder="ex: Communication" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 100px 1fr", gap: 12, marginBottom: 16 }}>
        <Select
          label="Rôle"
          value={role}
          onChange={(v) => setRole(v as Role)}
          options={ROLE_OPTIONS.map((r) => ({ value: r.value, label: `${r.label}` }))}
        />
        <Input
          label="Base h/sem"
          type="number"
          value={String(base)}
          onChange={(v) => setBase(parseInt(v) || 35)}
        />
        <ColorPicker label="Couleur" value={color} onChange={setColor} />
      </div>

      <div style={{ fontSize: 11, color: COLORS.grisMoyen, marginBottom: 12 }}>
        {ROLE_OPTIONS.find((r) => r.value === role)?.description}
      </div>

      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <button
          onClick={onCancel}
          style={{
            padding: "9px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer",
            background: "transparent", border: `1px solid ${COLORS.grisBorder}`, color: COLORS.grisMoyen,
          }}
        >Annuler</button>
        <button
          onClick={() => valid && onCreate({
            nom: nom.trim(),
            email: email.trim(),
            pole: pole.trim(),
            avatar,
            color,
            role,
            base,
            actif: true,
          })}
          disabled={!valid}
          style={{
            padding: "9px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600,
            cursor: valid ? "pointer" : "not-allowed",
            background: valid ? COLORS.noir : COLORS.gris,
            border: "none", color: valid ? COLORS.dore : COLORS.grisMoyen,
            opacity: valid ? 1 : 0.6,
          }}
        >Créer l&apos;utilisateur</button>
      </div>
    </div>
  );
}

/* =====================================================================
   FORM HELPERS
   ===================================================================== */
function Input({
  label, value, onChange, type = "text", placeholder,
}: {
  label: string; value: string;
  onChange: (v: string) => void;
  type?: string; placeholder?: string;
}) {
  return (
    <div>
      <label style={{
        display: "block", fontSize: 10, fontWeight: 600, color: COLORS.grisMoyen,
        textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4,
      }}>{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: "100%", padding: "8px 10px",
          border: `1px solid ${COLORS.grisBorder}`, borderRadius: 6,
          fontSize: 13, color: COLORS.noir, background: COLORS.blanc,
          outline: "none", fontFamily: "inherit",
        }}
      />
    </div>
  );
}

function Select({
  label, value, onChange, options,
}: {
  label: string; value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div>
      <label style={{
        display: "block", fontSize: 10, fontWeight: 600, color: COLORS.grisMoyen,
        textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4,
      }}>{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: "100%", padding: "8px 10px",
          border: `1px solid ${COLORS.grisBorder}`, borderRadius: 6,
          fontSize: 13, color: COLORS.noir, background: COLORS.blanc,
          outline: "none", cursor: "pointer", fontFamily: "inherit",
        }}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

function ColorPicker({
  label, value, onChange,
}: {
  label: string; value: string; onChange: (v: string) => void;
}) {
  return (
    <div>
      <label style={{
        display: "block", fontSize: 10, fontWeight: 600, color: COLORS.grisMoyen,
        textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4,
      }}>{label}</label>
      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
        {COULEURS_DISPO.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => onChange(c)}
            style={{
              width: 22, height: 22, borderRadius: "50%",
              background: c, cursor: "pointer",
              border: value === c ? `3px solid ${COLORS.noir}` : "2px solid transparent",
              transition: "border 0.15s",
            }}
          />
        ))}
      </div>
    </div>
  );
}

function RoleBadge({ role }: { role: Role }) {
  const styles: Record<Role, { bg: string; color: string; label: string }> = {
    direction:     { bg: "#FFF8E1", color: "#F57F17", label: "Direction" },
    admin:         { bg: COLORS.dorePale, color: COLORS.dore, label: "Admin" },
    collaborateur: { bg: "#E8EAF6", color: "#3949AB", label: "Collaborateur" },
  };
  const s = styles[role];
  return (
    <span style={{
      padding: "4px 10px", borderRadius: 12,
      background: s.bg, color: s.color,
      fontSize: 11, fontWeight: 700,
      whiteSpace: "nowrap",
    }}>{s.label}</span>
  );
}
