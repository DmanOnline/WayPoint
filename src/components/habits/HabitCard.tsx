"use client";

import { useState, useRef } from "react";
import { Habit, HabitCompletion } from "@/lib/types/habits";
import { formatFrequency, calculateStreak, getDailyTarget, isHabitFullyCompleted, getCustomPeriodProgress } from "@/lib/habits";

interface HabitCardProps {
  habit: Habit;
  isCompleted: boolean;
  completion?: HabitCompletion;
  onToggle: (habitId: string) => void;
  onClick: (habit: Habit) => void;
  locked?: boolean;
}

export default function HabitCard({
  habit,
  isCompleted,
  completion,
  onToggle,
  onClick,
  locked = false,
}: HabitCardProps) {
  const [completing, setCompleting] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const streak = calculateStreak(habit.completions || [], habit);
  const freqLabel = formatFrequency(habit);

  const dailyTarget = getDailyTarget(habit);
  const isMultiDaily = dailyTarget > 1;
  const currentCount = completion?.count || 0;
  const fullyDone = isHabitFullyCompleted(habit, completion);

  // Period progress for non-daily custom habits
  const periodProgress = habit.frequencyType === "custom" && habit.frequencyPeriod !== "day"
    ? getCustomPeriodProgress(habit, habit.completions || [])
    : null;

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (locked) return;

    if (isMultiDaily) {
      // Multi-daily: always increment (API handles max)
      // If fully done, clicking resets (DELETE)
      if (fullyDone) {
        onToggle(habit.id);
        return;
      }
      setCompleting(true);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        onToggle(habit.id);
        setCompleting(false);
      }, 300);
      return;
    }

    // Single-daily: simple toggle
    if (isCompleted) {
      onToggle(habit.id);
      return;
    }

    setCompleting(true);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      onToggle(habit.id);
      setCompleting(false);
    }, 600);
  };

  const showDone = isMultiDaily ? fullyDone : isCompleted;

  return (
    <div
      className={`group flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-surface-hover/50 transition-all cursor-pointer ${
        showDone ? "opacity-60" : ""
      } ${completing ? "animate-habit-celebrate" : ""} ${locked ? "opacity-40 cursor-not-allowed" : ""}`}
      onClick={() => !locked && onClick(habit)}
    >
      {/* Checkbox / Counter */}
      {isMultiDaily ? (
        <button
          onClick={handleToggle}
          disabled={locked}
          className={`shrink-0 w-8 h-8 rounded-lg border-2 flex items-center justify-center transition-all duration-200 text-xs font-bold ${
            fullyDone
              ? "border-transparent text-white"
              : currentCount > 0
              ? "border-transparent text-white"
              : "border-muted-foreground/30 text-muted-foreground hover:border-muted-foreground/60"
          } ${locked ? "cursor-not-allowed" : ""}`}
          style={
            currentCount > 0
              ? { backgroundColor: habit.color, borderColor: habit.color, opacity: fullyDone ? 1 : 0.6 + (currentCount / dailyTarget) * 0.4 }
              : undefined
          }
        >
          {fullyDone ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          ) : (
            <span>{currentCount}/{dailyTarget}</span>
          )}
        </button>
      ) : (
        <button
          onClick={handleToggle}
          disabled={locked}
          className={`shrink-0 w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all duration-200 ${
            showDone
              ? "border-transparent"
              : completing
              ? "border-transparent animate-checkbox-pop"
              : "border-muted-foreground/30 hover:border-muted-foreground/60"
          } ${locked ? "cursor-not-allowed" : ""}`}
          style={
            showDone || completing
              ? { backgroundColor: habit.color, borderColor: habit.color }
              : undefined
          }
        >
          {(showDone || completing) && (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          )}
        </button>
      )}

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          {habit.icon && <span className="text-sm">{habit.icon}</span>}
          <span
            className={`text-sm font-medium ${
              showDone
                ? "line-through text-muted-foreground"
                : "text-foreground"
            }`}
          >
            {habit.name}
          </span>
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-muted-foreground">{freqLabel}</span>
          {periodProgress && periodProgress.target > 0 && (
            <span className="text-xs text-muted-foreground">
              ({periodProgress.done}/{periodProgress.target})
            </span>
          )}
        </div>
      </div>

      {/* Streak */}
      {streak.current > 0 && (
        <div className="shrink-0 flex items-center gap-1 px-2 py-1 rounded-lg bg-orange-500/10">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className="text-orange-400">
            <path
              d="M12 2C12 2 4 8 4 14a8 8 0 0 0 16 0c0-6-8-12-8-12z"
              fill="currentColor"
              opacity="0.9"
            />
          </svg>
          <span className="text-xs font-semibold text-orange-400">{streak.current}</span>
        </div>
      )}

      {/* Category dot */}
      {habit.category && (
        <span
          className="shrink-0 w-2 h-2 rounded-full"
          style={{ backgroundColor: habit.category.color }}
        />
      )}

      {/* Lock icon for future dates */}
      {locked && (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 text-muted-foreground/40">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      )}
    </div>
  );
}
