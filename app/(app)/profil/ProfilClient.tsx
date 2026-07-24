"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "@/lib/theme-context";

const ACCENT = "#C9A24E";

type ProfilData = {
  id: string;
  nom: string;
  email: string;
  telephone: string;
  bio: string;
  poste: string;
  pole: string;
  avatarUrl: string | null;
  color: string;
  role: "admin" | "collaborateur";
  createdAt: string | null;
};

type ProjetSummary = { id: string; name: string; client_name: string; status: string };

const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  brief:              { label: "Brief",              color: "#74726A", bg: "#F0EFEA" },
  a_faire:            { label: "À faire",             color: "#2563EB", bg: "#E6EEFB" },
  en_cours:           { label: "En cours",            color: "#2563EB", bg: "#E6EEFB" },
  attente_element:    { label: "Attente élément",     color: "#C2410C", bg: "#FBEAE0" },
  validation_client:  { label: "Validation",          color: "#B0892B", bg: "rgba(201,162,78,.14)" },
  bat_envoye:         { label: "BAT envoyé",          color: "#7C3AED", bg: "#EDE9FB" },
  a_facturer:         { label: "À facturer",          color: "#C2410C", bg: "#FBEAE0" },
  termine:            { label: "Terminé",             color: "#1F8A5B", bg: "#E7F3EB" },
};

const ROLE_LABEL: Record<string, string> = { admin: "Admin", collaborateur: "Collaborateur" };

function initials(nom: string): string {
  return nom.trim().split(/\s+/).slice(0, 2).map(w => w[0] ?? "").join("").toUpperCase() || "?";
}

function splitName(nom: string): { first: string; last: string } {
  const parts = nom.trim().split(/\s+/);
  if (parts.length <= 1) return { first: nom, last: "" };
  return { first: parts.slice(0, -1).join(" "), last: parts[parts.length - 1] };
}

function Toggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <span onClick={onClick} style={{ width: 46, height: 26, borderRadius: 99, background: on ? ACCENT : "#D6D4CB", padding: 3, cursor: "pointer", flex: "none", transition: "background .18s ease", display: "flex" }}>
      <span style={{ width: 20, height: 20, borderRadius: "50%", background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,.25)", transform: `translateX(${on ? "20px" : "0px"})`, transition: "transform .18s ease" }} />
    </span>
  );
}

function Card({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #ECEBE4", borderRadius: 16, padding: "22px 24px", boxShadow: "0 1px 2px rgba(20,20,15,.04)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
        <h3 style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 18, fontWeight: 700, color: "#16150F", margin: 0 }}>{title}</h3>
        {action}
      </div>
      {children}
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 13, letterSpacing: ".06em", textTransform: "uppercase" as const, color: "#A6A498", fontWeight: 700, marginBottom: 6 }}>{children}</div>;
}

const inputStyle: React.CSSProperties = { width: "100%", boxSizing: "border-box", fontFamily: "inherit", fontSize: 15.5, color: "#1C1B16", background: "#fff", border: "1px solid #E2E1DA", borderRadius: 10, padding: "10px 12px", outline: "none" };
const readStyle: React.CSSProperties = { fontSize: 16, fontWeight: 600, color: "#1C1B16" };

