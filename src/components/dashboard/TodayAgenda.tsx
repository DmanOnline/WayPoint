"use client";

import Link from "next/link";
import type { DashboardData } from "./DashboardShell";

interface Props {
  events: DashboardData["events"] | null;
  tasks: DashboardData["tasks"] | null;
  tomorrow: string | null;
  tomorrowAgenda: DashboardData["tomorrowAgenda"] | null;
  loading: boolean;
}

interface AgendaItem {
  id: string;
  title: string;
  time: string | null;
  isAllDay: boolean;
  color: string;
  type: "event" | "task";
  priority?: string;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function buildItems(
  events: Array<{ id: string; title: string; startDate: string; isAllDay: boolean; color: string }> | undefined,
  taskItems: Array<{ id: string; title: string; scheduledTime: string | null; project: { color: string } | null; priority: string }> | undefined
): AgendaItem[] {
  const items: AgendaItem[] = [];
  if (events) {
    for (const e of events) {
      items.push({
        id: e.id,
        title: e.title,
        time: e.isAllDay ? null : formatTime(e.startDate),
        isAllDay: e.isAllDay,
        color: e.color,
        type: "event",
      });
    }
  }
  if (taskItems) {
    for (const t of taskItems) {
      items.push({
        id: t.id,
        title: t.title,
        time: t.scheduledTime ?? null,
        isAllDay: !t.scheduledTime,
        color: t.project?.color ?? "#06B6D4",
        type: "task",
        priority: t.priority,
      });
    }
  }
  return items;
}

export default function TodayAgenda({ events, tasks, tomorrow, tomorrowAgenda, loading }: Props) {
  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-card p-5 animate-fade-in opacity-0 stagger-3 card-gradient">
        <div className="h-4 w-32 bg-border rounded animate-pulse mb-4" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex gap-3">
              <div className="w-1 rounded-full bg-border" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 w-3/4 bg-border rounded animate-pulse" />
                <div className="h-2.5 w-1/3 bg-border rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Determine whether to show tomorrow's agenda
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const isPastEvening = now.getHours() >= 18;

  const todayItems = buildItems(events?.items, tasks?.todayItems);
  const todayTimed = todayItems.filter((i) => !i.isAllDay);

  // Any timed item that still lies in the future (after now)?
  const hasRemainingItems = todayTimed.some((item) => {
    if (!item.time) return false;
    const [h, m] = item.time.split(":").map(Number);
    return h * 60 + m > nowMinutes;
  });

  const showTomorrow = isPastEvening && !hasRemainingItems && !!tomorrowAgenda;

  const items = showTomorrow
    ? buildItems(tomorrowAgenda!.events, tomorrowAgenda!.tasks)
    : todayItems;

  const allDay = items.filter((i) => i.isAllDay);
  const timed = items
    .filter((i) => !i.isAllDay)
    .sort((a, b) => (a.time ?? "").localeCompare(b.time ?? ""));

  const label = showTomorrow && tomorrow
    ? (() => {
        const d = new Date(tomorrow + "T12:00:00");
        const weekday = d.toLocaleDateString("nl-NL", { weekday: "long" });
        return weekday.charAt(0).toUpperCase() + weekday.slice(1);
      })()
    : "Vandaag";

  return (
    <div className="rounded-xl border border-border bg-card p-5 animate-fade-in opacity-0 stagger-3 card-gradient">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            {label}
          </h3>
          {showTomorrow && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-accent/10 text-accent font-medium">
              morgen
            </span>
          )}
        </div>
        <Link href="/calendar" className="text-xs text-accent hover:underline">
          Kalender
        </Link>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">
          {showTomorrow ? "Niets gepland voor morgen" : "Geen events of taken vandaag"}
        </p>
      ) : (
        <div className="space-y-1">
          {/* All-day items */}
          {allDay.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3 pb-3 border-b border-border">
              {allDay.map((item) => (
                <span
                  key={item.id}
                  className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-surface"
                >
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="truncate max-w-[200px]">
                    {item.type === "task" && "✓ "}{item.title}
                  </span>
                </span>
              ))}
            </div>
          )}

          {/* Timed items */}
          {timed.map((item, idx) => {
            const itemMinutes = item.time
              ? parseInt(item.time.split(":")[0]) * 60 + parseInt(item.time.split(":")[1])
              : 0;
            const nextItem = timed[idx + 1];
            const nextMinutes = nextItem?.time
              ? parseInt(nextItem.time.split(":")[0]) * 60 + parseInt(nextItem.time.split(":")[1])
              : 1440;

            // "nu" lijn alleen bij vandaag
            const showNowLine = !showTomorrow &&
              nowMinutes >= itemMinutes &&
              nowMinutes < nextMinutes;

            return (
              <div key={item.id}>
                <div className="flex items-start gap-3 py-1.5">
                  <span className="text-xs text-muted-foreground tabular-nums w-10 shrink-0 pt-0.5">
                    {item.time}
                  </span>
                  <div
                    className="w-0.5 self-stretch rounded-full shrink-0 min-h-[20px]"
                    style={{ backgroundColor: item.color }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground truncate">
                      {item.type === "task" && (
                        <span className="text-muted-foreground mr-1">✓</span>
                      )}
                      {item.title}
                    </p>
                    {item.priority && item.priority !== "medium" && (
                      <span className={`text-[10px] ${
                        item.priority === "high" ? "text-negative" : "text-muted-foreground"
                      }`}>
                        {item.priority === "high" ? "Hoog" : "Laag"}
                      </span>
                    )}
                  </div>
                </div>
                {showNowLine && (
                  <div className="flex items-center gap-2 py-1">
                    <span className="text-[10px] text-accent font-medium w-10 text-right">nu</span>
                    <div className="flex-1 h-px bg-accent" />
                    <div className="w-1.5 h-1.5 rounded-full bg-accent" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
