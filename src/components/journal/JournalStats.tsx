"use client";

import { useMemo } from "react";
import { JournalEntry, MOODS, ENERGY_LEVELS, getMood, getEnergy } from "@/lib/types/journal";

interface JournalStatsProps {
  entries: JournalEntry[];
}

export default function JournalStats({ entries }: JournalStatsProps) {
  const stats = useMemo(() => {
    const total = entries.length;
    const today = new Date();

    const withMood = entries.filter((e) => e.mood !== null);
    const avgMood = withMood.length
      ? withMood.reduce((sum, e) => sum + (e.mood ?? 0), 0) / withMood.length
      : null;

    const withEnergy = entries.filter((e) => e.energy !== null);
    const avgEnergy = withEnergy.length
      ? withEnergy.reduce((sum, e) => sum + (e.energy ?? 0), 0) / withEnergy.length
      : null;

    // Mood distribution
    const moodDist = MOODS.map((m) => ({
      ...m,
      count: entries.filter((e) => e.mood === m.value).length,
    }));

    // Energy distribution
    const energyDist = ENERGY_LEVELS.map((e) => ({
      ...e,
      count: entries.filter((en) => en.energy === e.value).length,
    }));

    // Streak
    const dateSet = new Set(entries.map((e) => new Date(e.date).toDateString()));
    let streak = 0;
    const check = new Date(today);
    for (let i = 0; i < 365; i++) {
      if (dateSet.has(check.toDateString())) {
        streak++;
        check.setDate(check.getDate() - 1);
      } else {
        break;
      }
    }

    // Tags frequency
    const tagCounts = new Map<string, number>();
    for (const e of entries) {
      for (const tag of e.tags ?? []) {
        tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
      }
    }
    const topTags = [...tagCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);

    // Last 30 days mood + energy sparkline
    const last30: { mood: number | null; energy: number | null }[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const e = entries.find((en) => new Date(en.date).toDateString() === d.toDateString());
      last30.push({ mood: e?.mood ?? null, energy: e?.energy ?? null });
    }

    return { total, avgMood, avgEnergy, moodDist, energyDist, streak, topTags, last30 };
  }, [entries]);

  const avgMoodConfig = stats.avgMood ? getMood(Math.round(stats.avgMood)) : null;
  const avgEnergyConfig = stats.avgEnergy ? getEnergy(Math.round(stats.avgEnergy)) : null;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Totaal entries" value={String(stats.total)} />
        <StatCard label="Huidige streak" value={`🔥 ${stats.streak} dag${stats.streak !== 1 ? "en" : ""}`} />
        <StatCard
          label="Gem. stemming"
          value={avgMoodConfig ? `${avgMoodConfig.emoji} ${avgMoodConfig.label}` : "–"}
        />
        <StatCard
          label="Gem. energie"
          value={avgEnergyConfig ? `${avgEnergyConfig.icon} ${avgEnergyConfig.label}` : "–"}
        />
      </div>

      {/* Last 30 days sparkline — mood + energie */}
      <div className="bg-surface border border-border rounded-xl p-5">
        <h3 className="text-sm font-semibold text-foreground mb-1">Afgelopen 30 dagen</h3>
        <p className="text-xs text-muted-foreground mb-4">Stemming (boven) en energie (onder)</p>
        <div className="space-y-1">
          {/* Mood bars */}
          <div className="flex items-end gap-0.5 h-12">
            {stats.last30.map(({ mood }, i) => {
              const cfg = mood ? getMood(mood) : null;
              return (
                <div key={i} className="flex-1 rounded-sm min-w-0 transition-all"
                  style={{
                    height: mood ? `${(mood / 5) * 100}%` : "6%",
                    backgroundColor: cfg?.color ?? "var(--border)",
                    opacity: mood ? 1 : 0.2,
                  }}
                  title={cfg?.label ?? "Geen entry"}
                />
              );
            })}
          </div>
          {/* Energy bars */}
          <div className="flex items-end gap-0.5 h-8">
            {stats.last30.map(({ energy }, i) => {
              const cfg = energy ? getEnergy(energy) : null;
              return (
                <div key={i} className="flex-1 rounded-sm min-w-0 transition-all"
                  style={{
                    height: energy ? `${(energy / 5) * 100}%` : "6%",
                    backgroundColor: cfg?.color ?? "var(--border)",
                    opacity: energy ? 0.7 : 0.15,
                  }}
                  title={cfg?.label ?? "Geen energie"}
                />
              );
            })}
          </div>
        </div>
        <div className="flex justify-between mt-2">
          <span className="text-[10px] text-muted-foreground">30 dagen geleden</span>
          <span className="text-[10px] text-muted-foreground">Vandaag</span>
        </div>
      </div>

      {/* Mood + Energie distribution side by side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-surface border border-border rounded-xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Stemming verdeling</h3>
          <div className="space-y-2.5">
            {stats.moodDist.map((m) => {
              const pct = stats.total > 0 ? (m.count / stats.total) * 100 : 0;
              return (
                <div key={m.value} className="flex items-center gap-3">
                  <span className="text-base w-5 text-center">{m.emoji}</span>
                  <span className="text-xs text-muted-foreground w-10">{m.label}</span>
                  <div className="flex-1 h-1.5 rounded-full bg-border overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${pct}%`, backgroundColor: m.color }} />
                  </div>
                  <span className="text-xs text-muted-foreground w-4 text-right">{m.count}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-surface border border-border rounded-xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Energie verdeling</h3>
          <div className="space-y-2.5">
            {stats.energyDist.map((e) => {
              const pct = stats.total > 0 ? (e.count / stats.total) * 100 : 0;
              return (
                <div key={e.value} className="flex items-center gap-3">
                  <span className="text-base w-5 text-center">{e.icon}</span>
                  <span className="text-xs text-muted-foreground w-10">{e.label}</span>
                  <div className="flex-1 h-1.5 rounded-full bg-border overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${pct}%`, backgroundColor: e.color }} />
                  </div>
                  <span className="text-xs text-muted-foreground w-4 text-right">{e.count}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Top tags */}
      {stats.topTags.length > 0 && (
        <div className="bg-surface border border-border rounded-xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-3">Veelgebruikte tags</h3>
          <div className="flex flex-wrap gap-2">
            {stats.topTags.map(([tag, count]) => (
              <span key={tag} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs bg-accent/10 text-accent">
                #{tag}
                <span className="text-accent/60">{count}</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-surface border border-border rounded-xl p-4">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className="text-lg font-bold text-foreground">{value}</p>
    </div>
  );
}