export default function ProfilClient({ initial }: { initial: ProfilData }) {
  const router = useRouter();
  const { mode, toggleMode } = useTheme();

  const [tab, setTab] = useState<"profil" | "securite" | "notifs" | "prefs">("profil");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const { first, last } = splitName(initial.nom);
  const [form, setForm] = useState({ firstName: first, lastName: last, phone: initial.telephone, poste: initial.poste, bio: initial.bio });

  const [avatarUrl, setAvatarUrl] = useState(initial.avatarUrl);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [projects, setProjects] = useState<ProjetSummary[] | null>(null);

  useEffect(() => {
    fetch(`/api/projets?collab=${initial.id}&page_size=4`)
      .then(r => r.json())
      .then((d: { data?: ProjetSummary[] }) => setProjects(Array.isArray(d.data) ? d.data : []))
      .catch(() => setProjects([]));
  }, []);

  const cancelEdit = () => {
    setForm({ firstName: first, lastName: last, phone: initial.telephone, poste: initial.poste, bio: initial.bio });
    setEditing(false);
    setSaveError(null);
  };

  const saveEdit = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      const nom = `${form.firstName.trim()} ${form.lastName.trim()}`.trim();
      const res = await fetch("/api/profil", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nom, telephone: form.phone, poste: form.poste, bio: form.bio }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Échec de l'enregistrement");
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
      setEditing(false);
      router.refresh();
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Échec de l'enregistrement");
    } finally {
      setSaving(false);
    }
  };

  const onPickPhoto = () => fileInputRef.current?.click();

  const onPhotoSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setAvatarUploading(true);
    setAvatarError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/profil/avatar", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Échec de l'envoi");
      setAvatarUrl(data.avatarUrl);
      router.refresh();
    } catch (err) {
      setAvatarError(err instanceof Error ? err.message : "Échec de l'envoi");
    } finally {
      setAvatarUploading(false);
    }
  };

  const mkField = (key: "firstName" | "lastName" | "phone" | "poste", displayValue: string) => {
    if (!editing) return <div style={readStyle}>{displayValue || "—"}</div>;
    return (
      <input type="text" value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} style={inputStyle} />
    );
  };

  const tabDefs: Array<[typeof tab, string]> = [["profil", "Profil"], ["securite", "Sécurité"], ["notifs", "Notifications"], ["prefs", "Préférences"]];

  return (
    <div style={{ margin: "-32px -40px", minHeight: "100vh", background: "#F5F5F2", fontFamily: "'Plus Jakarta Sans',system-ui,sans-serif" }}>
      <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: "none" }} onChange={onPhotoSelected} />

      {/* top bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "13px 30px", borderBottom: "1px solid #EAE9E3", background: "#FBFBF9" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 15, color: "#8C8B83" }}>
          <span>Mon compte</span>
          <span style={{ color: "#C7C5BB" }}>/</span>
          <span style={{ color: "#33322C", fontWeight: 600 }}>Profil</span>
        </div>
      </div>

      {/* hero */}
      <div style={{ position: "relative", background: "#0A0A0A", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: -120, right: -60, width: 420, height: 420, borderRadius: "50%", background: "radial-gradient(circle,rgba(201,162,78,.22),transparent 66%)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: -160, left: "20%", width: 380, height: 380, borderRadius: "50%", background: "radial-gradient(circle,rgba(140,106,32,.14),transparent 68%)", pointerEvents: "none" }} />
        <div style={{ position: "relative", height: 80 }} />
        <div style={{ position: "relative", display: "flex", alignItems: "flex-end", gap: 22, padding: "0 34px 24px" }}>
          <div style={{ position: "relative", flex: "none" }}>
            <span style={{
              width: 112, height: 112, borderRadius: 26,
              background: avatarUrl ? undefined : `linear-gradient(135deg, ${initial.color}, #8C6A20)`,
              backgroundImage: avatarUrl ? `url(${avatarUrl})` : undefined, backgroundSize: "cover", backgroundPosition: "center",
              color: "#1A1206", fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 40, fontWeight: 800,
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 20px 40px -14px rgba(201,162,78,.6)", border: "3px solid #161512",
            }}>
              {!avatarUrl && initials(initial.nom)}
            </span>
            <span
              onClick={avatarUploading ? undefined : onPickPhoto}
              title="Changer la photo"
              style={{ position: "absolute", bottom: -6, right: -6, width: 32, height: 32, borderRadius: 10, background: "#fff", border: "1px solid #E2E1DA", display: "flex", alignItems: "center", justifyContent: "center", cursor: avatarUploading ? "default" : "pointer", boxShadow: "0 4px 10px rgba(0,0,0,.2)", color: "#5C5A52" }}
            >
              {avatarUploading ? (
                <span style={{ width: 13, height: 13, border: "2px solid #E2E1DA", borderTopColor: "#B0892B", borderRadius: "50%", display: "inline-block", animation: "profilSpin .7s linear infinite" }} />
              ) : (
                <svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M3 15.5V17h1.5l8-8-1.5-1.5-8 8Z" /><path d="M11 5l1.5-1.5a1.4 1.4 0 0 1 2 2L13 7" /></svg>
              )}
            </span>
          </div>
          <div style={{ flex: 1, minWidth: 0, paddingBottom: 6 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 11, flexWrap: "wrap" }}>
              <h1 style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 31, fontWeight: 800, color: "#F4ECD7", margin: 0, letterSpacing: "-.01em" }}>{initial.nom}</h1>
              <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 13.5, fontWeight: 700, color: "#9BE3B5", background: "rgba(31,138,91,.22)", borderRadius: 99, padding: "3px 10px" }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#3FBF77" }} />Actif
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 8, flexWrap: "wrap" }}>
              {initial.poste && (
                <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 15.5, color: "#B7AE97" }}>
                  <svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="#8C846F" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6.5C3 5.7 3.6 5 4.4 5H8l1.6 1.8h6C16.4 6.8 17 7.4 17 8.2V14.6c0 .8-.6 1.4-1.4 1.4H4.4C3.6 16 3 15.4 3 14.6Z" /></svg>
                  {initial.poste}
                </span>
              )}
              {initial.pole && (
                <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 15.5, color: "#B7AE97" }}>
                  <svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="#8C846F" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="10" cy="8" r="5" /><path d="M6.5 15l-2 4 5.5-2.2L15.5 19l-2-4" /></svg>
                  {initial.pole}
                </span>
              )}
              {initial.createdAt && (
                <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 15.5, color: "#B7AE97" }}>
                  <svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="#8C846F" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4.5" width="14" height="12.5" rx="2" /><line x1="3" y1="8.4" x2="17" y2="8.4" /></svg>
                  Chez Groupe Écho depuis {new Date(initial.createdAt).toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}
                </span>
              )}
            </div>
          </div>
          {!editing && (
            <button onClick={() => { setTab("profil"); setEditing(true); }} style={{ display: "flex", alignItems: "center", gap: 8, background: "#fff", border: "1px solid #E2E1DA", color: "#33322C", fontSize: 15.5, fontWeight: 600, padding: "10px 16px", borderRadius: 10, cursor: "pointer", fontFamily: "inherit", flex: "none", marginBottom: 6 }}>
              <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M3 15.5V17h1.5l8-8-1.5-1.5-8 8Z" /><path d="M11 5l1.5-1.5a1.4 1.4 0 0 1 2 2L13 7" /></svg>
              Modifier le profil
            </button>
          )}
        </div>
        <div style={{ position: "relative", display: "flex", gap: 2, padding: "0 34px" }}>
          {tabDefs.map(([key, label]) => {
            const on = tab === key;
            return (
              <span key={key} onClick={() => setTab(key)} style={{ padding: "12px 18px", fontSize: 15.5, fontWeight: on ? 700 : 500, color: on ? "#F4ECD7" : "#8C846F", borderBottom: `2.5px solid ${on ? ACCENT : "transparent"}`, cursor: "pointer" }}>
                {label}
              </span>
            );
          })}
        </div>
      </div>

      <style>{`@keyframes profilSpin { to { transform: rotate(360deg); } }`}</style>

      {/* body */}
      <div style={{ padding: "26px 34px 40px" }}>
        {avatarError && (
          <div style={{ marginBottom: 18, background: "#FBEAE0", border: "1px solid #F0B08A", color: "#9A3412", fontSize: 15, fontWeight: 600, padding: "10px 14px", borderRadius: 10 }}>{avatarError}</div>
        )}

        {tab === "profil" && (
          <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 22, alignItems: "start" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <Card
                title="Informations personnelles"
                action={
                  !editing ? (
                    <span onClick={() => setEditing(true)} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 14.5, fontWeight: 600, color: "#B0892B", cursor: "pointer" }}>
                      <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M3 15.5V17h1.5l8-8-1.5-1.5-8 8Z" /><path d="M11 5l1.5-1.5a1.4 1.4 0 0 1 2 2L13 7" /></svg>
                      Modifier
                    </span>
                  ) : <span style={{ fontSize: 14.5, fontWeight: 600, color: "#B0892B" }}>Édition en cours</span>
                }
              >
                {saveError && (
                  <div style={{ marginBottom: 14, background: "#FBEAE0", border: "1px solid #F0B08A", color: "#9A3412", fontSize: 15, fontWeight: 600, padding: "10px 14px", borderRadius: 10 }}>{saveError}</div>
                )}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px 18px" }}>
                  <div><FieldLabel>Prénom</FieldLabel>{mkField("firstName", form.firstName)}</div>
                  <div><FieldLabel>Nom</FieldLabel>{mkField("lastName", form.lastName)}</div>
                  <div><FieldLabel>E-mail professionnel</FieldLabel><div style={readStyle}>{initial.email}</div></div>
                  <div><FieldLabel>Téléphone</FieldLabel>{mkField("phone", form.phone)}</div>
                  <div><FieldLabel>Poste</FieldLabel>{mkField("poste", form.poste)}</div>
                  <div><FieldLabel>Département</FieldLabel><div style={readStyle}>{initial.pole || "—"}</div></div>
                  <div style={{ gridColumn: "1 / -1" }}>
                    <FieldLabel>Bio</FieldLabel>
                    {!editing ? (
                      <div style={{ fontSize: 15.5, color: "#5C5A52", lineHeight: 1.55 }}>{form.bio || "—"}</div>
                    ) : (
                      <textarea value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))} rows={3} style={{ ...inputStyle, resize: "vertical" as const, lineHeight: 1.5 }} />
                    )}
                  </div>
                </div>
                {editing && (
                  <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20, paddingTop: 18, borderTop: "1px solid #F2F1EB" }}>
                    <button onClick={cancelEdit} disabled={saving} style={{ background: "#fff", border: "1px solid #E2E1DA", color: "#33322C", fontSize: 15, fontWeight: 600, padding: "9px 16px", borderRadius: 10, cursor: "pointer", fontFamily: "inherit" }}>Annuler</button>
                    <button onClick={saveEdit} disabled={saving} style={{ display: "flex", alignItems: "center", gap: 7, background: "linear-gradient(135deg,#D8B25C,#A07B26)", color: "#1A1206", fontSize: 15, fontWeight: 700, padding: "9px 18px", borderRadius: 10, cursor: saving ? "default" : "pointer", border: "none", fontFamily: "inherit" }}>
                      {saved ? "Enregistré ✓" : saving ? "Enregistrement…" : "Enregistrer"}
                    </button>
                  </div>
                )}
              </Card>

              <Card title="Projets en cours" action={<span onClick={() => router.push("/projets")} style={{ fontSize: 14.5, fontWeight: 600, color: "#B0892B", cursor: "pointer" }}>Tout voir</span>}>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {projects === null ? (
                    <div style={{ fontSize: 15, color: "#A6A498", padding: "8px 0" }}>Chargement…</div>
                  ) : projects.length === 0 ? (
                    <div style={{ fontSize: 15, color: "#A6A498", padding: "8px 0" }}>Aucun projet pour le moment.</div>
                  ) : (
                    projects.map(p => {
                      const meta = STATUS_META[p.status] ?? { label: p.status, color: "#74726A", bg: "#F0EFEA" };
                      return (
                        <div key={p.id} onClick={() => router.push("/projets")} style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 14px", border: "1px solid #F0EFEA", borderRadius: 12, cursor: "pointer" }}>
                          <span style={{ width: 8, height: 38, borderRadius: 99, background: meta.color, flex: "none" }} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 15.5, fontWeight: 700, color: "#1C1B16" }}>{p.name}</div>
                            <div style={{ fontSize: 14, color: "#A6A498", marginTop: 2 }}>{p.client_name}</div>
                          </div>
                          <span style={{ fontSize: 13.5, fontWeight: 700, color: meta.color, background: meta.bg, borderRadius: 99, padding: "4px 11px", whiteSpace: "nowrap" }}>{meta.label}</span>
                        </div>
                      );
                    })
                  )}
                </div>
              </Card>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div style={{ background: "#0A0A0A", borderRadius: 16, padding: "22px 24px", position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", top: -70, right: -40, width: 220, height: 220, borderRadius: "50%", background: "radial-gradient(circle,rgba(201,162,78,.18),transparent 68%)", pointerEvents: "none" }} />
                <div style={{ position: "relative", fontSize: 13, letterSpacing: ".1em", textTransform: "uppercase" as const, color: "#8C846F", fontWeight: 700, marginBottom: 16 }}>Aperçu</div>
                <div style={{ position: "relative", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
                  <div>
                    <div style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 30, fontWeight: 800, color: "#F4ECD7" }}>{projects?.length ?? "—"}</div>
                    <div style={{ fontSize: 14, color: "#9A968A", marginTop: 2 }}>Projets actifs</div>
                  </div>
                  <div>
                    <div style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 30, fontWeight: 800, color: "#F4ECD7" }}>{ROLE_LABEL[initial.role]}</div>
                    <div style={{ fontSize: 14, color: "#9A968A", marginTop: 2 }}>Rôle</div>
                  </div>
                </div>
              </div>

              <Card title="Activité récente">
                <div style={{ fontSize: 15, color: "#A6A498", padding: "8px 0" }}>L&apos;historique d&apos;activité n&apos;est pas encore disponible.</div>
              </Card>
            </div>
          </div>
        )}

        {tab === "securite" && <SecuriteTab />}
        {tab === "notifs" && <NotifsTab />}
        {tab === "prefs" && <PrefsTab mode={mode} toggleMode={toggleMode} />}
      </div>
    </div>
  );
}

