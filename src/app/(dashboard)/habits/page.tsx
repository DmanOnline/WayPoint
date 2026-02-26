"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Habit,
  HabitCategory,
  HabitCompletion,
  HabitFormData,
  HabitModalState,
  CategoryModalState,
} from "@/lib/types/habits";
import {
  getHabitsForDate,
  getTodaysHabits,
  getCompletionsMap,
  generateHeatmapData,
  toDateString,
  addDays,
  isFutureDate,
  getDailyTarget,
  isHabitFullyCompleted,
} from "@/lib/habits";
import HabitSidebar, { HabitNav } from "@/components/habits/HabitSidebar";
import HabitList from "@/components/habits/HabitList";
import HabitModal from "@/components/habits/HabitModal";
import CategoryModal from "@/components/habits/CategoryModal";
import HabitStats from "@/components/habits/HabitStats";
import HabitHeatmap from "@/components/habits/HabitHeatmap";
import DateStrip from "@/components/habits/DateStrip";

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, "0")}-${d.getDate().toString().padStart(2, "0")}`;
}

export default function HabitsPage() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [archivedHabits, setArchivedHabits] = useState<Habit[]>([]);
  const [categories, setCategories] = useState<HabitCategory[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [nav, setNav] = useState<HabitNav>("today");
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [habitModal, setHabitModal] = useState<HabitModalState>({
    open: false,
    mode: "create",
  });
  const [categoryModal, setCategoryModal] = useState<CategoryModalState>({
    open: false,
    mode: "create",
  });

  // --- Data fetching ---

  const fetchHabits = useCallback(async () => {
    try {
      const from = new Date();
      from.setFullYear(from.getFullYear() - 1);
      // Fetch up to 30 days in the future for the DateStrip
      const toDate = addDays(new Date(), 30);
      const params = new URLSearchParams({
        from: toDateStr(from),
        to: toDateStr(toDate),
      });
      const res = await fetch(`/api/habits?${params}`);
      if (res.ok) {
        const data = await res.json();
        setHabits(data.habits);
      }
    } catch (err) {
      console.error("Failed to fetch habits:", err);
    }
  }, []);

  const fetchArchivedHabits = useCallback(async () => {
    try {
      const res = await fetch("/api/habits?includeArchived=true");
      if (res.ok) {
        const data = await res.json();
        setArchivedHabits(data.habits.filter((h: Habit) => h.isArchived));
      }
    } catch (err) {
      console.error("Failed to fetch archived habits:", err);
    }
  }, []);

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch("/api/habits/categories");
      if (res.ok) {
        const data = await res.json();
        setCategories(data.categories);
      }
    } catch (err) {
      console.error("Failed to fetch categories:", err);
    }
  }, []);

  useEffect(() => {
    async function init() {
      setLoading(true);
      await Promise.all([fetchHabits(), fetchCategories()]);
      setLoading(false);
    }
    init();
  }, [fetchHabits, fetchCategories]);

  // --- Computed ---

  const today = new Date();
  const selectedDateStr = toDateString(selectedDate);
  const isSelectedFuture = isFutureDate(selectedDate);

  // All completions flattened
  const allCompletions = useMemo(
    () => habits.flatMap((h) => (h.completions || []).map((c) => ({ ...c, habitId: h.id }))),
    [habits]
  );

  // Completions for selected date
  const selectedDateCompletions = useMemo(
    () => getCompletionsMap(allCompletions, selectedDate),
    [allCompletions, selectedDate]
  );

  // Habits due on selected date
  const selectedDateHabits = useMemo(
    () => getHabitsForDate(habits, selectedDate),
    [habits, selectedDate]
  );

  // Today's habits for sidebar counts
  const todaysHabits = useMemo(() => getTodaysHabits(habits, today), [habits]);
  const todayCompletions = useMemo(() => getCompletionsMap(allCompletions, today), [allCompletions]);

  const heatmapData = useMemo(() => generateHeatmapData(allCompletions, 365), [allCompletions]);

  // Progress for selected date (accounts for multi-daily)
  const selectedDone = useMemo(() => {
    return selectedDateHabits.filter((h) => {
      const completion = selectedDateCompletions.get(h.id);
      return isHabitFullyCompleted(h, completion);
    }).length;
  }, [selectedDateHabits, selectedDateCompletions]);

  const selectedProgress = selectedDateHabits.length > 0
    ? Math.round((selectedDone / selectedDateHabits.length) * 100)
    : 0;

  // Today counts for sidebar
  const todayDone = todaysHabits.filter((h) => {
    const completion = todayCompletions.get(h.id);
    return isHabitFullyCompleted(h, completion);
  }).length;

  // DateStrip completion data: for each day in the strip range, count completed/total
  const dateStripCompletions = useMemo(() => {
    const completionsByDate = new Map<string, number>();
    const totalByDate = new Map<string, number>();

    for (let i = -30; i <= 29; i++) {
      const day = addDays(today, i);
      const dayStr = toDateString(day);
      const dueHabits = getHabitsForDate(habits, day);
      const dayCompletions = getCompletionsMap(allCompletions, day);

      totalByDate.set(dayStr, dueHabits.length);
      const doneCount = dueHabits.filter((h) => {
        const c = dayCompletions.get(h.id);
        return isHabitFullyCompleted(h, c);
      }).length;
      completionsByDate.set(dayStr, doneCount);
    }

    return { completionsByDate, totalByDate };
  }, [habits, allCompletions]);

  // Filter habits by category
  const filteredHabits = useMemo(() => {
    if (!activeCategoryId) return habits;
    return habits.filter((h) => h.categoryId === activeCategoryId);
  }, [habits, activeCategoryId]);

  const displayHabits = useMemo(() => {
    if (nav === "today") return getHabitsForDate(filteredHabits, selectedDate);
    if (nav === "archived") return archivedHabits;
    return filteredHabits;
  }, [nav, filteredHabits, archivedHabits, selectedDate]);

  // --- Handlers ---

  const handleToggleCompletion = async (habitId: string) => {
    if (isSelectedFuture) return; // Block future dates

    const dateStr = toDateStr(selectedDate);
    const habit = habits.find((h) => h.id === habitId);
    if (!habit) return;

    const existingCompletion = selectedDateCompletions.get(habitId);
    const dailyTarget = getDailyTarget(habit);
    const isMultiDaily = dailyTarget > 1;

    if (isMultiDaily) {
      const fullyDone = isHabitFullyCompleted(habit, existingCompletion);

      if (fullyDone) {
        // Reset: DELETE the completion
        setHabits((prev) =>
          prev.map((h) =>
            h.id === habitId
              ? { ...h, completions: (h.completions || []).filter((c) => !c.completedAt.startsWith(dateStr)) }
              : h
          )
        );
        try {
          await fetch("/api/habits/completions", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ habitId, date: dateStr }),
          });
          await fetchHabits();
        } catch (err) {
          console.error("Toggle completion failed:", err);
          await fetchHabits();
        }
      } else {
        // Increment: POST (API increments count)
        const newCount = (existingCompletion?.count || 0) + 1;
        setHabits((prev) =>
          prev.map((h) => {
            if (h.id !== habitId) return h;
            const completions = (h.completions || []).filter((c) => !c.completedAt.startsWith(dateStr));
            completions.push({
              id: existingCompletion?.id || "temp-" + Date.now(),
              habitId,
              completedAt: dateStr + "T00:00:00.000Z",
              count: newCount,
              note: existingCompletion?.note || null,
              createdAt: existingCompletion?.createdAt || new Date().toISOString(),
            });
            return { ...h, completions };
          })
        );
        try {
          await fetch("/api/habits/completions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ habitId, date: dateStr }),
          });
          await fetchHabits();
        } catch (err) {
          console.error("Toggle completion failed:", err);
          await fetchHabits();
        }
      }
    } else {
      // Single-daily: simple toggle
      const isCompleted = !!existingCompletion;

      if (isCompleted) {
        setHabits((prev) =>
          prev.map((h) =>
            h.id === habitId
              ? { ...h, completions: (h.completions || []).filter((c) => !c.completedAt.startsWith(dateStr)) }
              : h
          )
        );
      } else {
        const tempCompletion: HabitCompletion = {
          id: "temp-" + Date.now(),
          habitId,
          completedAt: dateStr + "T00:00:00.000Z",
          count: 1,
          note: null,
          createdAt: new Date().toISOString(),
        };
        setHabits((prev) =>
          prev.map((h) =>
            h.id === habitId
              ? { ...h, completions: [...(h.completions || []), tempCompletion] }
              : h
          )
        );
      }

      try {
        if (isCompleted) {
          await fetch("/api/habits/completions", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ habitId, date: dateStr }),
          });
        } else {
          await fetch("/api/habits/completions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ habitId, date: dateStr }),
          });
        }
        await fetchHabits();
      } catch (err) {
        console.error("Toggle completion failed:", err);
        await fetchHabits();
      }
    }
  };

  const handleSaveHabit = async (data: HabitFormData) => {
    const body = {
      name: data.name,
      description: data.description || null,
      color: data.color,
      icon: data.icon || null,
      categoryId: data.categoryId || null,
      frequencyType: data.frequencyType,
      frequencyTarget: data.frequencyTarget,
      frequencyPeriod: data.frequencyPeriod,
      frequencyInterval: data.frequencyInterval,
      frequencyDays: data.frequencyDays.length > 0 ? data.frequencyDays : null,
      startDate: data.startDate,
      reminderTime: data.reminderTime || null,
    };

    if (habitModal.mode === "edit" && habitModal.habit) {
      const res = await fetch(`/api/habits/${habitModal.habit.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Bijwerken mislukt");
      }
    } else {
      const res = await fetch("/api/habits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Aanmaken mislukt");
      }
    }

    await fetchHabits();
    await fetchCategories();
  };

  const handleDeleteHabit = async (id: string) => {
    const res = await fetch(`/api/habits/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Verwijderen mislukt");
    }
    await fetchHabits();
    await fetchCategories();
  };

  const handleArchiveHabit = async (id: string) => {
    const habit = habits.find((h) => h.id === id) || archivedHabits.find((h) => h.id === id);
    const res = await fetch(`/api/habits/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isArchived: !habit?.isArchived }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Archiveren mislukt");
    }
    await fetchHabits();
    if (nav === "archived") await fetchArchivedHabits();
  };

  const handleSaveCategory = async (data: { name: string; color: string; icon: string }) => {
    const body = { name: data.name, color: data.color, icon: data.icon || null };

    if (categoryModal.mode === "edit" && categoryModal.category) {
      const res = await fetch(`/api/habits/categories/${categoryModal.category.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Bijwerken mislukt");
      }
    } else {
      const res = await fetch("/api/habits/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Aanmaken mislukt");
      }
    }

    await fetchCategories();
    await fetchHabits();
  };

  const handleDeleteCategory = async (id: string) => {
    const res = await fetch(`/api/habits/categories/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Verwijderen mislukt");
    }
    if (activeCategoryId === id) setActiveCategoryId(null);
    await fetchCategories();
    await fetchHabits();
  };

  // Load archived when switching to archive view
  useEffect(() => {
    if (nav === "archived") {
      fetchArchivedHabits();
    }
  }, [nav, fetchArchivedHabits]);

  // --- Titles ---

  const MONTH_NAMES_NL = ["januari", "februari", "maart", "april", "mei", "juni", "juli", "augustus", "september", "oktober", "november", "december"];

  const isToday = toDateString(selectedDate) === toDateString(today);
  const selectedDateLabel = isToday
    ? "Vandaag"
    : `${selectedDate.getDate()} ${MONTH_NAMES_NL[selectedDate.getMonth()]}`;

  const NAV_TITLES: Record<HabitNav, string> = {
    today: selectedDateLabel,
    all: "Alle habits",
    stats: "Statistieken",
    archived: "Archief",
  };

  const activeCategory = activeCategoryId
    ? categories.find((c) => c.id === activeCategoryId)
    : null;

  const pageTitle = activeCategory
    ? `${activeCategory.icon ? activeCategory.icon + " " : ""}${activeCategory.name}`
    : NAV_TITLES[nav];

  // --- Render ---

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-muted-foreground">Habits laden...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex h-full overflow-hidden">
      <HabitSidebar
        categories={categories}
        activeNav={nav}
        activeCategoryId={activeCategoryId}
        counts={{
          today: todaysHabits.length,
          todayDone,
          all: habits.length,
          archived: archivedHabits.length,
        }}
        onSelectNav={setNav}
        onSelectCategory={setActiveCategoryId}
        onNewCategory={() => setCategoryModal({ open: true, mode: "create" })}
        onEditCategory={(cat) => setCategoryModal({ open: true, mode: "edit", category: cat })}
        onDeleteCategory={handleDeleteCategory}
        mobileOpen={sidebarOpen}
        onMobileClose={() => setSidebarOpen(false)}
      />

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Header */}
        <div className="px-4 md:px-10 pt-4 md:pt-8 pb-2">
          <div className="flex items-center gap-3 mb-3">
            {/* Mobile menu */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden p-2 -ml-2 rounded-lg hover:bg-surface-hover transition-colors"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>

            <h1 className="text-xl md:text-2xl font-bold text-foreground">{pageTitle}</h1>

            <button
              onClick={() => setHabitModal({ open: true, mode: "create" })}
              className="ml-auto px-3 py-1.5 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/90 transition-all flex items-center gap-1.5"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              <span className="hidden sm:inline">Nieuwe habit</span>
            </button>
          </div>

          {/* Date Strip - only show on today/date view */}
          {(nav === "today") && (
            <DateStrip
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
              completionsByDate={dateStripCompletions.completionsByDate}
              totalByDate={dateStripCompletions.totalByDate}
            />
          )}

          {/* Progress bar for selected date */}
          {nav === "today" && selectedDateHabits.length > 0 && (
            <div className="flex items-center gap-3 mt-3">
              <div className="flex-1 h-2 rounded-full bg-border overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700 ease-out"
                  style={{
                    width: `${selectedProgress}%`,
                    backgroundColor: selectedProgress === 100 ? "#10b981" : "var(--accent)",
                  }}
                />
              </div>
              <span className="text-sm font-medium text-muted-foreground shrink-0">
                {selectedDone}/{selectedDateHabits.length}
              </span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 md:px-10 pb-8">
          {nav === "stats" ? (
            <div className="animate-fade-in">
              <HabitStats habits={habits} allCompletions={allCompletions} />
              <HabitHeatmap data={heatmapData} />
            </div>
          ) : (
            <div className="animate-fade-in">
              <HabitList
                habits={displayHabits}
                categories={categories}
                completionsMap={selectedDateCompletions}
                onToggle={handleToggleCompletion}
                onClick={(habit) => setHabitModal({ open: true, mode: "edit", habit })}
                onNewHabit={() => setHabitModal({ open: true, mode: "create" })}
                groupByCategory={nav !== "archived"}
                locked={isSelectedFuture}
              />
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <HabitModal
        modalState={habitModal}
        categories={categories}
        onClose={() => setHabitModal({ open: false, mode: "create" })}
        onSave={handleSaveHabit}
        onDelete={handleDeleteHabit}
        onArchive={handleArchiveHabit}
      />
      <CategoryModal
        modalState={categoryModal}
        onClose={() => setCategoryModal({ open: false, mode: "create" })}
        onSave={handleSaveCategory}
        onDelete={
          categoryModal.category
            ? async (id) => {
                await handleDeleteCategory(id);
              }
            : undefined
        }
      />
    </div>
  );
}
