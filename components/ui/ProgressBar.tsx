import { getRentabiliteColor } from "@/lib/mock-data";

type Props = {
  consumed: number;
  allocated: number;
  height?: number;
  showPct?: boolean;
};

export default function ProgressBar({ consumed, allocated, height = 8, showPct = true }: Props) {
  const pct = allocated > 0 ? Math.min((consumed / allocated) * 100, 150) : 0;
  const display = Math.min(pct, 100);
  const info = getRentabiliteColor(pct);

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, width: "100%" }}>
      <div
        style={{
          flex: 1, height, borderRadius: height, background: "#EEEEE9",
          overflow: "hidden", position: "relative",
        }}
      >
        <div
          style={{
            width: `${display}%`, height: "100%", borderRadius: height,
            background:
              pct > 100
                ? `repeating-linear-gradient(135deg, ${info.color}, ${info.color} 4px, ${info.color}99 4px, ${info.color}99 8px)`
                : info.color,
            transition: "width 0.6s cubic-bezier(.4,0,.2,1)",
          }}
        />
      </div>
      {showPct && (
        <span
          style={{
            fontSize: 12, fontWeight: 600,
            color: info.color, minWidth: 40, textAlign: "right",
          }}
        >
          {Math.round(pct)}%
        </span>
      )}
    </div>
  );
}
