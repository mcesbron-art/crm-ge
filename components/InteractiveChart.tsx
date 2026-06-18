"use client";

import { useState, useRef, useEffect } from "react";

interface DataPoint {
  date: string;
  current: number;
  previous: number;
}

export function InteractiveChart({
  height = 300,
}: {
  height?: number;
}) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(
    null
  );
  const svgRef = useRef<SVGSVGElement>(null);

  // Colors
  const goldColor = "#C5A55A";
  const greyColor = "#CCCCCC";
  const gridColor = "#E0E0E0";
  const textColor = "#999999";
  const bgColor = "#FFFFFF";

  // Data - realistic CA values between 15k and 30k
  const data: DataPoint[] = [
    { date: "10 mars", current: 16.5, previous: 15.2 },
    { date: "11 mars", current: 18.2, previous: 15.8 },
    { date: "12 mars", current: 19.5, previous: 16.5 },
    { date: "13 mars", current: 20.1, previous: 17.2 },
    { date: "14 mars", current: 22.3, previous: 18.5 },
    { date: "15 mars", current: 25.8, previous: 19.3 },
    { date: "16 mars", current: 27.5, previous: 20.1 },
  ];

  // Chart dimensions
  const padding = { left: 40, right: 40, top: 20, bottom: 40 };
  const chartWidth = 800 - padding.left - padding.right;
  const chartHeight = 220 - padding.top - padding.bottom;
  const minValue = 15;
  const maxValue = 30;

  // Convert data value to SVG y coordinate
  const valueToY = (value: number): number => {
    return (
      padding.top +
      chartHeight -
      ((value - minValue) / (maxValue - minValue)) * chartHeight
    );
  };

  // Convert data index to SVG x coordinate
  const indexToX = (idx: number): number => {
    return padding.left + (idx / (data.length - 1)) * chartWidth;
  };

  useEffect(() => {
    if (!svgRef.current) return;
    const resizeObserver = new ResizeObserver(() => {});
    resizeObserver.observe(svgRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  // Build path strings for curves
  const goldPath = data
    .map((d, idx) => `${indexToX(idx)},${valueToY(d.current)}`)
    .join(" ");

  const greyPath = data
    .map((d, idx) => `${indexToX(idx)},${valueToY(d.previous)}`)
    .join(" ");

  // Build area paths (for gradient fill)
  const goldAreaPath =
    goldPath +
    ` ${indexToX(data.length - 1)},${padding.top + chartHeight} ${indexToX(0)},${
      padding.top + chartHeight
    }`;

  const greyAreaPath =
    greyPath +
    ` ${indexToX(data.length - 1)},${padding.top + chartHeight} ${indexToX(0)},${
      padding.top + chartHeight
    }`;

  const handleMouseMove = (
    e: React.MouseEvent<SVGElement>,
    idx: number
  ) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (rect) {
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      setTooltipPos({ x, y });
    }
    setHoveredIdx(idx);
  };

  const handleMouseLeave = () => {
    setHoveredIdx(null);
    setTooltipPos(null);
  };

  return (
    <div style={{ position: "relative", width: "100%" }}>
      <svg
        ref={svgRef}
        width="100%"
        height={height}
        viewBox="0 0 800 260"
        style={{
          display: "block",
          background: bgColor,
          borderRadius: "8px",
        }}
        preserveAspectRatio="xMidYMid meet"
        onMouseLeave={handleMouseLeave}
      >
        <defs>
          {/* Gold gradient fill */}
          <linearGradient id="goldGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={goldColor} stopOpacity="0.2" />
            <stop offset="100%" stopColor={goldColor} stopOpacity="0.02" />
          </linearGradient>

          {/* Grey gradient fill */}
          <linearGradient id="greyGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={greyColor} stopOpacity="0.15" />
            <stop offset="100%" stopColor={greyColor} stopOpacity="0.01" />
          </linearGradient>
        </defs>

        {/* Y-axis labels (15k, 20k, 25k, 30k) */}
        <g>
          {[15, 20, 25, 30].map((val) => (
            <g key={`y-${val}`}>
              <text
                x={padding.left - 10}
                y={valueToY(val) + 5}
                textAnchor="end"
                fontSize="12"
                fill={textColor}
              >
                {val}k
              </text>
            </g>
          ))}
        </g>

        {/* Horizontal grid lines */}
        {[15, 20, 25, 30].map((val) => (
          <line
            key={`grid-${val}`}
            x1={padding.left}
            y1={valueToY(val)}
            x2={padding.left + chartWidth}
            y2={valueToY(val)}
            stroke={gridColor}
            strokeWidth="1"
          />
        ))}

        {/* Grey curve and fill */}
        <polygon
          points={greyAreaPath}
          fill="url(#greyGradient)"
          opacity="0.8"
        />
        <polyline
          points={greyPath}
          fill="none"
          stroke={greyColor}
          strokeWidth="2"
        />

        {/* Gold curve and fill */}
        <polygon
          points={goldAreaPath}
          fill="url(#goldGradient)"
          opacity="0.9"
        />
        <polyline
          points={goldPath}
          fill="none"
          stroke={goldColor}
          strokeWidth="2.5"
        />

        {/* Vertical dashed line on hover */}
        {hoveredIdx !== null && (
          <line
            x1={indexToX(hoveredIdx)}
            y1={padding.top}
            x2={indexToX(hoveredIdx)}
            y2={padding.top + chartHeight}
            stroke={goldColor}
            strokeWidth="1"
            strokeDasharray="4,4"
            opacity="0.6"
          />
        )}

        {/* Interactive points - grey */}
        {data.map((d, idx) => (
          <g key={`prev-${idx}`} style={{ cursor: "pointer" }}>
            <circle
              cx={indexToX(idx)}
              cy={valueToY(d.previous)}
              r={hoveredIdx === idx ? "5" : "3.5"}
              fill={greyColor}
              opacity={hoveredIdx === idx ? "1" : "0.7"}
              style={{
                transition: "all 0.2s ease",
                pointerEvents: "auto",
              }}
              onMouseMove={(e) => handleMouseMove(e, idx)}
              onMouseEnter={(e) => handleMouseMove(e, idx)}
            />
          </g>
        ))}

        {/* Interactive points - gold */}
        {data.map((d, idx) => (
          <g key={`curr-${idx}`} style={{ cursor: "pointer" }}>
            <circle
              cx={indexToX(idx)}
              cy={valueToY(d.current)}
              r={hoveredIdx === idx ? "5.5" : "4"}
              fill={goldColor}
              opacity={hoveredIdx === idx ? "1" : "0.8"}
              style={{
                transition: "all 0.2s ease",
                pointerEvents: "auto",
              }}
              onMouseMove={(e) => handleMouseMove(e, idx)}
              onMouseEnter={(e) => handleMouseMove(e, idx)}
            />
            {hoveredIdx === idx && (
              <circle
                cx={indexToX(idx)}
                cy={valueToY(d.current)}
                r="7"
                fill="none"
                stroke={goldColor}
                strokeWidth="1.5"
                opacity="0.3"
              />
            )}
          </g>
        ))}

        {/* X-axis labels (dates) */}
        <g>
          <text
            x={padding.left}
            y={padding.top + chartHeight + 25}
            fontSize="12"
            fill={textColor}
          >
            10 mars
          </text>
          <text
            x={padding.left + chartWidth}
            y={padding.top + chartHeight + 25}
            textAnchor="end"
            fontSize="12"
            fill={textColor}
          >
            16 mars
          </text>
        </g>
      </svg>

      {/* Tooltip */}
      {hoveredIdx !== null && tooltipPos && (
        <div
          style={{
            position: "absolute",
            left: `${tooltipPos.x}px`,
            top: `${tooltipPos.y - 80}px`,
            background: "#FFFFFF",
            border: "1px solid #E5E5E5",
            borderRadius: "6px",
            padding: "10px 12px",
            pointerEvents: "none",
            zIndex: 20,
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
            whiteSpace: "nowrap",
            transform: "translateX(-50%)",
          }}
        >
          <div style={{ fontSize: "11px", color: textColor, marginBottom: "4px" }}>
            {data[0].date} – {data[data.length - 1].date}
          </div>
          <div
            style={{
              fontSize: "14px",
              fontWeight: "700",
              color: goldColor,
            }}
          >
            CA {data[hoveredIdx].current.toFixed(1)} k€
          </div>
        </div>
      )}
    </div>
  );
}
