"use client";

import { useState, useRef, useEffect } from "react";

interface DataPoint {
  x: number;
  y: number;
  value: number;
  label: string;
}

export function InteractiveChart({
  isDark,
  height = 200,
}: {
  isDark: boolean;
  height?: number;
}) {
  const [hoveredPoint, setHoveredPoint] = useState<number | null>(null);
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    value: number;
    label: string;
  } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [svgWidth, setSvgWidth] = useState(600);

  const lineColor = "#C5A55A";
  const gridColor = isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)";
  const textColor = isDark ? "#999999" : "#666666";
  const bgColor = isDark ? "#1A1A1A" : "#F5F5F5";

  const dataPoints: DataPoint[] = [
    { x: 0, y: 120, value: 25, label: "Sem 1" },
    { x: 75, y: 100, value: 32, label: "Sem 2" },
    { x: 150, y: 95, value: 35, label: "Sem 3" },
    { x: 225, y: 110, value: 30, label: "Sem 4" },
    { x: 300, y: 85, value: 40, label: "Sem 5" },
    { x: 375, y: 75, value: 45, label: "Sem 6" },
    { x: 450, y: 90, value: 38, label: "Sem 7" },
    { x: 525, y: 70, value: 48, label: "Sem 8" },
    { x: 600, y: 65, value: 50, label: "Sem 9" },
  ];

  useEffect(() => {
    if (!svgRef.current) return;
    const resizeObserver = new ResizeObserver(() => {
      if (svgRef.current) {
        setSvgWidth(svgRef.current.clientWidth || 600);
      }
    });
    resizeObserver.observe(svgRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  const handleMouseMove = (
    e: React.MouseEvent<SVGSVGElement>,
    pointIdx: number,
    point: DataPoint
  ) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (rect) {
      const svgX = (point.x / 600) * rect.width;
      const svgY = (point.y / 200) * rect.height;
      setTooltip({
        x: svgX,
        y: svgY,
        value: point.value,
        label: point.label,
      });
    }
    setHoveredPoint(pointIdx);
  };

  const handleMouseLeave = () => {
    setHoveredPoint(null);
    setTooltip(null);
  };

  return (
    <div style={{ position: "relative", width: "100%" }}>
      <svg
        ref={svgRef}
        width="100%"
        height={height}
        viewBox="0 0 600 200"
        style={{
          display: "block",
          background: bgColor,
          borderRadius: "8px",
        }}
        preserveAspectRatio="xMidYMid meet"
        onMouseLeave={handleMouseLeave}
      >
        {/* Grid lines */}
        <line x1="0" y1="50" x2="600" y2="50" stroke={gridColor} strokeWidth="1" />
        <line
          x1="0"
          y1="100"
          x2="600"
          y2="100"
          stroke={gridColor}
          strokeWidth="1"
        />
        <line
          x1="0"
          y1="150"
          x2="600"
          y2="150"
          stroke={gridColor}
          strokeWidth="1"
        />

        {/* Chart line */}
        <polyline
          points="0,120 75,100 150,95 225,110 300,85 375,75 450,90 525,70 600,65"
          fill="none"
          stroke={lineColor}
          strokeWidth="2.5"
          opacity="0.9"
        />

        {/* Gradient fill */}
        <defs>
          <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={lineColor} stopOpacity="0.25" />
            <stop offset="100%" stopColor={lineColor} stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon
          points="0,120 75,100 150,95 225,110 300,85 375,75 450,90 525,70 600,65 600,200 0,200"
          fill="url(#areaGradient)"
        />

        {/* Interactive points */}
        {dataPoints.map((point, idx) => (
          <g key={idx} style={{ cursor: "pointer" }}>
            <circle
              cx={point.x}
              cy={point.y}
              r={hoveredPoint === idx ? "6" : "4"}
              fill={lineColor}
              opacity={hoveredPoint === idx ? "1" : "0.7"}
              style={{
                transition: "all 0.2s ease",
                pointerEvents: "auto",
              }}
              onMouseMove={(e) => handleMouseMove(e, idx, point)}
              onMouseEnter={(e) => handleMouseMove(e, idx, point)}
            />
            {hoveredPoint === idx && (
              <circle
                cx={point.x}
                cy={point.y}
                r="8"
                fill="none"
                stroke={lineColor}
                strokeWidth="1"
                opacity="0.3"
              />
            )}
          </g>
        ))}
      </svg>

      {/* Tooltip */}
      {tooltip && (
        <div
          style={{
            position: "absolute",
            left: `calc(${(tooltip.x / svgWidth) * 100}% + 10px)`,
            top: "10px",
            background: isDark ? "#2F2F2F" : "#FFFFFF",
            border: `1px solid ${lineColor}`,
            borderRadius: "6px",
            padding: "8px 12px",
            fontSize: "12px",
            fontWeight: "600",
            color: lineColor,
            pointerEvents: "none",
            zIndex: 10,
            boxShadow: isDark
              ? "0 2px 8px rgba(0,0,0,0.3)"
              : "0 2px 8px rgba(0,0,0,0.1)",
          }}
        >
          <div>{tooltip.label}</div>
          <div style={{ fontSize: "14px", fontWeight: "700" }}>
            {tooltip.value}k€
          </div>
        </div>
      )}

      {/* Legend */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: "11px",
          color: textColor,
          marginTop: "8px",
          paddingLeft: "10px",
          paddingRight: "10px",
        }}
      >
        <span>Sem 1</span>
        <span>Sem 9</span>
      </div>
    </div>
  );
}
