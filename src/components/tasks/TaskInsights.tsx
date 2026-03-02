"use client";

import { useEffect, useState } from "react";
import { TaskInsights as TaskInsightsData } from "@/lib/types/tasks";

const PRIORITY_LABELS: Record<string, string> = {
  high: "Hoog",
  medium: "Gemiddeld",
  low: "Laag",
};

const PRIORITY_COLORS: Record<string, string> = {
  high: "bg-red-500",
  medium: "bg-amber-500",
  low: "bg-blue-400",
};

export default function TaskInsights() {
  const [data, setData] = useState<TaskInsightsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/tasks/insights")
      .then((r) => r.json())
      .then((d) => setData(d))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-32 rounded-xl bg-surface" />
        ))}
      </div>
    );
  }

  if (!data) return null;

  const maxWeeklyValue = Math.max(
    ...data.weeklyData.flatMap((w) => [w.created, w.completed]),
    1
  );

  const maxProjectTotal = Math.max(
    ...data.projectBreakdown.map((p) => p.open + p.done),
    1
  );

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Hero stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-xl border border-border bg-surface p-4">
          <div className="text-3xl font-bold text-foreground mb-1">
            {data.streak > 0 ? `${data.streak}` : "0"}
          </div>
          <div className="text-sm text-muted-foreground">
            {data.streak === 1 ? "dag streak" : "dagen streak"}
          </div>
          <div className="mt-2 text-xl">
            {data.streak >= 7 ? "🔥" : data.streak >= 3 ? "⚡" : data.streak > 0 ? "✓" : "—"}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-surface p-4">
          <div className="text-3xl font-bold text-foreground mb-1">
            {data.completionRateThisWeek}%
          </div>
          <div className="text-sm text-muted-foreground">voltooid deze week</div>
          <div className="mt-2 w-full h-1.5 rounded-full bg-border overflow-hidden">
            <div
              className="h-full rounded-full bg-accent transition-all"
              style={{ width: `${data.completionRateThisWeek}%` }}
            />
          </div>
        </div>
      </div>

      {/* Weekly activity */}
      <div className="rounded-xl border border-border bg-surface p-4">
        <h3 className="text-sm font-semibold text-foreground mb-4">
          Wekelijkse activiteit
        </h3>
        <div className="flex items-end gap-2 h-28">
          {data.weeklyData.map((w, i) => {
            const createdPct = (w.created / maxWeeklyValue) * 100;
            const completedPct = (w.completed / maxWeeklyValue) * 100;
            const isLast = i === data.weeklyData.length - 1;
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-1 min-w-0">
                <div className="w-full flex items-end gap-0.5 h-20">
                  {/* Created bar */}
                  <div className="flex-1 flex flex-col justify-end">
                    <div
                      className={`w-full rounded-t transition-all ${isLast ? "bg-accent/30" : "bg-border"}`}
                      style={{ height: `${Math.max(createdPct, w.created > 0 ? 4 : 0)}%` }}
                      title={`Aangemaakt: ${w.created}`}
                    />
                  </div>
                  {/* Completed bar */}
                  <div className="flex-1 flex flex-col justify-end">
                    <div
                      className={`w-full rounded-t transition-all ${isLast ? "bg-accent" : "bg-accent/50"}`}
                      style={{ height: `${Math.max(completedPct, w.completed > 0 ? 4 : 0)}%` }}
                      title={`Voltooid: ${w.completed}`}
                    />
                  </div>
                </div>
                <span className={`text-[10px] truncate w-full text-center ${isLast ? "text-accent font-medium" : "text-muted-foreground/60"}`}>
                  {w.week}
                </span>
              </div>
            );
          })}
        </div>
        {/* Legend */}
        <div className="flex items-center gap-4 mt-3">
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="w-3 h-2 rounded-sm bg-border" />
            Aangemaakt
          </span>
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="w-3 h-2 rounded-sm bg-accent/50" />
            Voltooid
          </span>
        </div>
      </div>

      {/* Project breakdown */}
      {data.projectBreakdown.length > 0 && (
        <div className="rounded-xl border border-border bg-surface p-4">
          <h3 className="text-sm font-semibold text-foreground mb-4">Per project</h3>
          <div className="space-y-3">
            {data.projectBreakdown.map((p) => {
              const total = p.open + p.done;
              const donePct = total > 0 ? (p.done / total) * 100 : 0;
              const barWidth = (total / maxProjectTotal) * 100;
              return (
                <div key={p.projectId}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: p.color }}
                      />
                      <span className="text-sm text-foreground">{p.name}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {p.done}/{total}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-border overflow-hidden" style={{ width: `${barWidth}%` }}>
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${donePct}%`,
                        backgroundColor: p.color,
                        opacity: 0.8,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Priority breakdown */}
      <div className="rounded-xl border border-border bg-surface p-4">
        <h3 className="text-sm font-semibold text-foreground mb-4">Per prioriteit</h3>
        <div className="space-y-3">
          {data.priorityBreakdown.map((p) => {
            const total = p.open + p.done;
            if (total === 0) return null;
            const donePct = (p.done / total) * 100;
            return (
              <div key={p.priority}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-foreground">{PRIORITY_LABELS[p.priority]}</span>
                  <span className="text-xs text-muted-foreground">
                    {p.done} voltooid · {p.open} open
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-border overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${PRIORITY_COLORS[p.priority]}`}
                    style={{ width: `${donePct}%`, opacity: 0.75 }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
