"use client";

import Link from "next/link";
import type { DashboardData } from "./DashboardShell";

interface Props {
  journal: DashboardData["journal"] | null;
  loading: boolean;
}

const MOOD_EMOJI: Record<number, string> = {
  1: "😞", 2: "😕", 3: "😐", 4: "😊", 5: "😄",
};

const DAYS_SHORT = ["Ma", "Di", "Wo", "Do", "Vr", "Za", "Zo"];

function getDayLabel(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  const day = d.getDay();
  return DAYS_SHORT[day === 0 ? 6 : day - 1];
}

export default function MoodSparkline({ journal, loading }: Props) {
  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-card p-5 animate-fade-in opacity-0 stagger-4 card-gradient">
        <div className="h-4 w-36 bg-border rounded animate-pulse mb-4" />
        <div className="flex gap-3 items-end">
          {[1, 2, 3, 4, 5, 6, 7].map((i) => (
            <div key={i} className="flex-1 space-y-1">
              <div className="bg-border rounded animate-pulse" style={{ height: `${20 + i * 6}px` }} />
              <div className="h-2.5 bg-border rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const data = journal?.last7Days ?? [];
  const today = data[data.length - 1]?.date;
  const isToday = (d: string) => d === today;

  return (
    <div className="rounded-xl border border-border bg-card p-5 animate-fade-in opacity-0 stagger-4 card-gradient">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Stemming & Energie
          </h3>
          {journal && journal.currentStreak > 0 && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent/10 text-accent font-medium">
              {journal.currentStreak}d streak
            </span>
          )}
        </div>
        <Link href="/journal" className="text-xs text-accent hover:underline">
          Journal
        </Link>
      </div>

      {/* Mood bars */}
      <div className="flex gap-2 items-end mb-3" style={{ height: 80 }}>
        {data.map((day) => {
          const moodHeight = day.mood ? (day.mood / 5) * 100 : 0;
          const hasData = day.mood !== null;

          return (
            <div key={day.date} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
              {hasData ? (
                <div
                  className="w-full rounded-t-md transition-all duration-300"
                  style={{
                    height: `${moodHeight}%`,
                    backgroundColor: isToday(day.date) ? "var(--accent)" : "var(--accent)",
                    opacity: isToday(day.date) ? 1 : 0.4,
                  }}
                />
              ) : (
                <div className="w-full h-1 rounded-full bg-border mt-auto" />
              )}
            </div>
          );
        })}
      </div>

      {/* Energy dots */}
      <div className="flex gap-2 mb-2">
        {data.map((day) => (
          <div key={day.date} className="flex-1 flex justify-center">
            {day.energy ? (
              <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map((level) => (
                  <div
                    key={level}
                    className={`w-1 h-1 rounded-full ${
                      level <= (day.energy ?? 0)
                        ? "bg-positive"
                        : "bg-border"
                    }`}
                  />
                ))}
              </div>
            ) : (
              <div className="w-1 h-1 rounded-full bg-border" />
            )}
          </div>
        ))}
      </div>

      {/* Day labels */}
      <div className="flex gap-2">
        {data.map((day) => (
          <div key={day.date} className="flex-1 text-center">
            <span className={`text-[10px] ${
              isToday(day.date) ? "text-accent font-medium" : "text-muted-foreground"
            }`}>
              {isToday(day.date) ? "Nu" : getDayLabel(day.date)}
            </span>
          </div>
        ))}
      </div>

      {/* Today's mood summary or CTA */}
      {journal && !journal.hasEntryToday && (
        <Link
          href="/journal"
          className="block mt-4 text-center text-xs text-accent hover:underline py-2 rounded-lg bg-accent/5"
        >
          Hoe gaat het vandaag? Schrijf je journal →
        </Link>
      )}
      {journal?.todayMood && (
        <div className="mt-3 flex items-center justify-center gap-2 text-sm">
          <span className="text-lg">{MOOD_EMOJI[journal.todayMood]}</span>
          <span className="text-muted-foreground text-xs">
            Energie {journal.todayEnergy ?? "–"}/5
          </span>
        </div>
      )}
    </div>
  );
}
