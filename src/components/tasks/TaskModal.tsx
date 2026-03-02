"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Task, TaskFormData, TaskModalState, Project } from "@/lib/types/tasks";
import { getSmartDefaultDate } from "@/lib/tasks";
import TaskForm from "./TaskForm";

interface TaskModalProps {
  modalState: TaskModalState;
  projects: Project[];
  onClose: () => void;
  onSave: (data: TaskFormData) => Promise<void>;
  onDelete: (task: Task) => Promise<void>;
}

type AutoSaveStatus = "idle" | "saving" | "saved" | "error";

function toDateStr(d: string | null): string {
  if (!d) return "";
  return d.substring(0, 10);
}

export default function TaskModal({
  modalState,
  projects,
  onClose,
  onSave,
  onDelete,
}: TaskModalProps) {
  const { open, mode, task } = modalState;

  const [formData, setFormData] = useState<TaskFormData>({
    title: "",
    description: "",
    priority: "medium",
    scheduledDate: "",
    scheduledTime: "",
    dueDate: "",
    projectId: "",
    recurrenceRule: null,
    recurrenceDay: null,
    recurrenceEnd: "",
    estimatedDuration: 60,
    checklistItems: [],
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [autoSaveStatus, setAutoSaveStatus] = useState<AutoSaveStatus>("idle");

  // Refs to avoid stale closures and track user edits
  const onSaveRef = useRef(onSave);
  useEffect(() => { onSaveRef.current = onSave; }, [onSave]);

  const hasUserEditedRef = useRef(false);
  const savedTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize form when modal opens
  useEffect(() => {
    hasUserEditedRef.current = false;
    setAutoSaveStatus("idle");
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current);

    if (open && mode === "edit" && task) {
      setFormData({
        title: task.title,
        description: task.description || "",
        priority: task.priority,
        scheduledDate: toDateStr(task.scheduledDate),
        scheduledTime: task.scheduledTime || "",
        dueDate: toDateStr(task.dueDate),
        projectId: task.projectId || "",
        recurrenceRule: task.recurrenceRule,
        recurrenceDay: task.recurrenceDay,
        recurrenceEnd: task.recurrenceEnd ? toDateStr(task.recurrenceEnd) : "",
        estimatedDuration: task.estimatedDuration || 60,
        checklistItems: task.checklistItems ?? [],
      });
    } else if (open && mode === "create") {
      setFormData({
        title: "",
        description: "",
        priority: "medium",
        scheduledDate: getSmartDefaultDate(),
        scheduledTime: "",
        dueDate: "",
        projectId: "",
        recurrenceRule: null,
        recurrenceDay: null,
        recurrenceEnd: "",
        estimatedDuration: 60,
        checklistItems: [],
      });
    }
    setIsSubmitting(false);
    setError("");
  }, [open, mode, task]);

  // Auto-save in edit mode (debounced 800ms after last change)
  useEffect(() => {
    if (!open || mode !== "edit" || !hasUserEditedRef.current) return;

    setAutoSaveStatus("saving");
    const timer = setTimeout(async () => {
      try {
        await onSaveRef.current(formData);
        setAutoSaveStatus("saved");
        if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
        savedTimerRef.current = setTimeout(() => setAutoSaveStatus("idle"), 2000);
      } catch {
        setAutoSaveStatus("error");
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [formData, open, mode]);

  const handleChange = useCallback((partial: Partial<TaskFormData>) => {
    hasUserEditedRef.current = true;
    setFormData((prev) => ({ ...prev, ...partial }));
  }, []);

  // Used only in create mode
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!formData.title.trim()) return;
      setIsSubmitting(true);
      setError("");
      try {
        await onSave(formData);
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Opslaan mislukt");
      } finally {
        setIsSubmitting(false);
      }
    },
    [formData, onSave, onClose]
  );

  const handleDelete = useCallback(async () => {
    if (!task) return;
    setIsSubmitting(true);
    setError("");
    try {
      await onDelete(task);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verwijderen mislukt");
    } finally {
      setIsSubmitting(false);
    }
  }, [task, onDelete, onClose]);

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-50 animate-backdrop"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-md pointer-events-auto animate-scale-in max-h-[85vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <div className="flex items-center gap-3">
              <h2 className="text-base font-semibold text-foreground">
                {mode === "edit" ? "Taak bewerken" : "Nieuwe taak"}
              </h2>
              {/* Auto-save status */}
              {mode === "edit" && autoSaveStatus !== "idle" && (
                <span className={`text-xs transition-all ${
                  autoSaveStatus === "saving" ? "text-muted-foreground/60" :
                  autoSaveStatus === "saved" ? "text-positive" :
                  "text-red-400"
                }`}>
                  {autoSaveStatus === "saving" && "Opslaan..."}
                  {autoSaveStatus === "saved" && "✓ Opgeslagen"}
                  {autoSaveStatus === "error" && "Fout bij opslaan"}
                </span>
              )}
            </div>
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {/* Body */}
          <div className="overflow-y-auto px-5 py-4">
            {error && (
              <div className="mb-3 p-2 rounded-lg bg-red-500/10 text-red-400 text-xs">
                {error}
              </div>
            )}
            <TaskForm
              formData={formData}
              projects={projects}
              onChange={handleChange}
              onSubmit={handleSubmit}
              onCancel={onClose}
              onDelete={mode === "edit" ? handleDelete : undefined}
              isEditing={mode === "edit"}
              isSubmitting={isSubmitting}
              editingTaskId={mode === "edit" ? task?.id : undefined}
            />
          </div>
        </div>
      </div>
    </>
  );
}
