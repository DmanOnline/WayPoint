"use client";

import { useEffect, useState } from "react";

interface TaskData {
  id: string;
  status: string;
  scheduledDate: string | null;
  dueDate: string | null;
}

interface EventData {
  id: string;
  startDate: string;
  _isTask?: boolean;
}

interface Stats {
  tasksToday: number;
  eventsToday: number;
  completedTasks: number;
  overdueTasks: number;
}

function todayStr(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = (d.getMonth() + 1).toString().padStart(2, "0");
  const day = d.getDate().toString().padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function QuickStats() {
  const [stats, setStats] = useState<Stats>({
    tasksToday: 0,
    eventsToday: 0,
    completedTasks: 0,
    overdueTasks: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const today = todayStr();

        const [tasksRes, completedRes, eventsRes] = await Promise.all([
          fetch("/api/tasks?status=todo"),
          fetch("/api/tasks?status=done"),
          fetch(`/api/calendar/events?start=${today}T00:00:00&end=${today}T23:59:59`),
        ]);

        let tasksToday = 0;
        let overdueTasks = 0;
        let completedTasks = 0;
        let eventsToday = 0;

        if (tasksRes.ok) {
          const data = await tasksRes.json();
          const tasks: TaskData[] = data.tasks || [];
          for (const task of tasks) {
            const scheduled = task.scheduledDate
              ? task.scheduledDate.substring(0, 10)
              : null;
            const due = task.dueDate
              ? task.dueDate.substring(0, 10)
              : null;

            if (scheduled === today || due === today) {
              tasksToday++;
            }
            if (due && due < today) {
              overdueTasks++;
            }
          }
        }

        if (completedRes.ok) {
          const data = await completedRes.json();
          completedTasks = (data.tasks || []).length;
        }

        if (eventsRes.ok) {
          const data = await eventsRes.json();
          const events: EventData[] = data.events || [];
          eventsToday = events.filter((e) => !e._isTask).length;
        }

        setStats({ tasksToday, eventsToday, completedTasks, overdueTasks });
      } catch (err) {
        console.error("QuickStats fetch error:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, []);

  const items = [
    {
      label: "Taken vandaag",
      value: stats.tasksToday,
      change: stats.tasksToday === 0 ? "Geen taken" : stats.tasksToday === 1 ? "1 taak gepland" : `${stats.tasksToday} taken gepland`,
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
        </svg>
      ),
    },
    {
      label: "Events vandaag",
      value: stats.eventsToday,
      change: stats.eventsToday === 0 ? "Geen events" : stats.eventsToday === 1 ? "1 event gepland" : `${stats.eventsToday} events gepland`,
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
        </svg>
      ),
    },
    {
      label: "Voltooid",
      value: stats.completedTasks,
      change: stats.completedTasks === 0 ? "Nog geen taken" : `${stats.completedTasks} taken afgerond`,
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" />
        </svg>
      ),
    },
    {
      label: "Verlopen",
      value: stats.overdueTasks,
      change: stats.overdueTasks === 0 ? "Alles op schema" : `${stats.overdueTasks} verlopen`,
      isNegative: true,
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {items.map((stat, i) => (
        <div
          key={stat.label}
          className={`rounded-xl bg-card border border-border p-4 transition-colors duration-200 animate-fade-in opacity-0 stagger-${i + 1}`}
        >
          <div className="flex items-center gap-2 mb-2">
            <span className="text-muted-foreground">{stat.icon}</span>
            <span className="text-xs font-medium text-muted-foreground">
              {stat.label}
            </span>
          </div>
          <p className={`text-3xl font-bold tabular-nums leading-none ${
            loading ? "text-muted-foreground" :
            (stat.isNegative && stat.value > 0) ? "text-negative" : "text-foreground"
          }`}>
            {loading ? "–" : stat.value}
          </p>
          <p className="text-[11px] text-muted-foreground mt-1.5">
            {loading ? "Laden..." : stat.change}
          </p>
        </div>
      ))}
    </div>
  );
}
