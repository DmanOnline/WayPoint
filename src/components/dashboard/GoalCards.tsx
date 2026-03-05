"use client";

import Link from "next/link";
import type { DashboardData } from "./DashboardShell";

interface Props {
  goals: DashboardData["goals"] | null;
  loading: boolean;
}

function ProgressRing({ progress, color, size = 40 }: { progress: number; color: string; size?: number }) {
  const strokeWidth = 3;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <svg width={size} height={size} className="shrink-0 -rotate-90">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="var(--border)"
        strokeWidth={strokeWidth}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        className="transition-all duration-700"
      />
    </svg>
  );
}

function daysUntil(dateStr: string | null): string | null {
  if (!dateStr) return null;
  const diff = Math.ceil((new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (diff < 0) return `${Math.abs(diff)}d te laat`;
  if (diff === 0) return "vandaag";
  if (diff <= 7) return `${diff}d`;
  if (diff <= 30) return `${Math.ceil(diff / 7)}w`;
  return `${Math.ceil(diff / 30)}mnd`;
}

export default function GoalCards({ goals, loading }: Props) {
  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-card p-5 animate-fade-in opacity-0 stagger-5 card-gradient">
        <div className="h-4 w-28 bg-border rounded animate-pulse mb-4" />
        <div className="flex gap-3 overflow-hidden">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex-shrink-0 w-48 h-20 bg-border rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!goals || goals.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-5 animate-fade-in opacity-0 stagger-5 card-gradient">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Actieve doelen
          </h3>
          <Link href="/goals" className="text-xs text-accent hover:underline">
            Goals
          </Link>
        </div>
        <p className="text-sm text-muted-foreground py-2 text-center">
          Geen actieve doelen
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5 animate-fade-in opacity-0 stagger-5 card-gradient">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Actieve doelen
        </h3>
        <Link href="/goals" className="text-xs text-accent hover:underline">
          Goals
        </Link>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
        {goals.map((goal) => {
          const deadline = daysUntil(goal.targetDate);
          const isOverdue = goal.targetDate && new Date(goal.targetDate) < new Date();

          return (
            <Link
              key={goal.id}
              href="/goals"
              className="flex-shrink-0 w-52 rounded-lg border border-border p-3 hover:bg-surface transition-colors group"
            >
              <div className="flex items-start gap-3">
                <ProgressRing progress={goal.progress} color={goal.color} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate group-hover:text-accent transition-colors">
                    {goal.title}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] text-muted-foreground tabular-nums">
                      {goal.progress}%
                    </span>
                    {goal.milestonesTotal > 0 && (
                      <span className="text-[10px] text-muted-foreground">
                        {goal.milestonesCompleted}/{goal.milestonesTotal}
                      </span>
                    )}
                    {deadline && (
                      <span className={`text-[10px] ${isOverdue ? "text-negative" : "text-muted-foreground"}`}>
                        {deadline}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
