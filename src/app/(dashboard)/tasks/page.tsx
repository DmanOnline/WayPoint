"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Task,
  TaskFormData,
  TaskModalState,
  Project,
  ProjectModalState,
} from "@/lib/types/tasks";
import QuickAddBar from "@/components/tasks/QuickAddBar";
import TaskSidebar from "@/components/tasks/TaskSidebar";
import TaskList from "@/components/tasks/TaskList";
import TaskModal from "@/components/tasks/TaskModal";
import ProjectModal from "@/components/tasks/ProjectModal";

type NavMode = "inbox" | "today" | "upcoming" | "completed";

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, "0")}-${d.getDate().toString().padStart(2, "0")}`;
}

const NAV_TITLES: Record<NavMode, string> = {
  inbox: "Inbox",
  today: "Vandaag",
  upcoming: "Aankomend",
  completed: "Voltooid",
};

export default function TasksPage() {
  const router = useRouter();
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  const [nav, setNav] = useState<NavMode>("today");
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [taskSidebarOpen, setTaskSidebarOpen] = useState(false);

  // Modals
  const [taskModal, setTaskModal] = useState<TaskModalState>({
    open: false,
    mode: "create",
  });
  const [projectModal, setProjectModal] = useState<ProjectModalState>({
    open: false,
    mode: "create",
  });

  // --- Data fetching ---

  const fetchTasks = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (activeProjectId) params.set("projectId", activeProjectId);
      const res = await fetch(`/api/tasks?${params}`);
      if (res.ok) {
        const data = await res.json();
        setAllTasks(data.tasks);
      }
    } catch (err) {
      console.error("Failed to fetch tasks:", err);
    }
  }, [activeProjectId]);

  const fetchProjects = useCallback(async () => {
    try {
      const res = await fetch("/api/tasks/projects");
      if (res.ok) {
        const data = await res.json();
        setProjects(data.projects);
      }
    } catch (err) {
      console.error("Failed to fetch projects:", err);
    }
  }, []);

  useEffect(() => {
    async function init() {
      setLoading(true);
      await fetchProjects();
      await fetchTasks();
      setLoading(false);
    }
    init();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // --- Counts ---

  const counts = useMemo(() => {
    const todayStr = toDateStr(new Date());
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = toDateStr(tomorrow);

    return {
      inbox: allTasks.filter(
        (t) => t.status !== "done" && !t.scheduledDate && !t.dueDate
      ).length,
      today: allTasks.filter((t) => {
        if (t.status === "done") return false;
        if (t.scheduledDate && t.scheduledDate.substring(0, 10) <= todayStr) return true;
        if (t.dueDate && t.dueDate.substring(0, 10) <= todayStr) return true;
        return false;
      }).length,
      upcoming: allTasks.filter((t) => {
        if (t.status === "done") return false;
        if (t.scheduledDate && t.scheduledDate.substring(0, 10) >= tomorrowStr) return true;
        if (t.dueDate && t.dueDate.substring(0, 10) >= tomorrowStr) return true;
        return false;
      }).length,
      completed: allTasks.filter((t) => t.status === "done").length,
    };
  }, [allTasks]);

  // --- Filtered tasks ---

  const filteredTasks = useMemo(() => {
    // If a project is selected, show all open tasks for that project
    if (activeProjectId) {
      return allTasks.filter((t) => t.status !== "done");
    }

    const todayStr = toDateStr(new Date());
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = toDateStr(tomorrow);

    switch (nav) {
      case "inbox":
        return allTasks.filter(
          (t) => t.status !== "done" && !t.scheduledDate && !t.dueDate
        );
      case "today":
        return allTasks.filter((t) => {
          if (t.status === "done") return false;
          if (t.scheduledDate && t.scheduledDate.substring(0, 10) <= todayStr) return true;
          if (t.dueDate && t.dueDate.substring(0, 10) <= todayStr) return true;
          return false;
        });
      case "upcoming":
        return allTasks.filter((t) => {
          if (t.status === "done") return false;
          if (t.scheduledDate && t.scheduledDate.substring(0, 10) >= tomorrowStr) return true;
          if (t.dueDate && t.dueDate.substring(0, 10) >= tomorrowStr) return true;
          return false;
        });
      case "completed":
        return allTasks.filter((t) => t.status === "done");
      default:
        return allTasks;
    }
  }, [allTasks, nav, activeProjectId]);

  // Group upcoming by date
  const upcomingGrouped = useMemo(() => {
    if (nav !== "upcoming" || activeProjectId) return null;

    const dateMap = new Map<string, Task[]>();
    for (const task of filteredTasks) {
      const dateStr =
        task.scheduledDate?.substring(0, 10) ||
        task.dueDate?.substring(0, 10) ||
        "geen-datum";
      if (!dateMap.has(dateStr)) dateMap.set(dateStr, []);
      dateMap.get(dateStr)!.push(task);
    }

    const dayNames = ["zondag", "maandag", "dinsdag", "woensdag", "donderdag", "vrijdag", "zaterdag"];
    const monthNames = ["jan", "feb", "mrt", "apr", "mei", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return Array.from(dateMap.keys())
      .sort()
      .map((dateStr) => {
        const d = new Date(dateStr + "T00:00:00");
        let label: string;
        if (d.getTime() === tomorrow.getTime()) {
          label = "Morgen";
        } else {
          const dayName = dayNames[d.getDay()];
          label = `${dayName.charAt(0).toUpperCase() + dayName.slice(1)} ${d.getDate()} ${monthNames[d.getMonth()]}`;
        }
        const tasks = dateMap.get(dateStr)!.sort((a, b) => {
          return (a.scheduledTime || "99:99").localeCompare(b.scheduledTime || "99:99");
        });
        return { date: dateStr, label, tasks };
      });
  }, [filteredTasks, nav, activeProjectId]);

  // --- Task actions ---

  const handleQuickAdd = useCallback(
    async (data: {
      title: string;
      scheduledDate?: string;
      scheduledTime?: string;
      dueDate?: string;
      priority?: string;
      projectId?: string;
      recurrenceRule?: string;
      recurrenceDay?: number;
    }) => {
      const body = activeProjectId ? { ...data, projectId: data.projectId || activeProjectId } : data;
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        let msg = "Aanmaken mislukt";
        try { const err = await res.json(); msg = err.error || msg; } catch { /* empty */ }
        throw new Error(msg);
      }
      setShowQuickAdd(false);
      await fetchTasks();
      await fetchProjects();
    },
    [fetchTasks, fetchProjects, activeProjectId]
  );

  const handleSaveTask = useCallback(
    async (formData: TaskFormData) => {
      const isEditing = taskModal.mode === "edit" && taskModal.task;
      const body = {
        title: formData.title,
        description: formData.description || null,
        priority: formData.priority,
        scheduledDate: formData.scheduledDate || null,
        scheduledTime: formData.scheduledTime || null,
        dueDate: formData.dueDate || null,
        projectId: formData.projectId || (activeProjectId && !isEditing ? activeProjectId : null),
        recurrenceRule: formData.recurrenceRule || null,
        recurrenceDay: formData.recurrenceDay,
        recurrenceEnd: formData.recurrenceEnd || null,
        estimatedDuration: formData.estimatedDuration || 60,
      };

      const url = isEditing ? `/api/tasks/${taskModal.task!.id}` : "/api/tasks";
      const method = isEditing ? "PUT" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error(isEditing ? "Opslaan mislukt" : "Aanmaken mislukt");
      await fetchTasks();
      await fetchProjects();
    },
    [taskModal, fetchTasks, fetchProjects, activeProjectId]
  );

  const handleDeleteTask = useCallback(
    async (task: Task) => {
      const res = await fetch(`/api/tasks/${task.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Verwijderen mislukt");
      await fetchTasks();
      await fetchProjects();
    },
    [fetchTasks, fetchProjects]
  );

  const handleToggleTask = useCallback(
    async (task: Task) => {
      if (task._isFollowUp && task._followUpId && task._personId) {
        // Toggle follow-up via People API
        await fetch(`/api/people/${task._personId}/followups`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ followUpId: task._followUpId, isDone: true }),
        });
        await fetchTasks();
        return;
      }
      const newStatus = task.status === "done" ? "todo" : "done";
      await fetch(`/api/tasks/${task.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      await fetchTasks();
      await fetchProjects();
    },
    [fetchTasks, fetchProjects]
  );

  const handleReorder = useCallback(async (orderedIds: string[]) => {
    setAllTasks((prev) => {
      const ordered: Task[] = [];
      for (const id of orderedIds) {
        const t = prev.find((x) => x.id === id);
        if (t) ordered.push(t);
      }
      return [...ordered, ...prev.filter((t) => !orderedIds.includes(t.id))];
    });
    await fetch("/api/tasks/reorder", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderedIds }),
    });
  }, []);

  const handleClickTask = useCallback(
    (task: Task) => {
      if (task._isFollowUp && task._personId) {
        router.push(`/people?person=${task._personId}`);
        return;
      }
      setTaskModal({ open: true, mode: "edit", task });
    },
    [router]
  );

  // --- Project actions ---

  const handleSaveProject = useCallback(
    async (data: { name: string; color: string }) => {
      const isEditing = projectModal.mode === "edit" && projectModal.project;
      const url = isEditing ? `/api/tasks/projects/${projectModal.project!.id}` : "/api/tasks/projects";
      const res = await fetch(url, {
        method: isEditing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        let msg = "Opslaan mislukt";
        try { const err = await res.json(); msg = err.error || msg; } catch { /* empty */ }
        throw new Error(msg);
      }
      await fetchProjects();
    },
    [projectModal, fetchProjects]
  );

  const handleDeleteProject = useCallback(
    async (id: string) => {
      await fetch(`/api/tasks/projects/${id}`, { method: "DELETE" });
      if (activeProjectId === id) {
        setActiveProjectId(null);
        setNav("today");
      }
      await fetchProjects();
      await fetchTasks();
    },
    [activeProjectId, fetchProjects, fetchTasks]
  );

  // --- Title ---

  const pageTitle = activeProjectId
    ? projects.find((p) => p.id === activeProjectId)?.name || "Project"
    : NAV_TITLES[nav];

  const activeProject = activeProjectId
    ? projects.find((p) => p.id === activeProjectId)
    : null;

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="flex items-center gap-3 text-muted-foreground">
          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span className="text-sm">Laden...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex h-full overflow-hidden">
      {/* Task sidebar */}
      <TaskSidebar
        projects={projects}
        activeNav={nav}
        activeProjectId={activeProjectId}
        counts={counts}
        onSelectNav={(n) => {
          setActiveProjectId(null);
          setNav(n);
        }}
        onSelectProject={(id) => {
          setActiveProjectId(id);
        }}
        onNewProject={() => { setTaskSidebarOpen(false); setProjectModal({ open: true, mode: "create" }); }}
        onEditProject={(project) => { setTaskSidebarOpen(false); setProjectModal({ open: true, mode: "edit", project }); }}
        onDeleteProject={handleDeleteProject}
        mobileOpen={taskSidebarOpen}
        onMobileClose={() => setTaskSidebarOpen(false)}
      />

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Page header */}
        <div className="px-4 md:px-10 pt-4 md:pt-8 pb-4">
          <div className="flex items-center gap-3">
            {/* Mobile sidebar toggle */}
            <button
              onClick={() => setTaskSidebarOpen(true)}
              className="md:hidden p-2 -ml-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-overlay transition-colors"
              aria-label="Open navigatie"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              </svg>
            </button>
            {activeProject && (
              <span
                className="w-3 h-3 rounded-full shrink-0"
                style={{ backgroundColor: activeProject.color }}
              />
            )}
            <h1 className="text-xl font-bold text-foreground">{pageTitle}</h1>
            {nav === "today" && !activeProjectId && (
              <span className="text-sm text-muted-foreground">
                {new Date().toLocaleDateString("nl-NL", { weekday: "short", day: "numeric", month: "short" })}
              </span>
            )}
          </div>
        </div>

        {/* Task list */}
        <div className="flex-1 overflow-y-auto px-4 md:px-10 pb-8">
          {/* Upcoming grouped view */}
          {upcomingGrouped ? (
            <div className="space-y-6">
              {upcomingGrouped.length === 0 && (
                <EmptyState message="Geen aankomende taken gepland." />
              )}
              {upcomingGrouped.map((group) => (
                <div key={group.date}>
                  <div className="flex items-center gap-3 mb-1 pb-2 border-b border-border">
                    <h3 className="text-sm font-bold text-foreground">{group.label}</h3>
                    <span className="text-xs text-muted-foreground">
                      {group.date}
                    </span>
                  </div>
                  {group.tasks.map((task) => (
                    <div key={task.id} className="flex items-start">
                      {task.scheduledTime && (
                        <span className="text-xs text-muted-foreground w-14 shrink-0 pt-3 font-mono">
                          {task.scheduledTime}
                        </span>
                      )}
                      {!task.scheduledTime && <span className="w-14 shrink-0" />}
                      <div className="flex-1">
                        <TaskCardInline
                          task={task}
                          onToggle={handleToggleTask}
                          onClick={handleClickTask}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ) : (
            <>
              {filteredTasks.length === 0 && !showQuickAdd ? (
                <EmptyState
                  message={
                    nav === "today"
                      ? "Goed bezig! Geen taken voor vandaag."
                      : nav === "inbox"
                      ? "Je inbox is leeg."
                      : nav === "completed"
                      ? "Nog geen voltooide taken."
                      : activeProjectId
                      ? "Geen taken in dit project."
                      : "Geen taken."
                  }
                />
              ) : (
                <TaskList
                  tasks={filteredTasks}
                  onToggle={handleToggleTask}
                  onClick={handleClickTask}
                  onReorder={handleReorder}
                  onAddClick={() => setShowQuickAdd(true)}
                />
              )}
            </>
          )}

          {/* Inline quick add */}
          {showQuickAdd && (
            <div className="mt-2 pb-4 animate-fade-in">
              <QuickAddBar projects={projects} onAdd={handleQuickAdd} />
              <button
                onClick={() => setShowQuickAdd(false)}
                className="mt-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Annuleren
              </button>
            </div>
          )}

          {/* Floating add - only when list is empty and quick add not shown */}
          {filteredTasks.length === 0 && !showQuickAdd && nav !== "completed" && (
            <button
              onClick={() => setShowQuickAdd(true)}
              className="group flex items-center gap-3 px-2 py-2.5 text-sm text-muted-foreground hover:text-accent transition-colors mt-2"
            >
              <span className="w-[18px] h-[18px] rounded-full flex items-center justify-center group-hover:bg-accent group-hover:text-white transition-colors">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </span>
              Taak toevoegen
            </button>
          )}
        </div>
      </div>

      <TaskModal
        modalState={taskModal}
        projects={projects}
        onClose={() => setTaskModal({ open: false, mode: "create" })}
        onSave={handleSaveTask}
        onDelete={handleDeleteTask}
      />
      <ProjectModal
        modalState={projectModal}
        onClose={() => setProjectModal({ open: false, mode: "create" })}
        onSave={handleSaveProject}
        onDelete={handleDeleteProject}
      />
    </div>
  );
}

// Simple inline task card for upcoming grouped view
function TaskCardInline({
  task,
  onToggle,
  onClick,
}: {
  task: Task;
  onToggle: (task: Task) => void;
  onClick: (task: Task) => void;
}) {
  const isDone = task.status === "done";
  const [completing, setCompleting] = useState(false);
  const priorityBorder: Record<string, string> = {
    high: "border-red-500",
    medium: "border-muted-foreground/40",
    low: "border-blue-400",
  };

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isDone) {
      onToggle(task);
      return;
    }
    setCompleting(true);
    setTimeout(() => {
      onToggle(task);
      setCompleting(false);
    }, 800);
  };

  return (
    <div
      className={`flex items-center gap-3 px-2 py-2.5 border-b border-border/50 hover:bg-surface-hover/50 transition-colors cursor-pointer ${
        isDone ? "opacity-50" : ""
      } ${completing ? "animate-task-complete" : ""}`}
      onClick={() => onClick(task)}
    >
      <button
        onClick={handleToggle}
        className={`shrink-0 w-[18px] h-[18px] rounded-full border-2 flex items-center justify-center transition-all duration-200 ${
          isDone
            ? "border-accent bg-accent"
            : completing
            ? "border-green-500 bg-green-500 animate-checkbox-pop animate-success-ring"
            : priorityBorder[task.priority] || priorityBorder.medium
        }`}
      >
        {isDone && (
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
        {completing && (
          <span className="animate-checkmark-draw">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </span>
        )}
      </button>
      <span className={`text-sm flex-1 truncate ${
        isDone
          ? "line-through text-muted-foreground"
          : completing
          ? "text-muted-foreground task-title-strike"
          : "text-foreground"
      }`}>
        {task.title}
      </span>
      {task.estimatedDuration && task.scheduledTime && !completing && (
        <span className="text-[10px] text-muted-foreground/60">{task.estimatedDuration}min</span>
      )}
      {task.project && !completing && (
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: task.project.color }} />
          {task.project.name}
        </span>
      )}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="0.8" className="text-muted-foreground/20 mb-4">
        <path d="M9 11l3 3L22 4" />
        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
      </svg>
      <p className="text-muted-foreground text-sm">{message}</p>
    </div>
  );
}