/* ─── Sécurité ─── */
function SecuriteTab() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [tfa, setTfa] = useState(false);

  const submit = async () => {
    setError(null);
    if (!current || !next) { setError("Renseignez le mot de passe actuel et le nouveau."); return; }
    if (next !== confirm) { setError("Les deux mots de passe ne correspondent pas."); return; }
    setSubmitting(true);
    try {
      const res = await fetch("/api/profil/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: current, newPassword: next }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Échec de la mise à jour");
      setSuccess(true);
      setCurrent(""); setNext(""); setConfirm("");
      setTimeout(() => setSuccess(false), 2500);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Échec de la mise à jour");
    } finally {
      setSubmitting(false);
    }
  };

  const pwStyle = inputStyle;

  return (
    <div style={{ maxWidth: 720, display: "flex", flexDirection: "column", gap: 20 }}>
      <Card title="Mot de passe">
        {error && <div style={{ marginBottom: 14, background: "#FBEAE0", border: "1px solid #F0B08A", color: "#9A3412", fontSize: 15, fontWeight: 600, padding: "10px 14px", borderRadius: 10 }}>{error}</div>}
        {success && <div style={{ marginBottom: 14, background: "#E7F3EB", border: "1px solid #B8E3D0", color: "#1F8A5B", fontSize: 15, fontWeight: 600, padding: "10px 14px", borderRadius: 10 }}>Mot de passe mis à jour.</div>}
        <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 400 }}>
          <div><FieldLabel>Mot de passe actuel</FieldLabel><input type="password" value={current} onChange={e => setCurrent(e.target.value)} style={pwStyle} placeholder="••••••••" /></div>
          <div><FieldLabel>Nouveau mot de passe</FieldLabel><input type="password" value={next} onChange={e => setNext(e.target.value)} style={pwStyle} placeholder="Min. 8 caractères" /></div>
          <div><FieldLabel>Confirmer</FieldLabel><input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} style={pwStyle} placeholder="Répéter le mot de passe" /></div>
        </div>
        <div style={{ marginTop: 18 }}>
          <button onClick={submit} disabled={submitting} style={{ background: "linear-gradient(135deg,#D8B25C,#A07B26)", color: "#1A1206", fontSize: 15, fontWeight: 700, padding: "10px 18px", borderRadius: 10, cursor: submitting ? "default" : "pointer", border: "none", fontFamily: "inherit" }}>
            {submitting ? "Mise à jour…" : "Mettre à jour le mot de passe"}
          </button>
        </div>
      </Card>

      <div style={{ background: "#fff", border: "1px solid #ECEBE4", borderRadius: 16, padding: "22px 24px", boxShadow: "0 1px 2px rgba(20,20,15,.04)" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 20 }}>
          <div style={{ flex: 1 }}>
            <h3 style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 18, fontWeight: 700, color: "#16150F", margin: "0 0 5px" }}>Double authentification (2FA)</h3>
            <p style={{ fontSize: 15, color: "#8C8B83", margin: 0, lineHeight: 1.5, maxWidth: 420 }}>Ajoutez une couche de sécurité supplémentaire via une application d&apos;authentification. <em>Bientôt disponible.</em></p>
          </div>
          <Toggle on={tfa} onClick={() => setTfa(v => !v)} />
        </div>
      </div>
    </div>
  );
}

