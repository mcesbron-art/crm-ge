"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import { can } from "@/lib/permissions";
import { useToast } from "@/lib/toast-context";
import { typography } from "@/lib/typography";
import Button from "@/components/ui/Button";
import { DOCUMENT_CATEGORIES, DOCUMENT_CATEGORY_LABEL, typeFromMime, formatFileSize, type DocType } from "@/lib/document-taxonomy";

type Doc = {
  id: string; name: string; category: string; visibility: string;
  mimeType: string; fileSize: number; createdAt: string;
  uploadedBy: string; uploaderNom: string; uploaderColor: string;
  recipientId: string | null;
};
type Collab = { id: string; nom: string; color: string | null; avatar: string | null };

function getInitials(nom: string): string {
  return nom.split(" ").map(w => w[0] ?? "").join("").slice(0, 2).toUpperCase();
}
function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long" });
}

const IconSearch = () => (<svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="#A6A498" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="9" r="6" /><line x1="13.5" y1="13.5" x2="18" y2="18" /></svg>);
const IconFolder = ({ color = "currentColor" }: { color?: string }) => (<svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4.5" width="14" height="12" rx="2" /><path d="M7 4.5V3.4C7 2.9 7.4 2.5 8 2.5h4c.5 0 1 .4 1 1v1.1" /></svg>);
const IconMegaphone = ({ color = "currentColor" }: { color?: string }) => (<svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="14" height="10" rx="1.6" /><path d="M3.5 6l6.5 5 6.5-5" /></svg>);
const IconProcess = ({ color = "currentColor" }: { color?: string }) => (<svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="10" cy="10" r="7" /><path d="M10 6.5v4l2.5 1.5" /></svg>);
const IconPersonal = ({ color = "currentColor" }: { color?: string }) => (<svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="10" cy="7" r="3" /><path d="M4 16.5c0-3.2 2.7-5.2 6-5.2s6 2 6 5.2" /></svg>);
const IconFile = () => (<svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M6 3h5l3 3v11H6z" /><path d="M11 3v3h3" /></svg>);
const IconCommon = () => (<svg width="11" height="11" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="7" cy="7" r="2.6" /><circle cx="13" cy="7" r="2.6" /><path d="M3 16c0-2.4 1.8-3.8 4-3.8s4 1.4 4 3.8" /><path d="M9 16c0-2.4 1.8-3.8 4-3.8s4 1.4 4 3.8" /></svg>);
const IconPersonalSmall = () => (<svg width="11" height="11" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="10" cy="7" r="3" /><path d="M4 16.5c0-3.2 2.7-5.2 6-5.2s6 2 6 5.2" /></svg>);
const IconDownload = () => (<svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M10 3v9" /><path d="M6.5 9l3.5 3.5L13.5 9" /><path d="M4 15.5h12" /></svg>);
const IconUpload = () => (<svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M10 14V5" /><path d="M6.5 8l3.5-3.5L13.5 8" /><path d="M4 15.5h12" /></svg>);
const IconX = () => (<svg width="17" height="17" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="5" x2="15" y2="15" /><line x1="15" y1="5" x2="5" y2="15" /></svg>);
const IconEye = () => (<svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M2 10s2.8-5.5 8-5.5S18 10 18 10s-2.8 5.5-8 5.5S2 10 2 10z" /><circle cx="10" cy="10" r="2.4" /></svg>);
const IconPencil = () => (<svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M13.5 3.5 16.5 6.5 6.7 16.3 3 17l.7-3.7z" /></svg>);
const IconTrash = () => (<svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M4.5 5.5h11" /><path d="M8 5.5V4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v1.5" /><path d="M5.5 5.5 6.2 16a1 1 0 0 0 1 .9h5.6a1 1 0 0 0 1-.9l.7-10.5" /></svg>);

const CAT_ICON: Record<string, (color?: string) => React.ReactNode> = {
  rh: c => <IconFolder color={c} />,
  com: c => <IconMegaphone color={c} />,
  process: c => <IconProcess color={c} />,
  perso: c => <IconPersonal color={c} />,
};
const CAT_ICON_STYLE: Record<string, { bg: string; color: string }> = {
  rh: { bg: "rgba(201,162,78,.14)", color: "#B0892B" },
  com: { bg: "#E6EEFB", color: "#2563EB" },
  process: { bg: "#E7F3EB", color: "#1F8A5B" },
};
const TYPE_INFO: Record<DocType, { color: string; bg: string; label: string }> = {
  pdf: { color: "#B0892B", bg: "rgba(201,162,78,.16)", label: "PDF" },
  word: { color: "#2563EB", bg: "#E6EEFB", label: "Word" },
  excel: { color: "#1F8A5B", bg: "#E7F3EB", label: "Excel" },
  image: { color: "#7C3AED", bg: "#EDE9FB", label: "Image" },
};

export default function DocumentsPage() {
  const { effectiveRole } = useAuth();
  const toast = useToast();
  const canUpload = can(effectiveRole, "upload_common_document") || can(effectiveRole, "upload_personal_document");
  const canManage = can(effectiveRole, "manage_documents");

  const [documents, setDocuments] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [collaborateurs, setCollaborateurs] = useState<Collab[]>([]);

  const [search, setSearch] = useState("");
  const [filterVis, setFilterVis] = useState<"tous" | "commun" | "personnel">("tous");
  const [filterType, setFilterType] = useState<"tous" | DocType>("tous");
  const [filterCat, setFilterCat] = useState<string | null>(null);

  const [uploadOpen, setUploadOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState<Doc | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    return fetch("/api/documents")
      .then(r => r.json())
      .then((d: { documents?: Doc[] }) => { if (Array.isArray(d.documents)) setDocuments(d.documents); })
      .catch(() => setDocuments([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!canUpload && !canManage) return;
    fetch("/api/collaborateurs")
      .then(r => r.json())
      .then((d: { collaborateurs?: Collab[] }) => { if (Array.isArray(d.collaborateurs)) setCollaborateurs(d.collaborateurs); })
      .catch(() => null);
  }, [canUpload, canManage]);

  const getSignedUrl = async (doc: Doc): Promise<string> => {
    const res = await fetch(`/api/documents/${doc.id}/download`);
    if (!res.ok) throw new Error();
    const d: { url: string } = await res.json();
    return d.url;
  };

  const download = async (doc: Doc) => {
    try {
      const url = await getSignedUrl(doc);
      const a = document.createElement("a");
      a.href = url;
      a.download = doc.name;
      a.click();
    } catch {
      toast.error("Le téléchargement a échoué.");
    }
  };

  const preview = async (doc: Doc) => {
    try {
      const url = await getSignedUrl(doc);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch {
      toast.error("L'aperçu a échoué.");
    }
  };

  const deleteDoc = async (doc: Doc) => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/documents/${doc.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setDocuments(prev => prev.filter(d => d.id !== doc.id));
      toast.success("Document supprimé.");
    } catch {
      toast.error("La suppression a échoué.");
    } finally {
      setDeleting(false);
      setDeleteConfirmId(null);
    }
  };

  const catCounts = DOCUMENT_CATEGORIES.map(c => ({
    ...c,
    count: documents.filter(d => d.category === c.value).length,
  }));

  const matchSearch = (d: Doc) => !search.trim() || d.name.toLowerCase().includes(search.trim().toLowerCase());
  const matchVis = (d: Doc) => filterVis === "tous" || d.visibility === filterVis;
  const matchType = (d: Doc) => filterType === "tous" || typeFromMime(d.mimeType) === filterType;
  const matchCat = (d: Doc) => !filterCat || d.category === filterCat;
  const filtered = documents.filter(d => matchSearch(d) && matchVis(d) && matchType(d) && matchCat(d));

  const visPill = (on: boolean) => ({ color: on ? "#fff" : "#7C7B73", background: on ? "#0A0A0A" : "#F0EFEA", border: `1px solid ${on ? "#0A0A0A" : "#E5E4DD"}` });

  return (
    <div style={{ flex: 1, minWidth: 0, background: "#F5F5F2", display: "flex", flexDirection: "column", fontFamily: "'Plus Jakarta Sans',system-ui,sans-serif" }}>
      <div style={{ padding: "26px 30px 40px", display: "flex", flexDirection: "column", gap: 18 }}>

        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <div>
            <h1 style={typography.pageTitle}>Documents</h1>
            <div style={{ ...typography.description, marginTop: 5 }}>Documents communs et personnels transmis par la direction</div>
          </div>
          {canUpload && (
            <Button variant="primary" onClick={() => setUploadOpen(true)}>
              <span style={{ fontSize: 16, lineHeight: 1 }}>+</span>Ajouter un document
            </Button>
          )}
        </div>

        {/* category cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16 }}>
          {catCounts.map(c => {
            const dark = c.value === "perso";
            const on = filterCat === c.value;
            const iconStyle = CAT_ICON_STYLE[c.value] ?? CAT_ICON_STYLE.rh;
            return (
              <div
                key={c.value}
                onClick={() => setFilterCat(on ? null : c.value)}
                style={{
                  background: dark ? "#0A0A0A" : (on ? "#FBF8EF" : "#fff"),
                  border: `1.5px solid ${on ? "#C9A24E" : (dark ? "#0A0A0A" : "#ECEBE4")}`,
                  borderRadius: 16, padding: "18px 20px", cursor: "pointer", position: "relative", overflow: "hidden",
                }}
              >
                {dark && <div style={{ position: "absolute", top: -36, right: -26, width: 110, height: 110, borderRadius: "50%", background: "radial-gradient(circle,rgba(201,162,78,.26),transparent 70%)" }} />}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", position: "relative" }}>
                  <span style={{ width: 32, height: 32, borderRadius: 9, background: dark ? "rgba(201,162,78,.16)" : iconStyle.bg, display: "flex", alignItems: "center", justifyContent: "center", color: dark ? "#E4C77B" : iconStyle.color }}>
                    {CAT_ICON[c.value]()}
                  </span>
                  <span style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 24, fontWeight: 800, color: dark ? "#F4ECD7" : "#16150F" }}>{c.count}</span>
                </div>
                <div style={{ fontSize: 15.5, fontWeight: 700, color: dark ? "#F4ECD7" : "#1C1B16", marginTop: 12, position: "relative" }}>{c.label}</div>
                <div style={{ fontSize: 13.5, color: dark ? "#9A968A" : "#9A998F", marginTop: 2, position: "relative" }}>
                  {dark ? "Vos documents privés" : `${c.count} document${c.count > 1 ? "s" : ""}`}
                </div>
              </div>
            );
          })}
        </div>

        {/* filter bar */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9, background: "#fff", border: "1px solid #E2E1DA", borderRadius: 10, padding: "9px 13px", minWidth: 260, flex: 1, maxWidth: 320 }}>
            <IconSearch />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher un document…" style={{ flex: 1, border: "none", outline: "none", background: "transparent", fontFamily: "inherit", fontSize: 15, color: "#1C1B16" }} />
          </div>
          <span style={{ width: 1, height: 24, background: "#E2E1DA" }} />
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: "#A6A498" }}>Visibilité</span>
            {([["tous", "Tous"], ["commun", "Communs"], ["personnel", "Personnels"]] as const).map(([k, label]) => (
              <span key={k} onClick={() => setFilterVis(k)} style={{ padding: "6px 12px", borderRadius: 99, fontSize: 14.5, fontWeight: 600, cursor: "pointer", ...visPill(filterVis === k) }}>{label}</span>
            ))}
          </div>
          <span style={{ width: 1, height: 24, background: "#E2E1DA" }} />
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: "#A6A498" }}>Type</span>
            {([["tous", "Tous"], ["pdf", "PDF"], ["word", "Word"], ["excel", "Excel"]] as const).map(([k, label]) => (
              <span key={k} onClick={() => setFilterType(k)} style={{ padding: "6px 12px", borderRadius: 99, fontSize: 14.5, fontWeight: 600, cursor: "pointer", ...visPill(filterType === k) }}>{label}</span>
            ))}
          </div>
        </div>

        {/* table */}
        <div style={{ background: "#fff", border: "1px solid #ECEBE4", borderRadius: 18, padding: "6px 22px 10px", boxShadow: "0 1px 2px rgba(20,20,15,.04)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "2.3fr 1fr 1.1fr 1fr 1fr 0.8fr", gap: 14, padding: "15px 0 12px", borderBottom: "1px solid #EEEDE6" }}>
            <span style={{ fontSize: 12.5, letterSpacing: ".1em", textTransform: "uppercase", color: "#A6A498", fontWeight: 700 }}>Document</span>
            <span style={{ fontSize: 12.5, letterSpacing: ".1em", textTransform: "uppercase", color: "#A6A498", fontWeight: 700 }}>Visibilité</span>
            <span style={{ fontSize: 12.5, letterSpacing: ".1em", textTransform: "uppercase", color: "#A6A498", fontWeight: 700 }}>Transmis par</span>
            <span style={{ fontSize: 12.5, letterSpacing: ".1em", textTransform: "uppercase", color: "#A6A498", fontWeight: 700 }}>Date</span>
            <span style={{ fontSize: 12.5, letterSpacing: ".1em", textTransform: "uppercase", color: "#A6A498", fontWeight: 700 }}>Taille</span>
            <span style={{ fontSize: 12.5, letterSpacing: ".1em", textTransform: "uppercase", color: "#A6A498", fontWeight: 700, textAlign: "right" }}>Actions</span>
          </div>

          {loading ? (
            <div style={{ padding: "60px 0", textAlign: "center", fontSize: 15, color: "#A6A498" }}>Chargement…</div>
          ) : filtered.length === 0 ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 0", textAlign: "center" }}>
              <span style={{ width: 44, height: 44, borderRadius: 12, background: "#F0EFEA", display: "flex", alignItems: "center", justifyContent: "center", color: "#B5B2A6" }}><IconSearch /></span>
              <div style={{ fontSize: 16, fontWeight: 600, color: "#5C5A52", marginTop: 14 }}>Aucun document ne correspond</div>
              <div style={{ fontSize: 14.5, color: "#9A998F", marginTop: 4 }}>Essaie d&apos;ajuster la recherche ou les filtres.</div>
            </div>
          ) : filtered.map(d => {
            const type = typeFromMime(d.mimeType);
            const ti = TYPE_INFO[type];
            const isPersonal = d.visibility === "personnel";
            return (
              <div key={d.id} style={{ display: "grid", gridTemplateColumns: "2.3fr 1fr 1.1fr 1fr 1fr 0.8fr", gap: 14, alignItems: "center", padding: "13px 0", borderBottom: "1px solid #F2F1EB" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                  <span style={{ width: 34, height: 34, borderRadius: 9, background: ti.bg, display: "flex", alignItems: "center", justifyContent: "center", color: ti.color, flex: "none" }}><IconFile /></span>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 15.5, fontWeight: 700, color: "#1C1B16", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{d.name}</div>
                    <div style={{ fontSize: 13.5, color: "#A6A498", marginTop: 1 }}>{DOCUMENT_CATEGORY_LABEL[d.category] ?? d.category}</div>
                  </div>
                </div>
                <div>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 13, fontWeight: 700, color: isPersonal ? "#7C3AED" : "#1F8A5B", background: isPersonal ? "#EDE9FB" : "#E7F3EB", borderRadius: 99, padding: "3px 10px", whiteSpace: "nowrap" }}>
                    {isPersonal ? <IconPersonalSmall /> : <IconCommon />}{isPersonal ? "Personnel" : "Commun"}
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                  <span style={{ width: 22, height: 22, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10.5, fontWeight: 700, color: "#fff", background: d.uploaderColor, flex: "none" }}>{getInitials(d.uploaderNom)}</span>
                  <span style={{ fontSize: 14.5, color: "#5C5A52", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{d.uploaderNom}</span>
                </div>
                <div style={{ fontSize: 14.5, color: "#8C8B83" }}>{fmtDate(d.createdAt)}</div>
                <div style={{ fontSize: 14.5, color: "#8C8B83" }}>{formatFileSize(d.fileSize)}</div>
                {deleteConfirmId === d.id ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 6, justifyContent: "flex-end" }}>
                    <span style={{ fontSize: 13, color: "#B91C1C", fontWeight: 600 }}>Supprimer ?</span>
                    <Button variant="danger" size="sm" onClick={() => deleteDoc(d)} disabled={deleting}>Oui</Button>
                    <Button variant="tertiary" size="sm" onClick={() => setDeleteConfirmId(null)}>Non</Button>
                  </div>
                ) : (
                  <div style={{ display: "flex", alignItems: "center", gap: 4, justifyContent: "flex-end" }}>
                    {(type === "pdf" || type === "image") && (
                      <span onClick={() => preview(d)} title="Aperçu" style={{ width: 30, height: 30, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", color: "#A6A498", cursor: "pointer" }}>
                        <IconEye />
                      </span>
                    )}
                    <span onClick={() => download(d)} title="Télécharger" style={{ width: 30, height: 30, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", color: "#A6A498", cursor: "pointer" }}>
                      <IconDownload />
                    </span>
                    {canManage && (
                      <>
                        <span onClick={() => setEditingDoc(d)} title="Modifier" style={{ width: 30, height: 30, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", color: "#A6A498", cursor: "pointer" }}>
                          <IconPencil />
                        </span>
                        <span onClick={() => setDeleteConfirmId(d.id)} title="Supprimer" style={{ width: 30, height: 30, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", color: "#A6A498", cursor: "pointer" }}>
                          <IconTrash />
                        </span>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {uploadOpen && canUpload && (
        <UploadModal
          collaborateurs={collaborateurs}
          onClose={() => setUploadOpen(false)}
          onUploaded={() => { setUploadOpen(false); load(); toast.success("Document ajouté."); }}
        />
      )}

      {editingDoc && canManage && (
        <EditModal
          doc={editingDoc}
          collaborateurs={collaborateurs}
          onClose={() => setEditingDoc(null)}
          onSaved={() => { setEditingDoc(null); load(); toast.success("Document modifié."); }}
        />
      )}
    </div>
  );
}

function UploadModal({ collaborateurs, onClose, onUploaded }: { collaborateurs: Collab[]; onClose: () => void; onUploaded: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [category, setCategory] = useState<string>(DOCUMENT_CATEGORIES[0].value);
  const [visibility, setVisibility] = useState<"commun" | "personnel">("commun");
  const [recipientId, setRecipientId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const pickFile = (f: File) => {
    setFile(f);
    if (!name.trim()) setName(f.name.replace(/\.[^.]+$/, ""));
  };

  const canSave = !!file && name.trim() !== "" && !(visibility === "personnel" && !recipientId) && !saving;

  const submit = async () => {
    if (!canSave || !file) return;
    setSaving(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("name", name.trim());
      form.append("category", category);
      form.append("visibility", visibility);
      if (visibility === "personnel" && recipientId) form.append("recipient_id", recipientId);
      const res = await fetch("/api/documents", { method: "POST", body: form });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "Échec de l'ajout");
      }
      onUploaded();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Échec de l'ajout");
    } finally {
      setSaving(false);
    }
  };

  const pillStyle = (on: boolean) => ({ color: on ? "#fff" : "#5C5A52", background: on ? "#0A0A0A" : "#F5F4EF", border: `1px solid ${on ? "#0A0A0A" : "#E5E4DD"}` });

  return (
    <div onClick={onClose} className="modal-overlay-in" style={{ position: "fixed", inset: 0, background: "rgba(16,15,11,.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 90, padding: 30 }}>
      <div onClick={e => e.stopPropagation()} className="modal-panel-in" style={{ width: 540, maxWidth: "100%", background: "#fff", borderRadius: 18, boxShadow: "0 30px 70px -20px rgba(16,15,11,.5)", overflow: "hidden", display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 22px", background: "#0A0A0A", flex: "none" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ width: 30, height: 30, borderRadius: 8, background: "rgba(201,162,78,.16)", display: "flex", alignItems: "center", justifyContent: "center", color: "#E4C77B" }}><IconUpload /></span>
            <span style={{ ...typography.cardTitle, color: "#F4ECD7" }}>Ajouter un document</span>
          </div>
          <span onClick={onClose} style={{ width: 28, height: 28, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", color: "#8E8876", cursor: "pointer" }}><IconX /></span>
        </div>

        <div style={{ padding: "20px 22px", display: "flex", flexDirection: "column", gap: 15 }}>
          <input ref={inputRef} type="file" style={{ display: "none" }} onChange={e => { const f = e.target.files?.[0]; if (f) pickFile(f); }} />
          <div
            onClick={() => inputRef.current?.click()}
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files?.[0]; if (f) pickFile(f); }}
            style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 9, border: `1.5px dashed ${dragOver ? "#C9A24E" : "#D2D0C7"}`, borderRadius: 12, padding: 22, color: dragOver ? "#B08D32" : "#9A998F", cursor: "pointer", background: dragOver ? "rgba(201,162,78,.04)" : "transparent" }}
          >
            <IconUpload />
            <span style={{ fontSize: 15, fontWeight: 600 }}>{file ? file.name : "Glisse un fichier ou clique pour parcourir"}</span>
          </div>

          <div>
            <label style={{ ...typography.label, letterSpacing: ".08em", textTransform: "uppercase", display: "block", marginBottom: 6 }}>Nom du document</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Ex. Note de service — juillet" style={{ width: "100%", boxSizing: "border-box", fontFamily: "inherit", fontSize: 15.5, color: "#1C1B16", background: "#fff", border: "1px solid #E2E1DA", borderRadius: 9, padding: "10px 12px", outline: "none" }} />
          </div>

          <div>
            <label style={{ ...typography.label, letterSpacing: ".08em", textTransform: "uppercase", display: "block", marginBottom: 8 }}>Catégorie</label>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {DOCUMENT_CATEGORIES.map(c => (
                <span key={c.value} onClick={() => setCategory(c.value)} style={{ padding: "7px 13px", borderRadius: 99, fontSize: 14.5, fontWeight: 600, cursor: "pointer", ...pillStyle(category === c.value) }}>{c.label}</span>
              ))}
            </div>
          </div>

          <div>
            <label style={{ ...typography.label, letterSpacing: ".08em", textTransform: "uppercase", display: "block", marginBottom: 8 }}>Visibilité</label>
            <div style={{ display: "flex", gap: 8 }}>
              {([["commun", "Commun"], ["personnel", "Personnel"]] as const).map(([k, label]) => (
                <span key={k} onClick={() => setVisibility(k)} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 7, padding: "9px 13px", borderRadius: 10, fontSize: 14.5, fontWeight: 600, cursor: "pointer", ...pillStyle(visibility === k) }}>{label}</span>
              ))}
            </div>
          </div>

          {visibility === "personnel" && (
            <div>
              <label style={{ ...typography.label, letterSpacing: ".08em", textTransform: "uppercase", display: "block", marginBottom: 8 }}>Destinataire</label>
              <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
                {collaborateurs.map(c => {
                  const on = recipientId === c.id;
                  return (
                    <span key={c.id} onClick={() => setRecipientId(c.id)} style={{ display: "flex", alignItems: "center", gap: 7, padding: "4px 12px 4px 4px", borderRadius: 99, cursor: "pointer", background: on ? "#FBF8EF" : "#fff", border: `1.5px solid ${on ? "#C9A24E" : "#ECEBE4"}` }}>
                      <span style={{ width: 24, height: 24, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11.5, fontWeight: 700, color: "#fff", background: c.color || "#9A9078" }}>{getInitials(c.nom)}</span>
                      <span style={{ fontSize: 14, fontWeight: 600, color: "#5C5A52" }}>{c.nom.split(" ")[0]}</span>
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {error && (
            <div style={{ background: "#FDECEC", border: "1px solid #F0B4B4", borderRadius: 9, padding: "9px 12px", fontSize: 14, color: "#DC2626", lineHeight: 1.45 }}>{error}</div>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "16px 22px", borderTop: "1px solid #EEEDE6", background: "#FBFBF9" }}>
          <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13.5, color: "#8C8B83" }}><IconFolder color="#B0892B" />Visible immédiatement selon la visibilité choisie</span>
          <div style={{ display: "flex", gap: 10 }}>
            <Button variant="secondary" onClick={onClose}>Annuler</Button>
            <Button variant="primary" onClick={submit} disabled={!canSave}>
              {saving ? "Ajout…" : "Ajouter le document"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function EditModal({ doc, collaborateurs, onClose, onSaved }: { doc: Doc; collaborateurs: Collab[]; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(doc.name);
  const [category, setCategory] = useState<string>(doc.category);
  const [visibility, setVisibility] = useState<"commun" | "personnel">(doc.visibility === "personnel" ? "personnel" : "commun");
  const [recipientId, setRecipientId] = useState<string | null>(doc.recipientId);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSave = name.trim() !== "" && !(visibility === "personnel" && !recipientId) && !saving;

  const submit = async () => {
    if (!canSave) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/documents/${doc.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          category,
          visibility,
          recipient_id: visibility === "personnel" ? recipientId : null,
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "Échec de la modification");
      }
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Échec de la modification");
    } finally {
      setSaving(false);
    }
  };

  const pillStyle = (on: boolean) => ({ color: on ? "#fff" : "#5C5A52", background: on ? "#0A0A0A" : "#F5F4EF", border: `1px solid ${on ? "#0A0A0A" : "#E5E4DD"}` });

  return (
    <div onClick={onClose} className="modal-overlay-in" style={{ position: "fixed", inset: 0, background: "rgba(16,15,11,.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 90, padding: 30 }}>
      <div onClick={e => e.stopPropagation()} className="modal-panel-in" style={{ width: 540, maxWidth: "100%", background: "#fff", borderRadius: 18, boxShadow: "0 30px 70px -20px rgba(16,15,11,.5)", overflow: "hidden", display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 22px", background: "#0A0A0A", flex: "none" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ width: 30, height: 30, borderRadius: 8, background: "rgba(201,162,78,.16)", display: "flex", alignItems: "center", justifyContent: "center", color: "#E4C77B" }}><IconPencil /></span>
            <span style={{ ...typography.cardTitle, color: "#F4ECD7" }}>Modifier le document</span>
          </div>
          <span onClick={onClose} style={{ width: 28, height: 28, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", color: "#8E8876", cursor: "pointer" }}><IconX /></span>
        </div>

        <div style={{ padding: "20px 22px", display: "flex", flexDirection: "column", gap: 15 }}>
          <div>
            <label style={{ ...typography.label, letterSpacing: ".08em", textTransform: "uppercase", display: "block", marginBottom: 6 }}>Nom du document</label>
            <input value={name} onChange={e => setName(e.target.value)} style={{ width: "100%", boxSizing: "border-box", fontFamily: "inherit", fontSize: 15.5, color: "#1C1B16", background: "#fff", border: "1px solid #E2E1DA", borderRadius: 9, padding: "10px 12px", outline: "none" }} />
          </div>

          <div>
            <label style={{ ...typography.label, letterSpacing: ".08em", textTransform: "uppercase", display: "block", marginBottom: 8 }}>Catégorie</label>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {DOCUMENT_CATEGORIES.map(c => (
                <span key={c.value} onClick={() => setCategory(c.value)} style={{ padding: "7px 13px", borderRadius: 99, fontSize: 14.5, fontWeight: 600, cursor: "pointer", ...pillStyle(category === c.value) }}>{c.label}</span>
              ))}
            </div>
          </div>

          <div>
            <label style={{ ...typography.label, letterSpacing: ".08em", textTransform: "uppercase", display: "block", marginBottom: 8 }}>Visibilité</label>
            <div style={{ display: "flex", gap: 8 }}>
              {([["commun", "Commun"], ["personnel", "Personnel"]] as const).map(([k, label]) => (
                <span key={k} onClick={() => setVisibility(k)} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 7, padding: "9px 13px", borderRadius: 10, fontSize: 14.5, fontWeight: 600, cursor: "pointer", ...pillStyle(visibility === k) }}>{label}</span>
              ))}
            </div>
          </div>

          {visibility === "personnel" && (
            <div>
              <label style={{ ...typography.label, letterSpacing: ".08em", textTransform: "uppercase", display: "block", marginBottom: 8 }}>Destinataire</label>
              <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
                {collaborateurs.map(c => {
                  const on = recipientId === c.id;
                  return (
                    <span key={c.id} onClick={() => setRecipientId(c.id)} style={{ display: "flex", alignItems: "center", gap: 7, padding: "4px 12px 4px 4px", borderRadius: 99, cursor: "pointer", background: on ? "#FBF8EF" : "#fff", border: `1.5px solid ${on ? "#C9A24E" : "#ECEBE4"}` }}>
                      <span style={{ width: 24, height: 24, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11.5, fontWeight: 700, color: "#fff", background: c.color || "#9A9078" }}>{getInitials(c.nom)}</span>
                      <span style={{ fontSize: 14, fontWeight: 600, color: "#5C5A52" }}>{c.nom.split(" ")[0]}</span>
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {error && (
            <div style={{ background: "#FDECEC", border: "1px solid #F0B4B4", borderRadius: 9, padding: "9px 12px", fontSize: 14, color: "#DC2626", lineHeight: 1.45 }}>{error}</div>
          )}
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, padding: "16px 22px", borderTop: "1px solid #EEEDE6", background: "#FBFBF9" }}>
          <Button variant="secondary" onClick={onClose}>Annuler</Button>
          <Button variant="primary" onClick={submit} disabled={!canSave}>
            {saving ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </div>
      </div>
    </div>
  );
}
