"use client";

import { useState } from "react";
import Link from "next/link";
import type { DashboardData } from "./DashboardShell";

interface Props {
  habits: DashboardData["habits"] | null;
  loading: boolean;
  onRefresh: () => void;
}

export default function HabitsToday({ habits, loading, onRefresh }: Props) {
  const [toggling, setToggling] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-card p-5 animate-fade-in opacity-0 stagger-3 card-gradient">
        <div className="h-4 w-24 bg-border rounded animate-pulse mb-4" />
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-5 h-5 rounded bg-border animate-pulse" />
              <div className="h-3 flex-1 bg-border rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const dueHabits = habits?.items.filter((h) => h.isDue) ?? [];
  const completed = dueHabits.filter((h) => h.isCompletedToday).length;
  const total = dueHabits.length;
  const progress = total > 0 ? (completed / total) * 100 : 0;

  async function toggleHabit(habitId: string, isCompleted: boolean) {
    setToggling(habitId);
    try {
      if (isCompleted) {
        // Remove completion
        await fetch("/api/habits/completions", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ habitId, date: new Date().toISOString().substring(0, 10) }),
        });
      } else {
        // Add completion
        await fetch("/api/habits/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ habitId, date: new Date().toISOString().substring(0, 10) }),
        });
      }
      onRefresh();
    } catch (err) {
      console.error("Toggle habit error:", err);
    } finally {
      setToggling(null);
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5 animate-fade-in opacity-0 stagger-3 card-gradient">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Habits
          </h3>
          {total > 0 && (
            <span className="text-xs font-medium text-foreground tabular-nums">
              {completed}/{total}
            </span>
          )}
        </div>
        <Link href="/habits" className="text-xs text-accent hover:underline">
          Alles
        </Link>
      </div>

      {/* Progress bar */}
      {total > 0 && (
        <div className="h-1.5 rounded-full bg-border mb-4 overflow-hidden">
          <div
            className="h-full rounded-full bg-positive transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {dueHabits.length === 0 ? (
        <p className="text-sm text-muted-foreground py-2 text-center">
          Geen habits vandaag
        </p>
      ) : (
        <div className="space-y-1">
          {dueHabits.map((habit) => (
            <button
              key={habit.id}
              onClick={() => toggleHabit(habit.id, habit.isCompletedToday)}
              disabled={toggling === habit.id}
              className={`w-full flex items-center gap-3 py-2 px-1 rounded-lg text-left transition-colors hover:bg-surface group ${
                toggling === habit.id ? "opacity-50" : ""
              }`}
            >
              {/* Checkbox */}
              <div
                className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${
                  habit.isCompletedToday
                    ? "border-transparent"
                    : "border-border group-hover:border-muted"
                }`}
                style={habit.isCompletedToday ? { backgroundColor: habit.color } : {}}
              >
                {habit.isCompletedToday && (
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                )}
              </div>

              {/* Name */}
              <span className={`text-sm flex-1 truncate transition-colors ${
                habit.isCompletedToday ? "text-muted-foreground line-through" : "text-foreground"
              }`}>
                {habit.name}
              </span>

              {/* Streak */}
              {habit.currentStreak > 0 && (
                <span className="text-[10px] text-muted-foreground tabular-nums shrink-0">
                  {habit.currentStreak}d
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
