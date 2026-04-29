import type { Collaborateur } from "@/lib/mock-data";

type Props = {
  collab?: Collaborateur | null;
  size?: number;
};

export default function Avatar({ collab, size = 32 }: Props) {
  if (!collab) {
    return (
      <div
        style={{
          width: size, height: size, borderRadius: "50%",
          background: "#E0E0E0",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: size * 0.38, color: "#999",
          flexShrink: 0,
        }}
      >
        ?
      </div>
    );
  }
  return (
    <div
      title={`${collab.nom} — ${collab.pole}`}
      style={{
        width: size, height: size, borderRadius: "50%",
        background: collab.color,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: size * 0.38, color: "#fff", fontWeight: 700, letterSpacing: -0.5,
        cursor: "default", flexShrink: 0,
      }}
    >
      {collab.avatar}
    </div>
  );
}