/* ─── Notifications ─── */
const NOTIF_DEFS: Array<[string, string, string]> = [
  ["assign", "Attribution de projet", "Quand un projet vous est assigné."],
  ["deadline", "Rappels d'échéance", "24 h avant la date butoir d'un projet ou d'une tâche."],
  ["batValid", "Validation de BAT", "Quand un client valide ou refuse un BAT."],
  ["clientMsg", "Messages clients", "Nouveaux messages depuis l'espace client."],
  ["weekly", "Récapitulatif hebdomadaire", "Chaque lundi matin, un résumé de votre semaine."],
  ["mentions", "Mentions", "Quand un collègue vous mentionne dans un commentaire."],
];

function NotifsTab() {
  const [notifs, setNotifs] = useState<Record<string, boolean>>({ assign: true, deadline: true, batValid: true, clientMsg: false, weekly: true, mentions: true });
  return (
    <div style={{ maxWidth: 720 }}>
      <div style={{ marginBottom: 14, fontSize: 14.5, color: "#A6A498", fontStyle: "italic" }}>Ces préférences ne sont pas encore connectées à un système de notifications — à venir.</div>
      <div style={{ background: "#fff", border: "1px solid #ECEBE4", borderRadius: 16, padding: "8px 24px", boxShadow: "0 1px 2px rgba(20,20,15,.04)" }}>
        {NOTIF_DEFS.map(([key, title, desc], i) => (
          <div key={key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20, padding: "17px 0", borderBottom: i === NOTIF_DEFS.length - 1 ? "none" : "1px solid #F2F1EB" }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 16, fontWeight: 600, color: "#1C1B16" }}>{title}</div>
              <div style={{ fontSize: 14.5, color: "#8C8B83", marginTop: 3, lineHeight: 1.45 }}>{desc}</div>
            </div>
            <Toggle on={notifs[key]} onClick={() => setNotifs(n => ({ ...n, [key]: !n[key] }))} />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Préférences ─── */
function PrefsTab({ mode, toggleMode }: { mode: "light" | "dark"; toggleMode: () => void }) {
  const router = useRouter();
  const [lang, setLang] = useState("fr");
  const [dateFmt, setDateFmt] = useState("jj/mm/aaaa");
  const [loggingOut, setLoggingOut] = useState(false);

  const seg = (opts: Array<[string, string]>, cur: string, setter: (v: string) => void) =>
    opts.map(([v, label]) => {
      const on = v === cur;
      return { v, label, color: on ? "#fff" : "#5C5A52", bg: on ? "#0A0A0A" : "#F5F4EF", border: on ? "#0A0A0A" : "#E5E4DD", select: () => setter(v) };
    });

  const langOpts = seg([["fr", "Français"], ["en", "English"]], lang, setLang);
  const dateOpts = seg([["jj/mm/aaaa", "JJ/MM/AAAA"], ["mm/jj/aaaa", "MM/JJ/AAAA"]], dateFmt, setDateFmt);

  const handleLogout = async () => {
    setLoggingOut(true);
    try { await fetch("/api/auth/logout", { method: "POST" }); } catch { /* ignore */ }
    router.push("/login");
  };

  return (
    <div style={{ maxWidth: 720, display: "flex", flexDirection: "column", gap: 20 }}>
      <Card title="Préférences régionales">
        <div style={{ marginBottom: 14, fontSize: 14.5, color: "#A6A498", fontStyle: "italic" }}>Langue et format de date : bientôt disponibles (interface actuellement en français uniquement).</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20 }}>
            <div><div style={{ fontSize: 16, fontWeight: 600, color: "#1C1B16" }}>Langue</div><div style={{ fontSize: 14.5, color: "#8C8B83", marginTop: 2 }}>Langue de l&apos;interface</div></div>
            <div style={{ display: "flex", gap: 6 }}>
              {langOpts.map(o => <span key={o.v} onClick={o.select} style={{ padding: "8px 15px", borderRadius: 9, fontSize: 15, fontWeight: 600, cursor: "pointer", color: o.color, background: o.bg, border: `1px solid ${o.border}` }}>{o.label}</span>)}
            </div>
          </div>
          <div style={{ height: 1, background: "#F2F1EB" }} />
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20 }}>
            <div><div style={{ fontSize: 16, fontWeight: 600, color: "#1C1B16" }}>Fuseau horaire</div><div style={{ fontSize: 14.5, color: "#8C8B83", marginTop: 2 }}>Europe/Paris · GMT+1</div></div>
            <span style={{ fontSize: 15, fontWeight: 600, color: "#33322C", background: "#F5F4EF", border: "1px solid #E5E4DD", borderRadius: 9, padding: "8px 13px" }}>Europe/Paris</span>
          </div>
          <div style={{ height: 1, background: "#F2F1EB" }} />
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20 }}>
            <div><div style={{ fontSize: 16, fontWeight: 600, color: "#1C1B16" }}>Format de date</div><div style={{ fontSize: 14.5, color: "#8C8B83", marginTop: 2 }}>Affichage des dates dans l&apos;app</div></div>
            <div style={{ display: "flex", gap: 6 }}>
              {dateOpts.map(o => <span key={o.v} onClick={o.select} style={{ padding: "8px 15px", borderRadius: 9, fontSize: 15, fontWeight: 600, cursor: "pointer", color: o.color, background: o.bg, border: `1px solid ${o.border}` }}>{o.label}</span>)}
            </div>
          </div>
        </div>
      </Card>

      <Card title="Apparence">
        <div style={{ display: "flex", gap: 12 }}>
          {([["light", "Clair", "#F5F5F2"], ["dark", "Sombre", "#0A0A0A"]] as const).map(([v, label, swatch]) => {
            const on = v === mode;
            return (
              <div key={v} onClick={() => { if (v !== mode) toggleMode(); }} style={{ flex: 1, border: `2px solid ${on ? ACCENT : "#ECEBE4"}`, borderRadius: 14, padding: 14, cursor: "pointer", background: on ? "#FBFAF6" : "#fff" }}>
                <div style={{ height: 52, borderRadius: 9, background: swatch, marginBottom: 11, border: "1px solid rgba(0,0,0,.05)" }} />
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 15, fontWeight: 700, color: "#1C1B16" }}>{label}</span>
                  {on ? (
                    <span style={{ width: 18, height: 18, borderRadius: "50%", background: ACCENT, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <svg width="12" height="12" viewBox="0 0 20 20" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M4 10.5 8 14l8-8.5" /></svg>
                    </span>
                  ) : <span style={{ width: 18, height: 18, borderRadius: "50%", border: "2px solid #D6D4CB" }} />}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#FBF3EC", border: "1px solid #E6D2BC", borderRadius: 16, padding: "18px 24px" }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#8A5A1E" }}>Déconnexion</div>
          <div style={{ fontSize: 14.5, color: "#A88452", marginTop: 2 }}>Fermer votre session sur cet appareil.</div>
        </div>
        <button onClick={handleLogout} disabled={loggingOut} style={{ display: "flex", alignItems: "center", gap: 8, background: "#fff", border: "1px solid #E0C6A6", color: "#B7501A", fontSize: 15, fontWeight: 700, padding: "9px 16px", borderRadius: 10, cursor: "pointer", fontFamily: "inherit" }}>
          <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M9 5H6.5C5.7 5 5 5.7 5 6.5v7C5 14.3 5.7 15 6.5 15H9" /><path d="M13 7l3 3-3 3" /><line x1="16" y1="10" x2="8.5" y2="10" /></svg>
          {loggingOut ? "Déconnexion…" : "Se déconnecter"}
        </button>
      </div>
    </div>
  );
}
