"use client";

import { useState } from "react";
import { COLORS } from "@/lib/mock-data";
import { useAuth } from "@/lib/auth-context";
import { useBats, type Bat, BAT_MAX_SIZE } from "@/lib/bat-context";

/**
 * Panneau d'actions BAT — réutilisé par la page /bat ET la modal du Kanban.
 *
 * Contient : preview PDF · case à cocher de validation · demande de modification ·
 *            renvoi avec nouvelle version · génération du lien client public.
 */

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / 1024 / 1024).toFixed(1)} Mo`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("fr-FR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function getPublicUrl(token: string): string {
  if (typeof window === "undefined") return `/sign/${token}`;
  return `${window.location.origin}/sign/${token}`;
}

type Props = {
  bat: Bat;
  canManageBat: boolean;
  /** Si true, on affiche un layout horizontal (PDF gauche / actions droite). Sinon empilé (modal). */
  layout?: "horizontal" | "stacked";
};

export default function BatPanel({ bat, canManageBat, layout = "horizontal" }: Props) {
  const { currentUser } = useAuth();
  const { validateBat, requestModification, reupload } = useBats();

  const [signatureChecked, setSignatureChecked] = useState(false);
  const [signerName, setSignerName] = useState(currentUser.nom);
  const [isModifying, setIsModifying] = useState(false);
  const [comment, setComment] = useState("");
  const [linkCopied, setLinkCopied] = useState(false);
  const [reuploadError, setReuploadError] = useState<string | null>(null);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [clientEmail, setClientEmail] = useState("");

  const publicUrl = getPublicUrl(bat.token);

  /** Construit le lien mailto: avec sujet + corps préremplis. */
  const buildMailto = (to: string) => {
    const subject = `BAT à valider — ${bat.taskName} (${bat.projet})`;
    const body =
      `Bonjour,\n\n` +
      `Veuillez trouver ci-dessous le lien de validation pour le BAT :\n\n` +
      `« ${bat.taskName} » — ${bat.projet}\n` +
      `Version ${bat.version}\n\n` +
      `→ ${publicUrl}\n\n` +
      `Vous pouvez consulter le document, le valider directement en ligne, ` +
      `ou demander des modifications via cette page.\n\n` +
      `À votre disposition pour toute question.\n\n` +
      `Cordialement,\n` +
      `${currentUser.nom}\n` +
      `Groupe Écho`;
    return `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const sendEmail = () => {
    if (!clientEmail.trim()) return;
    window.location.href = buildMailto(clientEmail.trim());
    setShowEmailForm(false);
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      // fallback : sélection manuelle
      window.prompt("Copiez ce lien et envoyez-le au client :", publicUrl);
    }
  };

  const handleValidate = () => {
    if (!signatureChecked || !signerName.trim()) return;
    validateBat(bat.id, signerName.trim());
  };

  const handleSubmitModification = () => {
    if (!comment.trim()) return;
    requestModification(bat.id, comment.trim());
    setIsModifying(false);
    setComment("");
  };

  const handleReupload = (file: File) => {
    setReuploadError(null);
    if (file.type !== "application/pdf") {
      setReuploadError("Seuls les PDF sont acceptés.");
      return;
    }
    if (file.size > BAT_MAX_SIZE) {
      setReuploadError(`Fichier trop lourd (max ${formatSize(BAT_MAX_SIZE)}).`);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      try {
        reupload(bat.id, { name: file.name, dataUrl: reader.result as string, size: file.size }, currentUser.nom);
      } catch (e) {
        setReuploadError(e instanceof Error ? e.message : "Erreur");
      }
    };
    reader.readAsDataURL(file);
  };

  const gridStyle: React.CSSProperties = layout === "horizontal"
    ? { display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 20 }
    : { display: "flex", flexDirection: "column", gap: 16 };

  return (
    <div style={gridStyle}>
      {/* === PDF PREVIEW + LIEN CLIENT === */}
      <div>
        <div style={{
          fontSize: 13, fontWeight: 600, color: COLORS.grisMoyen,
          textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8,
        }}>Document PDF</div>

        {bat.pdfDataUrl ? (
          <iframe
            src={bat.pdfDataUrl}
            title={bat.pdfName}
            style={{
              width: "100%", height: layout === "horizontal" ? 480 : 360,
              border: `1px solid ${COLORS.grisBorder}`,
              borderRadius: 10, background: COLORS.blanc,
            }}
          />
        ) : (
          <div style={{
            padding: "32px 16px", textAlign: "center",
            background: COLORS.blanc, border: `1px dashed ${COLORS.grisBorder}`,
            borderRadius: 10,
          }}>
            <div style={{ fontSize: 36, marginBottom: 8, color: COLORS.grisMoyen }}>📄</div>
            <div style={{ fontWeight: 600, fontSize: 16, color: COLORS.noir, marginBottom: 4 }}>
              {bat.pdfName ?? "(aucun fichier)"}
            </div>
            {bat.pdfSize && (
              <div style={{ fontSize: 14, color: COLORS.grisMoyen }}>
                {formatSize(bat.pdfSize)}
              </div>
            )}
            <div style={{ fontSize: 13, color: COLORS.grisMoyen, marginTop: 8, fontStyle: "italic" }}>
              Aperçu indisponible (BAT de démo, sans contenu binaire)
            </div>
          </div>
        )}

        {bat.uploadedAt && (
          <div style={{ fontSize: 13, color: COLORS.grisMoyen, marginTop: 8 }}>
            Envoyé par <strong>{bat.uploadedBy}</strong> le {formatDate(bat.uploadedAt)}
          </div>
        )}

        {/* LIEN CLIENT */}
        {bat.statut === "envoye" && (
          <div style={{
            marginTop: 14, padding: "12px 14px",
            background: COLORS.dorePale, border: `1px solid ${COLORS.dore}55`,
            borderRadius: 10,
          }}>
            <div style={{
              fontSize: 13, fontWeight: 700, color: COLORS.dore,
              textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6,
            }}>📧 Lien de validation à envoyer au client</div>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <input
                type="text"
                readOnly
                value={publicUrl}
                onClick={(e) => (e.target as HTMLInputElement).select()}
                style={{
                  flex: 1, minWidth: 180, padding: "7px 10px",
                  border: `1px solid ${COLORS.grisBorder}`, borderRadius: 6,
                  fontSize: 13, fontFamily: "monospace", color: COLORS.noir,
                  background: COLORS.blanc, outline: "none",
                }}
              />
              <button
                onClick={copyLink}
                style={{
                  padding: "7px 12px", borderRadius: 6, border: "none",
                  background: linkCopied ? COLORS.vert : COLORS.noir,
                  color: linkCopied ? COLORS.blanc : COLORS.dore,
                  fontSize: 13, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap",
                  transition: "all 0.15s",
                }}
              >{linkCopied ? "✓ Copié" : "Copier"}</button>
              <button
                onClick={() => setShowEmailForm(!showEmailForm)}
                style={{
                  padding: "7px 12px", borderRadius: 6, border: "none",
                  background: showEmailForm ? COLORS.dore : COLORS.noir,
                  color: showEmailForm ? COLORS.noir : COLORS.dore,
                  fontSize: 13, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap",
                  transition: "all 0.15s",
                }}
              >✉ Email</button>
              <a
                href={publicUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  padding: "7px 12px", borderRadius: 6,
                  background: COLORS.blanc, border: `1px solid ${COLORS.grisBorder}`,
                  color: COLORS.noir, fontSize: 13, fontWeight: 600,
                  textDecoration: "none", whiteSpace: "nowrap",
                }}
              >Ouvrir ↗</a>
            </div>

            {/* Formulaire email (mailto) */}
            {showEmailForm && (
              <div style={{
                marginTop: 10, padding: 10,
                background: COLORS.blanc, borderRadius: 8,
                border: `1px solid ${COLORS.grisBorder}`,
              }}>
                <label style={{
                  display: "block", fontSize: 12, fontWeight: 600, color: COLORS.grisMoyen,
                  textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4,
                }}>Email du client *</label>
                <div style={{ display: "flex", gap: 6 }}>
                  <input
                    type="email"
                    value={clientEmail}
                    onChange={(e) => setClientEmail(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") sendEmail(); }}
                    placeholder="contact@client.fr"
                    style={{
                      flex: 1, padding: "7px 10px",
                      border: `1px solid ${COLORS.grisBorder}`, borderRadius: 6,
                      fontSize: 14, color: COLORS.noir, background: COLORS.blanc,
                      outline: "none", fontFamily: "inherit",
                    }}
                  />
                  <button
                    onClick={sendEmail}
                    disabled={!clientEmail.trim()}
                    style={{
                      padding: "7px 14px", borderRadius: 6, border: "none",
                      background: clientEmail.trim() ? COLORS.dore : COLORS.gris,
                      color: clientEmail.trim() ? COLORS.noir : COLORS.grisMoyen,
                      fontSize: 13, fontWeight: 700,
                      cursor: clientEmail.trim() ? "pointer" : "not-allowed",
                      whiteSpace: "nowrap",
                    }}
                  >Ouvrir le mail</button>
                </div>
                <div style={{ fontSize: 12, color: COLORS.grisMoyen, marginTop: 6, lineHeight: 1.4 }}>
                  Ouvre votre client de messagerie (Outlook, Gmail web, Mail…) avec un brouillon
                  prérempli (objet + corps + lien). Vous n&apos;avez plus qu&apos;à cliquer
                  &quot;Envoyer&quot;.
                </div>
              </div>
            )}

            <div style={{ fontSize: 12, color: COLORS.grisMoyen, marginTop: 6, lineHeight: 1.4 }}>
              Envoyez ce lien par email au client. Il accède à la page de validation publique
              (sans connexion). Le statut se met à jour automatiquement.
            </div>
          </div>
        )}
      </div>

      {/* === ACTIONS === */}
      <div>
        <div style={{
          fontSize: 13, fontWeight: 600, color: COLORS.grisMoyen,
          textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8,
        }}>Validation</div>

        {/* Statut "valide" : signé */}
        {bat.statut === "valide" && (
          <div style={{
            padding: "16px", background: COLORS.vertBg,
            border: `1px solid ${COLORS.vert}55`, borderRadius: 10,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 18, color: COLORS.vert }}>✓</span>
              <span style={{ fontWeight: 700, fontSize: 16, color: "#1B5E20" }}>BAT validé et signé</span>
            </div>
            <div style={{ fontSize: 14, color: "#1B5E20" }}>
              Signé par <strong>{bat.signedBy}</strong>
            </div>
            {bat.signedAt && (
              <div style={{ fontSize: 13, color: "#2E7D32", marginTop: 2 }}>
                le {formatDate(bat.signedAt)}
              </div>
            )}
          </div>
        )}

        {/* Statut "modifier" */}
        {bat.statut === "modifier" && (
          <div style={{
            padding: "16px", background: COLORS.rougeBg,
            border: `1px solid ${COLORS.rouge}55`, borderRadius: 10,
          }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: COLORS.rouge, marginBottom: 6 }}>
              BAT renvoyé en production
            </div>
            {bat.commentaire && (
              <div style={{
                padding: 10, background: COLORS.blanc, borderRadius: 6,
                fontSize: 14, color: COLORS.noir, lineHeight: 1.5,
                borderLeft: `3px solid ${COLORS.rouge}`,
              }}>
                « {bat.commentaire} »
              </div>
            )}
            {canManageBat && (
              <>
                <label style={{
                  display: "block", marginTop: 12,
                  padding: "10px", borderRadius: 8,
                  background: COLORS.noir, color: COLORS.dore,
                  fontSize: 15, fontWeight: 600, cursor: "pointer", textAlign: "center",
                }}>
                  Renvoyer en validation (v{bat.version + 1}) — choisir un PDF
                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleReupload(f);
                      e.target.value = "";
                    }}
                    style={{ display: "none" }}
                  />
                </label>
                {reuploadError && (
                  <div style={{ fontSize: 13, color: COLORS.rouge, marginTop: 6 }}>{reuploadError}</div>
                )}
              </>
            )}
          </div>
        )}

        {/* Statut "envoye" : formulaire */}
        {bat.statut === "envoye" && !isModifying && (
          <>
            <div style={{
              padding: "16px", background: COLORS.blanc,
              border: `1px solid ${COLORS.grisBorder}`, borderRadius: 10,
              marginBottom: 12,
            }}>
              {/* Champ signature */}
              <label style={{
                display: "block", fontSize: 13, fontWeight: 600, color: COLORS.grisMoyen,
                textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4,
              }}>Nom du signataire *</label>
              <input
                type="text"
                value={signerName}
                onChange={(e) => setSignerName(e.target.value)}
                placeholder="ex: Jean Bertrand (BÉRYL)"
                style={{
                  width: "100%", padding: "8px 10px", marginBottom: 12,
                  border: `1px solid ${COLORS.grisBorder}`, borderRadius: 6,
                  fontSize: 15, color: COLORS.noir, background: COLORS.blanc,
                  outline: "none", fontFamily: "inherit",
                }}
              />

              {/* Case à cocher */}
              <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={signatureChecked}
                  onChange={(e) => setSignatureChecked(e.target.checked)}
                  style={{
                    width: 18, height: 18, marginTop: 2,
                    accentColor: COLORS.dore, cursor: "pointer", flexShrink: 0,
                  }}
                />
                <div>
                  <div style={{ fontWeight: 600, fontSize: 15, color: COLORS.noir }}>
                    Je valide ce BAT
                  </div>
                  <div style={{ fontSize: 13, color: COLORS.grisMoyen, marginTop: 2, lineHeight: 1.4 }}>
                    En cochant cette case, j&apos;atteste avoir consulté le document et valide
                    définitivement son contenu pour mise en production.
                  </div>
                </div>
              </label>

              <button
                onClick={handleValidate}
                disabled={!signatureChecked || !signerName.trim()}
                style={{
                  width: "100%", marginTop: 12,
                  padding: "10px", borderRadius: 8,
                  background: (signatureChecked && signerName.trim()) ? COLORS.vert : COLORS.gris,
                  border: "none",
                  color: (signatureChecked && signerName.trim()) ? COLORS.blanc : COLORS.grisMoyen,
                  fontSize: 15, fontWeight: 700,
                  cursor: (signatureChecked && signerName.trim()) ? "pointer" : "not-allowed",
                }}
              >✓ Signer et valider le BAT</button>
            </div>

            <button
              onClick={() => setIsModifying(true)}
              style={{
                width: "100%", padding: "10px", borderRadius: 8,
                background: COLORS.blanc, border: `1px solid ${COLORS.rouge}55`,
                color: COLORS.rouge, fontSize: 15, fontWeight: 600, cursor: "pointer",
              }}
            >Demander des modifications</button>
          </>
        )}

        {/* Mode "modifications" */}
        {bat.statut === "envoye" && isModifying && (
          <div style={{
            padding: "16px", background: COLORS.blanc,
            border: `1px solid ${COLORS.rouge}55`, borderRadius: 10,
          }}>
            <label style={{
              display: "block", fontSize: 13, fontWeight: 600, color: COLORS.grisMoyen,
              textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6,
            }}>Commentaire (obligatoire) *</label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Décrivez les modifications attendues…"
              rows={5}
              style={{
                width: "100%", padding: "8px 10px",
                border: `1px solid ${COLORS.grisBorder}`, borderRadius: 6,
                fontSize: 15, color: COLORS.noir, background: COLORS.blanc,
                outline: "none", fontFamily: "inherit", resize: "vertical",
              }}
            />
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <button
                onClick={() => { setIsModifying(false); setComment(""); }}
                style={{
                  flex: 1, padding: "9px", borderRadius: 8,
                  background: "transparent", border: `1px solid ${COLORS.grisBorder}`,
                  color: COLORS.grisMoyen, fontSize: 15, fontWeight: 600, cursor: "pointer",
                }}
              >Annuler</button>
              <button
                onClick={handleSubmitModification}
                disabled={!comment.trim()}
                style={{
                  flex: 1, padding: "9px", borderRadius: 8,
                  background: comment.trim() ? COLORS.rouge : COLORS.gris,
                  border: "none",
                  color: comment.trim() ? COLORS.blanc : COLORS.grisMoyen,
                  fontSize: 15, fontWeight: 600,
                  cursor: comment.trim() ? "pointer" : "not-allowed",
                }}
              >Envoyer</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
