"use client";

import { useMemo } from "react";
import { JournalEntry, getMood, toDateStr } from "@/lib/types/journal";

export type JournalNav = "today" | "all" | "stats";

interface JournalSidebarProps {
  entries: JournalEntry[];
  activeNav: JournalNav;
  selectedDate: Date;
  onSelectNav: (nav: JournalNav) => void;
  onSelectDate: (date: Date) => void;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

const MONTH_NAMES = [
  "januari", "februari", "maart", "april", "mei", "juni",
  "juli", "augustus", "september", "oktober", "november", "december",
];
const DAY_NAMES = ["ma", "di", "wo", "do", "vr", "za", "zo"];

function getMonthDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  // Monday-first week offset
  const startOffset = (firstDay.getDay() + 6) % 7;
  const days: (Date | null)[] = Array(startOffset).fill(null);
  for (let d = 1; d <= lastDay.getDate(); d++) {
    days.push(new Date(year, month, d));
  }
  return days;
}

export default function JournalSidebar({
  entries,
  activeNav,
  selectedDate,
  onSelectNav,
  onSelectDate,
  mobileOpen = false,
  onMobileClose,
}: JournalSidebarProps) {
  const today = new Date();
  const calendarYear = selectedDate.getFullYear();
  const calendarMonth = selectedDate.getMonth();

  // Map dateStr → entry for quick lookup
  const entriesByDate = useMemo(() => {
    const map = new Map<string, JournalEntry>();
    for (const e of entries) {
      const d = new Date(e.date);
      map.set(toDateStr(d), e);
    }
    return map;
  }, [entries]);

  const monthDays = getMonthDays(calendarYear, calendarMonth);
  const selectedDateStr = toDateStr(selectedDate);
  const todayStr = toDateStr(today);

  const navItems: { nav: JournalNav; label: string; icon: React.ReactNode }[] = [
    {
      nav: "today",
      label: "Vandaag",
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
        </svg>
      ),
    },
    {
      nav: "all",
      label: "Alle entries",
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0ZM3.75 12h.007v.008H3.75V12Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm-.375 5.25h.007v.008H3.75v-.008Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
        </svg>
      ),
    },
    {
      nav: "stats",
      label: "Statistieken",
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
        </svg>
      ),
    },
  ];

  const sidebarContent = (
    <div className="h-full flex flex-col">
      {/* Nav */}
      <nav className="px-3 pt-4 pb-2 space-y-0.5">
        {navItems.map(({ nav, label, icon }) => (
          <button
            key={nav}
            onClick={() => { onSelectNav(nav); onMobileClose?.(); }}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeNav === nav
                ? "bg-accent/10 text-accent"
                : "text-muted-foreground hover:text-foreground hover:bg-surface-hover"
            }`}
          >
            {icon}
            {label}
          </button>
        ))}
      </nav>

      <div className="border-t border-border mx-3 my-2" />

      {/* Mini calendar */}
      <div className="px-3 pb-4">
        {/* Month header */}
        <div className="flex items-center justify-between mb-2">
          <button
            onClick={() => {
              const d = new Date(calendarYear, calendarMonth - 1, 1);
              onSelectDate(d);
            }}
            className="p-1 rounded hover:bg-surface-hover text-muted-foreground transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
            </svg>
          </button>
          <span className="text-xs font-semibold text-foreground/80 capitalize">
            {MONTH_NAMES[calendarMonth]} {calendarYear}
          </span>
          <button
            onClick={() => {
              const d = new Date(calendarYear, calendarMonth + 1, 1);
              onSelectDate(d);
            }}
            className="p-1 rounded hover:bg-surface-hover text-muted-foreground transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
            </svg>
          </button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 mb-1">
          {DAY_NAMES.map((d) => (
            <div key={d} className="text-center text-[9px] text-muted-foreground font-medium py-0.5">
              {d}
            </div>
          ))}
        </div>

        {/* Days */}
        <div className="grid grid-cols-7 gap-y-0.5">
          {monthDays.map((day, i) => {
            if (!day) return <div key={`empty-${i}`} />;
            const dayStr = toDateStr(day);
            const entry = entriesByDate.get(dayStr);
            const mood = entry ? getMood(entry.mood) : null;
            const isSelected = dayStr === selectedDateStr;
            const isToday = dayStr === todayStr;
            const isFuture = day > today;

            return (
              <button
                key={dayStr}
                onClick={() => { onSelectDate(day); onSelectNav("today"); onMobileClose?.(); }}
                disabled={isFuture}
                className={`relative flex flex-col items-center justify-center w-full aspect-square rounded text-[11px] font-medium transition-all ${
                  isSelected
                    ? "bg-accent text-white"
                    : isToday
                    ? "ring-1 ring-accent text-accent"
                    : isFuture
                    ? "text-muted-foreground/30 cursor-not-allowed"
                    : "hover:bg-surface-hover text-foreground/70"
                }`}
              >
                {day.getDate()}
                {entry && !isSelected && (
                  <span
                    className="absolute bottom-0.5 w-1 h-1 rounded-full"
                    style={{ backgroundColor: mood?.color ?? "var(--accent)" }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Recent entries */}
      {entries.length > 0 && (
        <>
          <div className="border-t border-border mx-3 mb-2" />
          <div className="px-3 pb-4 flex-1 overflow-y-auto min-h-0">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">
              Recent
            </p>
            <div className="space-y-0.5">
              {entries.slice(0, 10).map((entry) => {
                const d = new Date(entry.date);
                const dStr = toDateStr(d);
                const mood = getMood(entry.mood);
                const isActive = dStr === selectedDateStr;
                return (
                  <button
                    key={entry.id}
                    onClick={() => { onSelectDate(d); onSelectNav("today"); onMobileClose?.(); }}
                    className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left transition-colors ${
                      isActive
                        ? "bg-accent/10 text-accent"
                        : "hover:bg-surface-hover text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {mood ? (
                      <span className="text-base leading-none">{mood.emoji}</span>
                    ) : (
                      <span className="w-4 h-4 rounded-full bg-border flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">
                        {entry.title || formatDate(d)}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {formatDate(d)}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );

  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={onMobileClose}
        />
      )}
      <aside
        className={`w-[240px] h-full border-r border-border bg-sidebar-bg flex-col overflow-hidden ${
          mobileOpen ? "flex fixed inset-y-0 left-0 z-50" : "hidden"
        } md:flex md:relative md:inset-auto`}
      >
        {sidebarContent}
      </aside>
    </>
  );
}

function formatDate(d: Date): string {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (toDateStr(d) === toDateStr(today)) return "Vandaag";
  if (toDateStr(d) === toDateStr(yesterday)) return "Gisteren";

  return `${d.getDate()} ${MONTH_NAMES[d.getMonth()]}`;
}
