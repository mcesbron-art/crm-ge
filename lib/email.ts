import "server-only";
import { Resend } from "resend";

function getResend() {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY non configuré");
  return new Resend(key);
}

const FROM = process.env.EMAIL_FROM ?? "CRM Groupe Écho <noreply@groupe-echo.fr>";

/* ── Email BAT client ── */
export async function sendBatValidationEmail(opts: {
  to: string;
  projectName: string;
  clientName: string;
  batUrl: string;
  validateUrl: string; // lien vers la page publique /bat/[token]
}) {
  const { to, projectName, clientName, batUrl, validateUrl } = opts;

  return getResend().emails.send({
    from: FROM,
    to,
    subject: `Validation BAT – ${projectName}`,
    html: `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F5F5F2;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F5F2;padding:32px 0">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08)">

        <!-- Header -->
        <tr><td style="background:#0A0A0A;padding:28px 36px">
          <p style="margin:0;font-size:13px;color:#9A9078;letter-spacing:.08em;text-transform:uppercase">Groupe Écho · Production</p>
          <h1 style="margin:10px 0 0;font-size:24px;font-weight:800;color:#F4ECD7;line-height:1.2">${projectName}</h1>
        </td></tr>

        <!-- Body -->
        <tr><td style="padding:32px 36px">
          <p style="margin:0 0 16px;font-size:15px;color:#33322C;line-height:1.55">
            Bonjour${clientName ? ` ${clientName}` : ""},
          </p>
          <p style="margin:0 0 24px;font-size:15px;color:#33322C;line-height:1.55">
            Le BAT (Bon À Tirer) de votre projet <strong>${projectName}</strong> est prêt pour votre validation.
            Merci de le consulter et de nous indiquer votre décision.
          </p>

          <!-- BAT link -->
          <table cellpadding="0" cellspacing="0" style="margin-bottom:28px">
            <tr><td style="background:#F5F5F2;border:1px solid #E5E4DD;border-radius:10px;padding:14px 18px">
              <a href="${batUrl}" style="color:#2563EB;font-size:14px;font-weight:600;text-decoration:none">
                📄 Consulter le BAT
              </a>
            </td></tr>
          </table>

          <p style="margin:0 0 20px;font-size:14px;color:#5C5A52;line-height:1.5">
            Cliquez sur un bouton ci-dessous pour valider ou refuser le BAT.
            En cas de refus, un champ vous permettra d'indiquer vos remarques.
          </p>

          <!-- CTA buttons -->
          <table cellpadding="0" cellspacing="0" width="100%">
            <tr>
              <td width="48%">
                <a href="${validateUrl}?action=approve"
                   style="display:block;text-align:center;background:#1F8A5B;color:#fff;font-size:15px;font-weight:700;padding:14px 20px;border-radius:10px;text-decoration:none">
                  ✓ Accepter le BAT
                </a>
              </td>
              <td width="4%"></td>
              <td width="48%">
                <a href="${validateUrl}?action=reject"
                   style="display:block;text-align:center;background:#C2410C;color:#fff;font-size:15px;font-weight:700;padding:14px 20px;border-radius:10px;text-decoration:none">
                  ✗ Refuser le BAT
                </a>
              </td>
            </tr>
          </table>
        </td></tr>

        <!-- Footer -->
        <tr><td style="background:#F5F5F2;padding:20px 36px;border-top:1px solid #ECEBE4">
          <p style="margin:0;font-size:12px;color:#A6A498;line-height:1.5">
            Cet email a été envoyé automatiquement par le CRM Groupe Écho.<br>
            Si vous avez des questions, répondez à cet email ou contactez votre chargé de projet.
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`,
  });
}

/* ── Email notification facturation ── */
export async function sendFacturationEmail(opts: {
  projectName: string;
  clientName: string;
  assigneeName: string;
}) {
  const to = process.env.FACTURATION_EMAIL;
  if (!to) {
    console.warn("[email] FACTURATION_EMAIL non configuré — email non envoyé");
    return;
  }

  return getResend().emails.send({
    from: FROM,
    to,
    subject: `Mise en facturation – ${opts.projectName}`,
    html: `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:32px;background:#F5F5F2;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif">
  <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:14px;padding:32px;box-shadow:0 2px 12px rgba(0,0,0,.07)">
    <h2 style="margin:0 0 8px;font-size:20px;font-weight:800;color:#0A0A0A">Mise en facturation</h2>
    <p style="margin:0 0 20px;font-size:13px;color:#8C8B83">Notification automatique CRM Groupe Écho</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #ECEBE4;border-radius:10px;overflow:hidden">
      <tr><td style="padding:12px 16px;border-bottom:1px solid #ECEBE4;background:#F9F9F7">
        <span style="font-size:11px;font-weight:700;color:#A6A498;letter-spacing:.08em;text-transform:uppercase">Projet</span>
        <p style="margin:4px 0 0;font-size:15px;font-weight:700;color:#1C1B16">${opts.projectName}</p>
      </td></tr>
      <tr><td style="padding:12px 16px;border-bottom:1px solid #ECEBE4">
        <span style="font-size:11px;font-weight:700;color:#A6A498;letter-spacing:.08em;text-transform:uppercase">Client</span>
        <p style="margin:4px 0 0;font-size:14px;color:#33322C">${opts.clientName}</p>
      </td></tr>
      <tr><td style="padding:12px 16px">
        <span style="font-size:11px;font-weight:700;color:#A6A498;letter-spacing:.08em;text-transform:uppercase">Chargé de projet</span>
        <p style="margin:4px 0 0;font-size:14px;color:#33322C">${opts.assigneeName}</p>
      </td></tr>
    </table>
    <p style="margin:20px 0 0;font-size:13px;color:#8C8B83">Ce projet est prêt à être facturé. Merci de procéder à la facturation via Axonaut.</p>
  </div>
</body>
</html>`,
  });
}

