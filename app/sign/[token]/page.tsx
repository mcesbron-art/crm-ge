"use client";

import { useState } from "react";
import { useBats } from "@/lib/bat-context";

/**
 * Page PUBLIQUE de validation BAT par le client.
 * Pas d'auth requise. Pas de sidebar. Accessible via le lien token unique.
 *
 * En production : ce fichier devra utiliser une route API qui charge le BAT
 * depuis Supabase via le token (pas localStorage). Le PDF sera servi via
 * une URL signée Supabase Storage avec expiration courte (24-48h).
 */

const COLORS = {
  noir: "#1A1A1A",
  noirDeep: "#111111",
  dore: "#C5A55A",
  doreLight: "#D4BA78",
  dorePale: "#F5EDD6",
  blanc: "#FFFFFF",
  gris: "#F7F7F5",
  grisMoyen: "#999999",
  grisBorder: "#E5E5E3",
  vert: "#4CAF50",
  vertBg: "#E8F5E9",
  rouge: "#E53935",
  rougeBg: "#FFEBEE",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("fr-FR", {
    day: "2-digit", month: "long", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export default function PublicSignPage({ params }: { params: { token: string } }) {
  const { token } = params;
  const { getBatByToken, hydrated, validateBat, requestModification } = useBats();
  const bat = getBatByToken(token);

  const [signatureChecked, setSignatureChecked] = useState(false);
  const [signerName, setSignerName] = useState("");
  const [signerOrg, setSignerOrg] = useState("");
  const [isRequestingMods, setIsRequestingMods] = useState(false);
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState<"validated" | "modifications" | null>(null);

  if (!hydrated) {
    return (
      <FullScreen>
        <Card>
          <div style={{ padding: 40, textAlign: "center", color: COLORS.grisMoyen }}>
            Chargement…
          </div>
        </Card>
      </FullScreen>
    );
  }

  if (!bat) {
    return (
      <FullScreen>
        <Card>
          <div style={{ padding: "40px 30px", textAlign: "center" }}>
            <div style={{ fontSize: 48, color: COLORS.grisMoyen, marginBottom: 12 }}>🔍</div>
            <h1 style={{
              fontFamily: "var(--font-dm-serif-display), Georgia, serif",
              fontSize: 24, color: COLORS.noir, margin: "0 0 8px",
            }}>Document introuvable</h1>
            <p style={{ color: COLORS.grisMoyen, fontSize: 14, margin: 0 }}>
              Ce lien a expiré ou n&apos;est plus valide.<br />
              Contactez votre interlocuteur Groupe Écho pour obtenir un nouveau lien.
            </p>
          </div>
        </Card>
      </FullScreen>
    );
  }

  const fullSigner = signerOrg.trim()
    ? `${signerName.trim()} (${signerOrg.trim()})`
    : signerName.trim();

  const handleValidate = () => {
    if (!signatureChecked || !signerName.trim()) return;
    validateBat(bat.id, fullSigner);
    setSubmitted("validated");
  };

  const handleSubmitMods = () => {
    if (!comment.trim()) return;
    requestModification(bat.id, comment.trim());
    setSubmitted("modifications");
  };

  // === MERCI : confirmation après action ===
  if (submitted === "validated") {
    return (
      <FullScreen>
        <Card>
          <div style={{ padding: "48px 30px", textAlign: "center" }}>
            <div style={{
              width: 80, height: 80, borderRadius: "50%",
              background: COLORS.vertBg, color: COLORS.vert,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 40, margin: "0 auto 20px",
            }}>✓</div>
            <h1 style={{
              fontFamily: "var(--font-dm-serif-display), Georgia, serif",
              fontSize: 28, color: COLORS.noir, margin: "0 0 8px",
            }}>BAT validé avec succès</h1>
            <p style={{ color: COLORS.grisMoyen, fontSize: 14, marginBottom: 20 }}>
              Merci, votre validation a bien été enregistrée.<br />
              Une copie horodatée sera archivée pour vous et notre équipe.
            </p>
            <div style={{
              display: "inline-block", padding: "12px 18px",
              background: COLORS.gris, borderRadius: 10,
              fontSize: 13, color: COLORS.noir,
            }}>
              Signé par <strong>{fullSigner}</strong><br />
              <span style={{ color: COLORS.grisMoyen, fontSize: 12 }}>le {formatDate(new Date().toISOString())}</span>
            </div>
          </div>
        </Card>
      </FullScreen>
    );
  }

  if (submitted === "modifications") {
    return (
      <FullScreen>
        <Card>
          <div style={{ padding: "48px 30px", textAlign: "center" }}>
            <div style={{
              width: 80, height: 80, borderRadius: "50%",
              background: "#FFF3E0", color: "#E65100",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 40, margin: "0 auto 20px",
            }}>✎</div>
            <h1 style={{
              fontFamily: "var(--font-dm-serif-display), Georgia, serif",
              fontSize: 28, color: COLORS.noir, margin: "0 0 8px",
            }}>Demande envoyée</h1>
            <p style={{ color: COLORS.grisMoyen, fontSize: 14 }}>
              Vos remarques ont été transmises à notre équipe.<br />
              Nous reviendrons vers vous dans les meilleurs délais avec une nouvelle version.
            </p>
          </div>
        </Card>
      </FullScreen>
    );
  }

  // === BAT déjà traité ===
  if (bat.statut === "valide") {
    return (
      <FullScreen>
        <Card>
          <div style={{ padding: "48px 30px", textAlign: "center" }}>
            <div style={{
              width: 64, height: 64, borderRadius: "50%",
              background: COLORS.vertBg, color: COLORS.vert,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 30, margin: "0 auto 16px",
            }}>✓</div>
            <h1 style={{
              fontFamily: "var(--font-dm-serif-display), Georgia, serif",
              fontSize: 24, color: COLORS.noir, margin: "0 0 8px",
            }}>Ce BAT a déjà été validé</h1>
            <p style={{ color: COLORS.grisMoyen, fontSize: 13 }}>
              Signé par <strong>{bat.signedBy}</strong>
              {bat.signedAt && <> le {formatDate(bat.signedAt)}</>}
            </p>
          </div>
        </Card>
      </FullScreen>
    );
  }

  if (bat.statut === "modifier") {
    return (
      <FullScreen>
        <Card>
          <div style={{ padding: "48px 30px", textAlign: "center" }}>
            <h1 style={{
              fontFamily: "var(--font-dm-serif-display), Georgia, serif",
              fontSize: 24, color: COLORS.noir, margin: "0 0 8px",
            }}>BAT en cours de révision</h1>
            <p style={{ color: COLORS.grisMoyen, fontSize: 14 }}>
              Une demande de modifications a déjà été envoyée à notre équipe.<br />
              Vous recevrez bientôt une nouvelle version.
            </p>
          </div>
        </Card>
      </FullScreen>
    );
  }

  // === FORMULAIRE PRINCIPAL : statut = "envoye" ===
  return (
    <FullScreen>
      {/* Header agence */}
      <header style={{
        background: COLORS.noirDeep, padding: "20px 0",
        marginBottom: 24,
      }}>
        <div style={{ maxWidth: 960, margin: "0 auto", padding: "0 24px" }}>
          <div style={{
            fontFamily: "var(--font-dm-serif-display), Georgia, serif",
            fontSize: 22, color: COLORS.dore, letterSpacing: 1,
          }}>GROUPE ÉCHO</div>
          <div style={{
            fontSize: 11, color: "#888", letterSpacing: 1.5,
            textTransform: "uppercase", marginTop: 2,
          }}>Validation de BAT</div>
        </div>
      </header>

      <div style={{ maxWidth: 960, margin: "0 auto 40px", padding: "0 24px" }}>
        {/* Contexte du BAT */}
        <Card>
          <div style={{
            padding: "20px 24px", borderBottom: `1px solid ${COLORS.grisBorder}`,
          }}>
            <div style={{ fontSize: 11, color: COLORS.grisMoyen, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>
              Bon à tirer · v{bat.version}
            </div>
            <h1 style={{
              fontFamily: "var(--font-dm-serif-display), Georgia, serif",
              fontSize: 26, color: COLORS.noir, margin: 0,
            }}>{bat.taskName}</h1>
            <div style={{ fontSize: 13, color: COLORS.grisMoyen, marginTop: 4 }}>
              <strong>{bat.projet}</strong> · {bat.client}
            </div>
            {bat.uploadedAt && (
              <div style={{ fontSize: 12, color: COLORS.grisMoyen, marginTop: 8 }}>
                Document transmis le {formatDate(bat.uploadedAt)}
              </div>
            )}
          </div>

          {/* PDF preview */}
          <div style={{ padding: 24 }}>
            <div style={{
              fontSize: 11, fontWeight: 600, color: COLORS.grisMoyen,
              textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10,
            }}>Document à valider</div>

            {bat.pdfDataUrl ? (
              <iframe
                src={bat.pdfDataUrl}
                title={bat.pdfName}
                style={{
                  width: "100%", height: 600,
                  border: `1px solid ${COLORS.grisBorder}`,
                  borderRadius: 10, background: COLORS.blanc,
                }}
              />
            ) : (
              <div style={{
                padding: "40px 20px", textAlign: "center",
                background: COLORS.gris, border: `1px dashed ${COLORS.grisBorder}`,
                borderRadius: 10,
              }}>
                <div style={{ fontSize: 36, marginBottom: 8, color: COLORS.grisMoyen }}>📄</div>
                <div style={{ fontWeight: 600, fontSize: 14, color: COLORS.noir, marginBottom: 6 }}>
                  {bat.pdfName ?? "(document)"}
                </div>
                <div style={{ fontSize: 12, color: COLORS.grisMoyen, marginTop: 12, lineHeight: 1.5, fontStyle: "italic" }}>
                  Le PDF n&apos;est pas accessible depuis ce navigateur (démo locale).<br />
                  En production, il serait servi depuis Supabase Storage.
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Formulaire validation */}
        <div style={{ marginTop: 16 }}>
          {!isRequestingMods ? (
            <Card>
              <div style={{ padding: 24 }}>
                <h2 style={{
                  fontFamily: "var(--font-dm-serif-display), Georgia, serif",
                  fontSize: 20, color: COLORS.noir, margin: "0 0 16px",
                }}>Valider ce BAT</h2>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
                  <div>
                    <label style={{
                      display: "block", fontSize: 11, fontWeight: 600, color: COLORS.grisMoyen,
                      textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4,
                    }}>Votre nom *</label>
                    <input
                      type="text"
                      value={signerName}
                      onChange={(e) => setSignerName(e.target.value)}
                      placeholder="ex: Jean Bertrand"
                      style={{
                        width: "100%", padding: "10px 12px",
                        border: `1px solid ${COLORS.grisBorder}`, borderRadius: 8,
                        fontSize: 14, color: COLORS.noir, background: COLORS.blanc,
                        outline: "none", fontFamily: "inherit",
                      }}
                    />
                  </div>
                  <div>
                    <label style={{
                      display: "block", fontSize: 11, fontWeight: 600, color: COLORS.grisMoyen,
                      textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4,
                    }}>Société (optionnel)</label>
                    <input
                      type="text"
                      value={signerOrg}
                      onChange={(e) => setSignerOrg(e.target.value)}
                      placeholder={bat.client}
                      style={{
                        width: "100%", padding: "10px 12px",
                        border: `1px solid ${COLORS.grisBorder}`, borderRadius: 8,
                        fontSize: 14, color: COLORS.noir, background: COLORS.blanc,
                        outline: "none", fontFamily: "inherit",
                      }}
                    />
                  </div>
                </div>

                <label style={{
                  display: "flex", alignItems: "flex-start", gap: 12, cursor: "pointer",
                  padding: "14px 16px", background: COLORS.gris, borderRadius: 10,
                  marginBottom: 16,
                }}>
                  <input
                    type="checkbox"
                    checked={signatureChecked}
                    onChange={(e) => setSignatureChecked(e.target.checked)}
                    style={{
                      width: 20, height: 20, marginTop: 2,
                      accentColor: COLORS.dore, cursor: "pointer", flexShrink: 0,
                    }}
                  />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: COLORS.noir, marginBottom: 4 }}>
                      Je valide définitivement ce BAT
                    </div>
                    <div style={{ fontSize: 12, color: COLORS.grisMoyen, lineHeight: 1.5 }}>
                      En cochant cette case, je confirme avoir consulté le document
                      <strong style={{ color: COLORS.noir }}> « {bat.taskName} »</strong>
                      {" "}et j&apos;atteste que son contenu est conforme à mes attentes.
                      Aucune modification ne pourra être demandée après validation.
                    </div>
                  </div>
                </label>

                <button
                  onClick={handleValidate}
                  disabled={!signatureChecked || !signerName.trim()}
                  style={{
                    width: "100%", padding: "14px", borderRadius: 10,
                    background: (signatureChecked && signerName.trim()) ? COLORS.vert : COLORS.gris,
                    border: "none",
                    color: (signatureChecked && signerName.trim()) ? COLORS.blanc : COLORS.grisMoyen,
                    fontSize: 15, fontWeight: 700,
                    cursor: (signatureChecked && signerName.trim()) ? "pointer" : "not-allowed",
                    transition: "all 0.15s",
                  }}
                >✓ Signer et valider le BAT</button>

                <div style={{ textAlign: "center", marginTop: 16 }}>
                  <button
                    onClick={() => setIsRequestingMods(true)}
                    style={{
                      background: "none", border: "none", cursor: "pointer",
                      color: COLORS.rouge, fontSize: 13, fontWeight: 600,
                      textDecoration: "underline", padding: 0,
                    }}
                  >Demander des modifications →</button>
                </div>
              </div>
            </Card>
          ) : (
            <Card>
              <div style={{ padding: 24 }}>
                <h2 style={{
                  fontFamily: "var(--font-dm-serif-display), Georgia, serif",
                  fontSize: 20, color: COLORS.noir, margin: "0 0 16px",
                }}>Demander des modifications</h2>

                <label style={{
                  display: "block", fontSize: 11, fontWeight: 600, color: COLORS.grisMoyen,
                  textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6,
                }}>Vos remarques *</label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Décrivez précisément les modifications attendues : éléments à corriger, ajouter, retirer…"
                  rows={6}
                  style={{
                    width: "100%", padding: "12px",
                    border: `1px solid ${COLORS.grisBorder}`, borderRadius: 8,
                    fontSize: 14, color: COLORS.noir, background: COLORS.blanc,
                    outline: "none", fontFamily: "inherit", resize: "vertical",
                  }}
                />
                <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                  <button
                    onClick={() => { setIsRequestingMods(false); setComment(""); }}
                    style={{
                      flex: 1, padding: "12px", borderRadius: 10,
                      background: "transparent", border: `1px solid ${COLORS.grisBorder}`,
                      color: COLORS.grisMoyen, fontSize: 14, fontWeight: 600, cursor: "pointer",
                    }}
                  >Retour</button>
                  <button
                    onClick={handleSubmitMods}
                    disabled={!comment.trim()}
                    style={{
                      flex: 2, padding: "12px", borderRadius: 10,
                      background: comment.trim() ? COLORS.rouge : COLORS.gris,
                      border: "none",
                      color: comment.trim() ? COLORS.blanc : COLORS.grisMoyen,
                      fontSize: 14, fontWeight: 700,
                      cursor: comment.trim() ? "pointer" : "not-allowed",
                    }}
                  >Envoyer ma demande</button>
                </div>
              </div>
            </Card>
          )}
        </div>

        <p style={{ textAlign: "center", fontSize: 11, color: COLORS.grisMoyen, marginTop: 24 }}>
          Lien sécurisé · Une copie horodatée sera archivée
        </p>
      </div>
    </FullScreen>
  );
}

function FullScreen({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: "100vh", background: COLORS.gris }}>
      {children}
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      background: COLORS.blanc, borderRadius: 16,
      border: `1px solid ${COLORS.grisBorder}`,
      maxWidth: 960, margin: "0 auto",
      boxShadow: "0 1px 3px rgba(0,0,0,.04)",
      overflow: "hidden",
    }}>{children}</div>
  );
}
