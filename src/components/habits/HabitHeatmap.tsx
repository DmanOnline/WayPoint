"use client";

import { useState } from "react";
import { HeatmapDay } from "@/lib/types/habits";

interface HabitHeatmapProps {
  data: HeatmapDay[];
}

const MONTHS_NL = ["Jan", "Feb", "Mrt", "Apr", "Mei", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dec"];

export default function HabitHeatmap({ data }: HabitHeatmapProps) {
  const [tooltip, setTooltip] = useState<{ day: HeatmapDay; x: number; y: number } | null>(null);

  if (data.length === 0) return null;

  // Build grid: 7 rows (days) x ~53 cols (weeks)
  // Start from the first Monday before our data range
  const firstDate = new Date(data[0].date);
  const firstDayOfWeek = firstDate.getDay();
  const leadingEmpty = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1; // Mon=0

  // Calculate month labels
  const monthLabels: { label: string; col: number }[] = [];
  let lastMonth = -1;
  data.forEach((d, i) => {
    const month = new Date(d.date).getMonth();
    if (month !== lastMonth) {
      lastMonth = month;
      const col = Math.floor((i + leadingEmpty) / 7);
      monthLabels.push({ label: MONTHS_NL[month], col });
    }
  });

  const cellSize = 12;
  const gap = 2;
  const step = cellSize + gap;
  const totalCols = Math.ceil((data.length + leadingEmpty) / 7);
  const labelWidth = 28;

  const levelColors = [
    "var(--heatmap-0, rgba(127,127,127,0.1))",
    "var(--heatmap-1, #065f46)",
    "var(--heatmap-2, #047857)",
    "var(--heatmap-3, #059669)",
    "var(--heatmap-4, #10b981)",
  ];

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <h3 className="text-sm font-semibold text-foreground mb-4">Activiteit</h3>

      <div className="overflow-x-auto pb-2">
        <svg
          width={labelWidth + totalCols * step + 10}
          height={20 + 7 * step + 30}
          className="block"
        >
          {/* Month labels */}
          {monthLabels.map((m, i) => (
            <text
              key={i}
              x={labelWidth + m.col * step}
              y={12}
              className="fill-muted-foreground"
              fontSize="10"
            >
              {m.label}
            </text>
          ))}

          {/* Day labels */}
          {["Ma", "", "Wo", "", "Vr", "", ""].map((label, i) => (
            label && (
              <text
                key={i}
                x={0}
                y={20 + i * step + cellSize - 2}
                className="fill-muted-foreground"
                fontSize="9"
              >
                {label}
              </text>
            )
          ))}

          {/* Cells */}
          {data.map((day, i) => {
            const gridIdx = i + leadingEmpty;
            const col = Math.floor(gridIdx / 7);
            const row = gridIdx % 7;
            const x = labelWidth + col * step;
            const y = 20 + row * step;

            return (
              <rect
                key={day.date}
                x={x}
                y={y}
                width={cellSize}
                height={cellSize}
                rx={2}
                fill={levelColors[day.level]}
                className="heatmap-cell cursor-pointer transition-colors"
                onMouseEnter={(e) => {
                  const rect = (e.target as SVGRectElement).getBoundingClientRect();
                  setTooltip({ day, x: rect.left + rect.width / 2, y: rect.top });
                }}
                onMouseLeave={() => setTooltip(null)}
              />
            );
          })}

          {/* Legend */}
          <text
            x={labelWidth + (totalCols - 8) * step}
            y={20 + 7 * step + 20}
            className="fill-muted-foreground"
            fontSize="9"
          >
            Minder
          </text>
          {[0, 1, 2, 3, 4].map((level, i) => (
            <rect
              key={level}
              x={labelWidth + (totalCols - 5.5 + i) * step}
              y={20 + 7 * step + 10}
              width={cellSize}
              height={cellSize}
              rx={2}
              fill={levelColors[level]}
            />
          ))}
          <text
            x={labelWidth + (totalCols + 0.5) * step}
            y={20 + 7 * step + 20}
            className="fill-muted-foreground"
            fontSize="9"
          >
            Meer
          </text>
        </svg>
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="fixed z-50 px-2.5 py-1.5 rounded-lg bg-foreground text-background text-xs font-medium shadow-lg pointer-events-none"
          style={{
            left: tooltip.x,
            top: tooltip.y - 36,
            transform: "translateX(-50%)",
          }}
        >
          {formatDate(tooltip.day.date)}: {tooltip.day.count} {tooltip.day.count === 1 ? "habit" : "habits"}
        </div>
      )}
    </div>
  );
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const months = ["jan", "feb", "mrt", "apr", "mei", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}