/* ── Email notification réponse BAT (acceptation ou refus) ── */
export async function sendBatResponseEmail(opts: {
  to: string;
  assigneeName: string;
  projectName: string;
  clientName: string;
  action: "approve" | "reject";
  comment?: string | null;
  projectUrl: string;
}) {
  const approved = opts.action === "approve";
  const decisionColor  = approved ? "#1F8A5B" : "#C2410C";
  const decisionBg     = approved ? "#E7F3EB" : "#FBEAE0";
  const decisionIcon   = approved ? "✅" : "❌";
  const decisionLabel  = approved ? "BAT accepté" : "BAT refusé";
  const decisionText   = approved
    ? `Le client a <strong>accepté le BAT</strong>. Le projet a été automatiquement passé en <strong>À facturer</strong>.`
    : `Le client a <strong>refusé le BAT</strong>. Le projet reste en <strong>BAT envoyé</strong>. Prenez en compte les remarques ci-dessous avant de renvoyer un BAT corrigé.`;

  return getResend().emails.send({
    from: FROM,
    to:   opts.to,
    subject: `${decisionLabel} – ${opts.projectName}`,
    html: `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F5F5F2;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F5F2;padding:32px 0">
    <tr><td align="center">
      <table width="540" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08)">

        <!-- Header -->
        <tr><td style="background:#0A0A0A;padding:24px 32px">
          <p style="margin:0;font-size:11px;color:#9A9078;letter-spacing:.1em;text-transform:uppercase">Groupe Écho · CRM · Notification BAT</p>
          <h1 style="margin:8px 0 0;font-size:22px;font-weight:800;color:#F4ECD7;line-height:1.2">${opts.projectName}</h1>
          <p style="margin:5px 0 0;font-size:13px;color:#9A9078">${opts.clientName}</p>
        </td></tr>

        <!-- Decision badge -->
        <tr><td style="padding:24px 32px 0">
          <table cellpadding="0" cellspacing="0" width="100%">
            <tr><td style="background:${decisionBg};border-radius:12px;padding:16px 20px">
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="font-size:28px;padding-right:14px;vertical-align:middle">${decisionIcon}</td>
                  <td style="vertical-align:middle">
                    <div style="font-size:17px;font-weight:800;color:${decisionColor}">${decisionLabel}</div>
                    <div style="font-size:12px;color:#8C8B83;margin-top:3px">par ${opts.clientName}</div>
                  </td>
                </tr>
              </table>
            </td></tr>
          </table>
        </td></tr>

        <!-- Body -->
        <tr><td style="padding:20px 32px">
          <p style="margin:0 0 16px;font-size:14px;color:#33322C;line-height:1.55">
            Bonjour ${opts.assigneeName},
          </p>
          <p style="margin:0 0 20px;font-size:14px;color:#33322C;line-height:1.55">
            ${decisionText}
          </p>

          ${opts.comment ? `
          <!-- Commentaire client -->
          <table cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:20px">
            <tr><td style="background:#F5F5F2;border-left:3px solid ${decisionColor};border-radius:0 8px 8px 0;padding:14px 16px">
              <div style="font-size:11px;font-weight:700;color:${decisionColor};letter-spacing:.08em;text-transform:uppercase;margin-bottom:7px">Commentaire du client</div>
              <div style="font-size:14px;color:#33322C;line-height:1.55">${opts.comment}</div>
            </td></tr>
          </table>` : ""}

          <!-- CTA -->
          <a href="${opts.projectUrl}"
             style="display:inline-block;background:#0A0A0A;color:#E9D7A6;font-size:13px;font-weight:700;padding:12px 20px;border-radius:10px;text-decoration:none">
            Voir le projet dans le CRM →
          </a>
        </td></tr>

        <!-- Footer -->
        <tr><td style="background:#F5F5F2;padding:16px 32px;border-top:1px solid #ECEBE4">
          <p style="margin:0;font-size:11.5px;color:#A6A498;line-height:1.5">
            Notification automatique · CRM Groupe Écho
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`,
  });
}
