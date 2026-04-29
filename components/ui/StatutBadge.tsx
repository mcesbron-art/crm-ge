import { TACHE_STATUT_COLORS, PROJET_STATUT_COLORS } from "@/lib/mock-data";

type Props = {
  statut: string;
  type?: "projet" | "tache";
};

export default function StatutBadge({ statut, type = "projet" }: Props) {
  const colors =
    type === "projet" ? PROJET_STATUT_COLORS[statut] : TACHE_STATUT_COLORS[statut];
  if (!colors) return <span>{statut}</span>;

  const isProjet = type === "projet";

  return (
    <span
      style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        padding: "4px 12px", borderRadius: 20,
        background: colors.bg, color: colors.text,
        fontSize: 12, fontWeight: 600, letterSpacing: 0.2,
        whiteSpace: "nowrap",
      }}
    >
      {isProjet && "dot" in colors && (
        <span
          style={{
            width: 7, height: 7, borderRadius: "50%",
            background: (colors as { dot: string }).dot,
          }}
        />
      )}
      {statut}
    </span>
  );
}
