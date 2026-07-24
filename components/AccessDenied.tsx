"use client";

import { COLORS } from "@/lib/mock-data";

type Props = {
  message?: string;
  user?: { nom: string; role: string };
};

export default function AccessDenied({ message, user }: Props) {
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
        }}>Accès restreint</h1>
        <p style={{ color: COLORS.grisMoyen, fontSize: 16, margin: 0 }}>
          {message ?? "Cette page est réservée à la Direction et aux Admins."}
          {user && (
            <>
              <br />
              Vous êtes connecté(e) en tant que <strong>{user.nom}</strong> ({user.role}).
            </>
          )}
        </p>
      </div>
    </div>
  );
}
