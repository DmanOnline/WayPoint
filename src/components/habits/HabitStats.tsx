"use client";

import { Habit, HabitCompletion } from "@/lib/types/habits";
import { calculateStreak, calculateCompletionRate, getTodaysHabits, getCompletionsMap } from "@/lib/habits";

interface HabitStatsProps {
  habits: Habit[];
  allCompletions: HabitCompletion[];
}

export default function HabitStats({ habits, allCompletions }: HabitStatsProps) {
  const today = new Date();
  const todaysHabits = getTodaysHabits(habits, today);
  const todayMap = getCompletionsMap(allCompletions, today);
  const todayDone = todaysHabits.filter((h) => todayMap.has(h.id)).length;
  const todayTotal = todaysHabits.length;
  const todayPerc = todayTotal > 0 ? Math.round((todayDone / todayTotal) * 100) : 0;

  // Best streaks across all habits
  const streaks = habits.map((h) => ({
    habit: h,
    streak: calculateStreak(h.completions || [], h),
  }));
  const bestCurrent = streaks.reduce((max, s) => Math.max(max, s.streak.current), 0);
  const bestLongest = streaks.reduce((max, s) => Math.max(max, s.streak.longest), 0);

  // Week completion rate
  const weekRate = habits.length > 0
    ? Math.round(
        habits.reduce((sum, h) => sum + calculateCompletionRate(h.completions || [], h, 7), 0) / habits.length
      )
    : 0;

  // Month completion rate
  const monthRate = habits.length > 0
    ? Math.round(
        habits.reduce((sum, h) => sum + calculateCompletionRate(h.completions || [], h, 30), 0) / habits.length
      )
    : 0;

  const circumference = 2 * Math.PI * 36;
  const offset = circumference - (todayPerc / 100) * circumference;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
      {/* Today progress ring */}
      <div className="col-span-2 md:col-span-1 rounded-2xl border border-border bg-card/60 p-4 flex flex-col items-center">
        <div className="relative w-20 h-20 mb-2">
          <svg viewBox="0 0 80 80" className="w-full h-full -rotate-90">
            <circle
              cx="40"
              cy="40"
              r="36"
              fill="none"
              stroke="var(--border)"
              strokeWidth="5"
            />
            <circle
              cx="40"
              cy="40"
              r="36"
              fill="none"
              stroke="var(--accent)"
              strokeWidth="5"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              className="transition-all duration-1000 ease-out"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-lg font-bold text-foreground">{todayPerc}%</span>
          </div>
        </div>
        <span className="text-xs text-muted-foreground">Vandaag</span>
        <span className="text-sm font-medium text-foreground">{todayDone}/{todayTotal}</span>
      </div>

      {/* Current streak */}
      <div className="rounded-2xl border border-border bg-card/60 p-4 flex flex-col items-center justify-center">
        <div className="flex items-center gap-1.5 mb-1">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-orange-400">
            <path
              d="M12 2C12 2 4 8 4 14a8 8 0 0 0 16 0c0-6-8-12-8-12z"
              fill="currentColor"
            />
          </svg>
          <span className="text-2xl font-bold text-foreground">{bestCurrent}</span>
        </div>
        <span className="text-xs text-muted-foreground">Huidige streak</span>
        <span className="text-xs text-muted-foreground/60">dagen</span>
      </div>

      {/* Longest streak */}
      <div className="rounded-2xl border border-border bg-card/60 p-4 flex flex-col items-center justify-center">
        <div className="flex items-center gap-1.5 mb-1">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-yellow-400">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="currentColor" />
          </svg>
          <span className="text-2xl font-bold text-foreground">{bestLongest}</span>
        </div>
        <span className="text-xs text-muted-foreground">Langste streak</span>
        <span className="text-xs text-muted-foreground/60">dagen</span>
      </div>

      {/* Week + Month rates */}
      <div className="rounded-2xl border border-border bg-card/60 p-4 flex flex-col items-center justify-center gap-2">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 rounded-full bg-border overflow-hidden" style={{ width: 60 }}>
              <div
                className="h-full rounded-full bg-accent transition-all duration-500"
                style={{ width: `${weekRate}%` }}
              />
            </div>
            <span className="text-sm font-semibold text-foreground">{weekRate}%</span>
          </div>
          <span className="text-xs text-muted-foreground">Deze week</span>
        </div>
        <div>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 rounded-full bg-border overflow-hidden" style={{ width: 60 }}>
              <div
                className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                style={{ width: `${monthRate}%` }}
              />
            </div>
            <span className="text-sm font-semibold text-foreground">{monthRate}%</span>
          </div>
          <span className="text-xs text-muted-foreground">Deze maand</span>
        </div>
      </div>
    </div>
  );
}
