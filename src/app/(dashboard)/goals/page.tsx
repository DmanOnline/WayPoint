"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Goal,
  GoalCategory,
  GoalFormData,
  GoalModalState,
  CategoryModalState,
  GoalNav,
} from "@/lib/types/goals";
import GoalShowcard from "@/components/goals/GoalShowcard";
import GoalModal from "@/components/goals/GoalModal";
import CategoryModal from "@/components/goals/CategoryModal";

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [archivedGoals, setArchivedGoals] = useState<Goal[]>([]);
  const [categories, setCategories] = useState<GoalCategory[]>([]);
  const [loading, setLoading] = useState(true);

  const [nav, setNav] = useState<GoalNav>("active");

  const [goalModal, setGoalModal] = useState<GoalModalState>({
    open: false,
    mode: "create",
  });
  const [categoryModal, setCategoryModal] = useState<CategoryModalState>({
    open: false,
    mode: "create",
  });
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; goalId: string; goalTitle: string }>({
    open: false,
    goalId: "",
    goalTitle: "",
  });

  // --- Data fetching ---

  const fetchGoals = useCallback(async () => {
    try {
      const res = await fetch("/api/goals");
      if (res.ok) {
        const data = await res.json();
        setGoals(data.goals);
      }
    } catch (err) {
      console.error("Failed to fetch goals:", err);
    }
  }, []);

  const fetchArchivedGoals = useCallback(async () => {
    try {
      const res = await fetch("/api/goals?includeArchived=true");
      if (res.ok) {
        const data = await res.json();
        setArchivedGoals(data.goals.filter((g: Goal) => g.isArchived));
      }
    } catch (err) {
      console.error("Failed to fetch archived goals:", err);
    }
  }, []);

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch("/api/goals/categories");
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
      await Promise.all([fetchGoals(), fetchCategories()]);
      setLoading(false);
    }
    init();
  }, [fetchGoals, fetchCategories]);

  useEffect(() => {
    if (nav === "archived") {
      fetchArchivedGoals();
    }
  }, [nav, fetchArchivedGoals]);

  // --- Computed ---

  const activeGoals = useMemo(
    () => goals.filter((g) => g.status === "active"),
    [goals]
  );

  const completedGoals = useMemo(
    () => goals.filter((g) => g.status === "completed" || g.status === "abandoned"),
    [goals]
  );

  const counts = useMemo(
    () => ({
      active: activeGoals.length,
      completed: completedGoals.length,
      archived: archivedGoals.length,
    }),
    [activeGoals, completedGoals, archivedGoals]
  );

  const displayGoals = useMemo(() => {
    if (nav === "active") return activeGoals;
    if (nav === "completed") return completedGoals;
    return archivedGoals;
  }, [nav, activeGoals, completedGoals, archivedGoals]);

  const avgProgress = useMemo(() => {
    if (activeGoals.length === 0) return 0;
    const total = activeGoals.reduce((sum, g) => {
      const ms = g.milestones || [];
      if (ms.length > 0) {
        const done = ms.filter((m) => m.isCompleted).length;
        return sum + (done / ms.length) * 100;
      }
      return sum + (g.manualProgress ?? 0);
    }, 0);
    return Math.round(total / activeGoals.length);
  }, [activeGoals]);

  // --- Handlers ---

  const handleSaveGoal = async (data: GoalFormData) => {
    const body = {
      title: data.title,
      description: data.description || null,
      priority: data.priority,
      color: data.color,
      categoryId: data.categoryId || null,
      targetDate: data.targetDate || null,
    };

    if (goalModal.mode === "edit" && goalModal.goal) {
      const res = await fetch(`/api/goals/${goalModal.goal.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Bijwerken mislukt");
      }
    } else {
      const res = await fetch("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Aanmaken mislukt");
      }
    }

    await fetchGoals();
    await fetchCategories();
  };

  const handleRequestDelete = async (id: string) => {
    const goal = [...goals, ...archivedGoals].find((g) => g.id === id);
    setDeleteConfirm({ open: true, goalId: id, goalTitle: goal?.title || "" });
  };

  const handleConfirmDelete = async () => {
    const { goalId } = deleteConfirm;
    setDeleteConfirm({ open: false, goalId: "", goalTitle: "" });
    const res = await fetch(`/api/goals/${goalId}`, { method: "DELETE" });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Verwijderen mislukt");
    }
    await fetchGoals();
    await fetchCategories();
    if (nav === "archived") await fetchArchivedGoals();
  };

  const handleArchiveGoal = async (id: string) => {
    const res = await fetch(`/api/goals/${id}/archive`, { method: "PUT" });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Archiveren mislukt");
    }
    await fetchGoals();
    if (nav === "archived") await fetchArchivedGoals();
  };

  const handleCompleteGoal = async (id: string) => {
    const res = await fetch(`/api/goals/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "completed" }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Voltooien mislukt");
    }
    await fetchGoals();
  };

  const handleReopenGoal = async (id: string) => {
    const res = await fetch(`/api/goals/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "active" }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Heropenen mislukt");
    }
    await fetchGoals();
  };

  const handleToggleMilestone = async (milestoneId: string) => {
    await fetch(`/api/goals/milestones/${milestoneId}`, { method: "PATCH" });
    await fetchGoals();
  };

  const handleAddMilestone = async (goalId: string, title: string) => {
    await fetch("/api/goals/milestones", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ goalId, title }),
    });
    await fetchGoals();
  };

  const handleDeleteMilestone = async (milestoneId: string) => {
    await fetch(`/api/goals/milestones/${milestoneId}`, { method: "DELETE" });
    await fetchGoals();
  };

  const handleUpdateMilestone = async (milestoneId: string, title: string) => {
    await fetch(`/api/goals/milestones/${milestoneId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });
    await fetchGoals();
  };

  const handleUpdateProgress = async (goalId: string, progress: number) => {
    await fetch(`/api/goals/${goalId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ manualProgress: progress }),
    });
    await fetchGoals();
  };

  const handleSaveCategory = async (data: { name: string; color: string; icon: string }) => {
    const body = { name: data.name, color: data.color, icon: data.icon || null };

    if (categoryModal.mode === "edit" && categoryModal.category) {
      const res = await fetch(`/api/goals/categories/${categoryModal.category.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Bijwerken mislukt");
      }
    } else {
      const res = await fetch("/api/goals/categories", {
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
    await fetchGoals();
  };

  const handleDeleteCategory = async (id: string) => {
    const res = await fetch(`/api/goals/categories/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Verwijderen mislukt");
    }
    await fetchCategories();
    await fetchGoals();
  };

  // --- Render ---

  const tabs: { key: GoalNav; label: string; count: number }[] = [
    { key: "active", label: "Actief", count: counts.active },
    { key: "completed", label: "Voltooid", count: counts.completed },
    { key: "archived", label: "Archief", count: counts.archived },
  ];

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-muted-foreground">Doelen laden...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Header */}
      <div className="max-w-4xl mx-auto px-4 md:px-8 pt-6 md:pt-10">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">
              Mijn Doelen
            </h1>
            {activeGoals.length > 0 && (
              <p className="text-sm text-muted-foreground mt-1">
                {activeGoals.length} actief{activeGoals.length !== 1 ? "" : ""} doelen
                {avgProgress > 0 && (
                  <span className="text-accent font-medium"> &middot; {avgProgress}% gemiddelde voortgang</span>
                )}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {categories.length > 0 && (
              <button
                onClick={() => setCategoryModal({ open: true, mode: "create" })}
                className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface-hover transition-all"
                title="Categorieën beheren"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M12 1v4m0 14v4m-8.66-2.34 2.83-2.83m11.66-11.66 2.83-2.83M1 12h4m14 0h4M3.34 3.34l2.83 2.83m11.66 11.66 2.83 2.83" />
                </svg>
              </button>
            )}
            <button
              onClick={() => setGoalModal({ open: true, mode: "create" })}
              className="px-4 py-2 rounded-xl bg-accent text-white text-sm font-medium hover:bg-accent/90 transition-all flex items-center gap-2 shadow-lg shadow-accent/20"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Nieuw doel
            </button>
          </div>
        </div>

        {/* Tab navigation */}
        <div className="flex gap-1 mt-6 p-1 rounded-xl bg-surface-hover/50 w-fit">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setNav(tab.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                nav === tab.key
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className={`ml-1.5 text-xs ${
                  nav === tab.key ? "text-accent" : "text-muted-foreground/60"
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Goals */}
      <div className="max-w-4xl mx-auto px-4 md:px-8 py-6 md:py-8 space-y-6">
        {displayGoals.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 rounded-2xl bg-surface-hover flex items-center justify-center mx-auto mb-5">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-muted">
                <path d="M15.59 14.37a6 6 0 0 1-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 0 0 6.16-12.12A14.98 14.98 0 0 0 9.631 8.41m5.96 5.96a14.926 14.926 0 0 1-5.841 2.58m-.119-8.54a6 6 0 0 0-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 0 0-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 0 1-2.448-2.448 14.9 14.9 0 0 1 .06-.312m-2.24 2.39a4.493 4.493 0 0 0-1.757 4.306 4.493 4.493 0 0 0 4.306-1.758M16.5 9a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              {nav === "active" ? "Nog geen doelen" : nav === "completed" ? "Nog geen voltooide doelen" : "Geen gearchiveerde doelen"}
            </h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
              {nav === "active"
                ? "Stel je eerste doel in en begin met het bijhouden van je voortgang."
                : nav === "completed"
                ? "Voltooide doelen verschijnen hier."
                : "Gearchiveerde doelen verschijnen hier."}
            </p>
            {nav === "active" && (
              <button
                onClick={() => setGoalModal({ open: true, mode: "create" })}
                className="px-5 py-2.5 rounded-xl bg-accent text-white text-sm font-medium hover:bg-accent/90 transition-all shadow-lg shadow-accent/20"
              >
                Eerste doel aanmaken
              </button>
            )}
          </div>
        ) : (
          displayGoals.map((goal, index) => (
            <GoalShowcard
              key={goal.id}
              goal={goal}
              index={index}
              onEdit={(g) => setGoalModal({ open: true, mode: "edit", goal: g })}
              onArchive={handleArchiveGoal}
              onDelete={handleRequestDelete}
              onComplete={handleCompleteGoal}
              onReopen={handleReopenGoal}
              onToggleMilestone={handleToggleMilestone}
              onAddMilestone={handleAddMilestone}
              onDeleteMilestone={handleDeleteMilestone}
              onUpdateMilestone={handleUpdateMilestone}
              onUpdateProgress={handleUpdateProgress}
            />
          ))
        )}
      </div>

      {/* Modals */}
      <GoalModal
        modalState={goalModal}
        categories={categories}
        onClose={() => setGoalModal({ open: false, mode: "create" })}
        onSave={handleSaveGoal}
      />
      <CategoryModal
        modalState={categoryModal}
        onClose={() => setCategoryModal({ open: false, mode: "create" })}
        onSave={handleSaveCategory}
        onDelete={
          categoryModal.category
            ? async (id) => { await handleDeleteCategory(id); }
            : undefined
        }
      />

      {/* Delete confirmation */}
      {deleteConfirm.open && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-50 animate-backdrop"
            onClick={() => setDeleteConfirm({ open: false, goalId: "", goalTitle: "" })}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <div
              className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-sm pointer-events-auto animate-scale-in"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 text-center">
                <div className="w-14 h-14 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-red-400">
                    <path d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-1">
                  Doel verwijderen?
                </h3>
                <p className="text-sm text-muted-foreground mb-1">
                  <span className="font-medium text-foreground">{deleteConfirm.goalTitle}</span>
                </p>
                <p className="text-xs text-muted-foreground mb-6">
                  Dit kan niet ongedaan worden gemaakt. Alle mijlpalen worden ook verwijderd.
                </p>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setDeleteConfirm({ open: false, goalId: "", goalTitle: "" })}
                    className="flex-1 py-2.5 rounded-lg border border-border text-muted-foreground text-sm font-medium hover:bg-surface-hover transition-all"
                  >
                    Annuleren
                  </button>
                  <button
                    onClick={handleConfirmDelete}
                    className="flex-1 py-2.5 rounded-lg bg-red-500 text-white text-sm font-medium hover:bg-red-600 transition-all"
                  >
                    Verwijderen
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
