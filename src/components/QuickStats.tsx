"use client";

import type { DashboardData } from "@/components/dashboard/DashboardShell";

interface QuickStatsProps {
  data: DashboardData | null;
  loading: boolean;
}

const MOOD_EMOJI: Record<number, string> = {
  1: "😞",
  2: "😕",
  3: "😐",
  4: "😊",
  5: "😄",
};

export default function QuickStats({ data, loading }: QuickStatsProps) {
  const items = [
    {
      label: "Taken vandaag",
      value: data?.tasks.todayCount ?? 0,
      sub: !data ? "Laden..." : data.tasks.todayCount === 0 ? "Geen taken" : `${data.tasks.todayCount} gepland`,
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
        </svg>
      ),
    },
    {
      label: "Events vandaag",
      value: data?.events.todayCount ?? 0,
      sub: !data ? "Laden..." : data.events.todayCount === 0 ? "Geen events" : `${data.events.todayCount} gepland`,
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
        </svg>
      ),
    },
    {
      label: "Habits",
      value: data ? `${data.habits.completedToday}/${data.habits.totalActive}` : "–",
      sub: !data ? "Laden..." : data.habits.totalActive === 0 ? "Geen habits" : `${data.habits.completedToday} voltooid`,
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 0 0 6 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0 1 18 16.5h-2.25m-7.5 0h7.5m-7.5 0-1 3m8.5-3 1 3m0 0 .5 1.5m-.5-1.5h-9.5m0 0-.5 1.5M9 11.25v1.5M12 9v3.75m3-6v6" />
        </svg>
      ),
      isString: true,
    },
    {
      label: "Stemming",
      value: data?.journal.todayMood ? MOOD_EMOJI[data.journal.todayMood] : "–",
      sub: !data ? "Laden..." : data.journal.hasEntryToday
        ? `Energie: ${data.journal.todayEnergy ?? "–"}/5`
        : "Nog niet ingevuld",
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.182 15.182a4.5 4.5 0 0 1-6.364 0M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75Zm-.375 0h.008v.015h-.008V9.75Zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75Zm-.375 0h.008v.015h-.008V9.75Z" />
        </svg>
      ),
      isString: true,
    },
    {
      label: "Budget",
      value: data ? formatEuro(data.finance.readyToAssign) : "–",
      sub: !data ? "Laden..." : "Te verdelen",
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z" />
        </svg>
      ),
      isString: true,
      isPositive: data ? data.finance.readyToAssign >= 0 : true,
    },
    {
      label: "Verlopen",
      value: data?.tasks.overdueCount ?? 0,
      sub: !data ? "Laden..." : data.tasks.overdueCount === 0 ? "Alles op schema" : `${data.tasks.overdueCount} verlopen`,
      isNegative: true,
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {items.map((stat, i) => {
        const numValue = typeof stat.value === "number" ? stat.value : 0;
        return (
          <div
            key={stat.label}
            className={`relative rounded-xl bg-card border border-border p-4 transition-all duration-200 animate-fade-in opacity-0 stagger-${i + 1} card-gradient`}
          >
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-muted-foreground">{stat.icon}</span>
                <span className="text-xs font-medium text-muted-foreground">
                  {stat.label}
                </span>
              </div>
              <p className={`text-2xl lg:text-3xl font-bold tabular-nums leading-none ${
                loading ? "text-muted-foreground" :
                (stat.isNegative && numValue > 0) ? "text-negative" :
                (stat.isPositive === false) ? "text-negative" :
                "text-foreground"
              }`}>
                {loading ? "–" : stat.value}
              </p>
              <p className="text-[11px] text-muted-foreground mt-1.5 truncate">
                {loading ? "Laden..." : stat.sub}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function formatEuro(cents: number): string {
  const abs = Math.abs(cents);
  const euros = Math.floor(abs / 100);
  const rest = abs % 100;
  const sign = cents < 0 ? "-" : "";
  return `${sign}\u20AC${euros},${String(rest).padStart(2, "0")}`;
}
