"use client";

import { useState, useEffect, useCallback } from "react";
import QuickStats from "@/components/QuickStats";
import YearProgress from "@/components/YearProgress";
import TodayAgenda from "@/components/dashboard/TodayAgenda";
import HabitsToday from "@/components/dashboard/HabitsToday";
import MoodSparkline from "@/components/dashboard/MoodSparkline";
import GoalCards from "@/components/dashboard/GoalCards";
import PeoplePulse from "@/components/dashboard/PeoplePulse";
import FinanceSnapshot from "@/components/dashboard/FinanceSnapshot";
import NotesRecap from "@/components/dashboard/NotesRecap";

export interface DashboardData {
  today: string;
  tomorrow: string;
  tomorrowAgenda: {
    tasks: Array<{
      id: string;
      title: string;
      priority: string;
      scheduledTime: string | null;
      dueDate: string | null;
      project: { name: string; color: string } | null;
    }>;
    events: Array<{
      id: string;
      title: string;
      startDate: string;
      endDate: string;
      isAllDay: boolean;
      color: string;
    }>;
  };
  tasks: {
    todayCount: number;
    overdueCount: number;
    completedTodayCount: number;
    todayItems: Array<{
      id: string;
      title: string;
      priority: string;
      scheduledTime: string | null;
      dueDate: string | null;
      project: { name: string; color: string } | null;
    }>;
  };
  events: {
    todayCount: number;
    items: Array<{
      id: string;
      title: string;
      startDate: string;
      endDate: string;
      isAllDay: boolean;
      color: string;
    }>;
  };
  habits: {
    totalActive: number;
    completedToday: number;
    items: Array<{
      id: string;
      name: string;
      color: string;
      icon: string | null;
      isDue: boolean;
      isCompletedToday: boolean;
      currentStreak: number;
      frequencyLabel: string;
    }>;
  };
  journal: {
    hasEntryToday: boolean;
    todayMood: number | null;
    todayEnergy: number | null;
    last7Days: Array<{ date: string; mood: number | null; energy: number | null }>;
    currentStreak: number;
  };
  goals: Array<{
    id: string;
    title: string;
    color: string;
    progress: number;
    targetDate: string | null;
    milestonesCompleted: number;
    milestonesTotal: number;
  }>;
  people: {
    needsAttention: Array<{
      id: string;
      name: string;
      avatarColor: string;
      daysSinceContact: number | null;
      health: string;
    }>;
    upcomingBirthdays: Array<{
      id: string;
      name: string;
      avatarColor: string;
      daysUntil: number;
      date: string;
    }>;
    overdueFollowUps: number;
  };
  finance: {
    readyToAssign: number;
    totalBalance: number;
    budgetHealth: { onTrack: number; underfunded: number; overspent: number };
  };
  notes: {
    totalCount: number;
    recentCount: number;
    pinnedCount: number;
  };
  quote: {
    text: string;
    author: string;
  };
}

export default function DashboardShell() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboard = useCallback(async () => {
    try {
      const res = await fetch("/api/dashboard");
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error("Dashboard fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-5 md:space-y-6">
      {/* Quick Stats */}
      <QuickStats data={data} loading={loading} />

      {/* Quote */}
      {data?.quote && (
        <p className="text-sm text-muted-foreground italic animate-fade-in opacity-0 stagger-2 px-1">
          &ldquo;{data.quote.text}&rdquo; — {data.quote.author}
        </p>
      )}

      {/* Main Grid: 3 columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left column (spans 2) */}
        <div className="lg:col-span-2 space-y-4">
          <TodayAgenda
            events={data?.events ?? null}
            tasks={data?.tasks ?? null}
            tomorrow={data?.tomorrow ?? null}
            tomorrowAgenda={data?.tomorrowAgenda ?? null}
            loading={loading}
          />
          <MoodSparkline
            journal={data?.journal ?? null}
            loading={loading}
          />
          <GoalCards
            goals={data?.goals ?? null}
            loading={loading}
          />
        </div>

        {/* Right column */}
        <div className="space-y-4">
          <HabitsToday
            habits={data?.habits ?? null}
            loading={loading}
            onRefresh={fetchDashboard}
          />
          <PeoplePulse
            people={data?.people ?? null}
            loading={loading}
          />
          <FinanceSnapshot
            finance={data?.finance ?? null}
            loading={loading}
          />
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <YearProgress />
        <NotesRecap notes={data?.notes ?? null} loading={loading} />
      </div>
    </div>
  );
}
