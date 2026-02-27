"use client";

import React, { useState, useEffect, useMemo } from "react";
import { TaskFormData, TaskPriority, Project } from "@/lib/types/tasks";
import { getDateLabel } from "@/lib/tasks";
import RecurrenceSelector from "./RecurrenceSelector";
import SmartDateInput from "@/components/ui/SmartDateInput";

interface ConflictInfo {
  type: "calendar" | "task";
  title: string;
  startTime: string;
  endTime: string;
}

interface TaskFormProps {
  formData: TaskFormData;
  projects: Project[];
  onChange: (data: Partial<TaskFormData>) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  onDelete?: () => void;
  isEditing: boolean;
  isSubmitting: boolean;
  editingTaskId?: string;
}

export default function TaskForm({
  formData,
  projects,
  onChange,
  onSubmit,
  onCancel,
  onDelete,
  isEditing,
  isSubmitting,
  editingTaskId,
}: TaskFormProps) {
  const [conflicts, setConflicts] = useState<ConflictInfo[]>([]);

  // Check for conflicts when date/time/duration changes
  useEffect(() => {
    if (!formData.scheduledDate || !formData.scheduledTime) {
      setConflicts([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const params = new URLSearchParams({
          date: formData.scheduledDate,
          time: formData.scheduledTime,
          duration: String(formData.estimatedDuration || 60),
        });
        if (editingTaskId) params.set("excludeTaskId", editingTaskId);

        const res = await fetch(`/api/tasks/check-conflict?${params}`);
        if (res.ok) {
          const data = await res.json();
          setConflicts(data.conflicts);
        }
      } catch {
        // ignore
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [formData.scheduledDate, formData.scheduledTime, formData.estimatedDuration, editingTaskId]);

  const priorities: { value: TaskPriority; label: string; color: string }[] = [
    { value: "low", label: "Laag", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
    { value: "medium", label: "Gemiddeld", color: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
    { value: "high", label: "Hoog", color: "bg-red-500/20 text-red-400 border-red-500/30" },
  ];

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {/* Titel */}
      <div>
        <label className="block text-xs font-medium text-muted-foreground mb-1">
          Titel
        </label>
        <input
          type="text"
          value={formData.title}
          onChange={(e) => onChange({ title: e.target.value })}
          placeholder="Wat moet er gedaan worden?"
          className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
          required
          autoFocus
        />
      </div>

      {/* Project */}
      <div>
        <label className="block text-xs font-medium text-muted-foreground mb-1">
          Project
        </label>
        <select
          value={formData.projectId}
          onChange={(e) => onChange({ projectId: e.target.value })}
          className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
        >
          <option value="">Geen project</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      {/* Prioriteit */}
      <div>
        <label className="block text-xs font-medium text-muted-foreground mb-1">
          Prioriteit
        </label>
        <div className="flex gap-2">
          {priorities.map((p) => (
            <button
              key={p.value}
              type="button"
              onClick={() => onChange({ priority: p.value })}
              className={`flex-1 py-2 rounded-lg border text-xs font-medium transition-all ${
                formData.priority === p.value
                  ? p.color + " border-current"
                  : "bg-surface text-muted-foreground border-border hover:bg-surface-hover"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Planning */}
      <DateTimeSelector formData={formData} onChange={onChange} />

      {/* Conflict waarschuwing */}
      {conflicts.length > 0 && (
        <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
          <div className="flex items-center gap-2 text-amber-400 text-xs font-semibold mb-1">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            Conflict gevonden!
          </div>
          {conflicts.map((c, i) => {
            const start = new Date(c.startTime);
            const end = new Date(c.endTime);
            const timeStr = `${start.getHours().toString().padStart(2, "0")}:${start.getMinutes().toString().padStart(2, "0")} - ${end.getHours().toString().padStart(2, "0")}:${end.getMinutes().toString().padStart(2, "0")}`;
            return (
              <p key={i} className="text-xs text-amber-300/80 ml-5">
                {c.type === "calendar" ? "📅" : "✓"} {c.title} ({timeStr})
              </p>
            );
          })}
        </div>
      )}

      {/* Deadline */}
      <div>
        <label className="block text-xs font-medium text-muted-foreground mb-1">
          Deadline
        </label>
        <SmartDateInput
          value={formData.dueDate}
          onChange={(v) => onChange({ dueDate: v })}
          className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
        />
      </div>

      {/* Herhaling */}
      <RecurrenceSelector
        rule={formData.recurrenceRule}
        day={formData.recurrenceDay}
        end={formData.recurrenceEnd}
        onChange={onChange}
      />

      {/* Beschrijving */}
      <div>
        <label className="block text-xs font-medium text-muted-foreground mb-1">
          Beschrijving
        </label>
        <textarea
          value={formData.description}
          onChange={(e) => onChange({ description: e.target.value })}
          placeholder="Optionele details..."
          rows={3}
          className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 resize-none"
        />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-2">
        <button
          type="submit"
          disabled={isSubmitting || !formData.title.trim()}
          className="flex-1 py-2.5 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/90 disabled:opacity-50 transition-all"
        >
          {isSubmitting ? "Opslaan..." : isEditing ? "Opslaan" : "Aanmaken"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2.5 rounded-lg border border-border text-muted-foreground text-sm hover:bg-surface-hover transition-all"
        >
          Annuleren
        </button>
        {isEditing && onDelete && (
          <button
            type="button"
            onClick={onDelete}
            className="px-4 py-2.5 rounded-lg text-red-400 text-sm hover:bg-red-500/10 transition-all"
          >
            Verwijderen
          </button>
        )}
      </div>
    </form>
  );
}

// --- Inline DateTimeSelector component ---

function pad2(n: number): string {
  return n.toString().padStart(2, "0");
}

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function DateTimeSelector({
  formData,
  onChange,
}: {
  formData: TaskFormData;
  onChange: (data: Partial<TaskFormData>) => void;
}) {
  const [showDatePicker, setShowDatePicker] = useState(false);

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const quickDates = useMemo(() => {
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Volgende maandag
    const nextMonday = new Date(today);
    const dayOfWeek = nextMonday.getDay();
    const daysUntilMonday = dayOfWeek === 0 ? 1 : dayOfWeek === 1 ? 7 : 8 - dayOfWeek;
    nextMonday.setDate(nextMonday.getDate() + daysUntilMonday);

    // Volgend weekend (zaterdag)
    const nextSaturday = new Date(today);
    const daysUntilSat = (6 - nextSaturday.getDay() + 7) % 7 || 7;
    nextSaturday.setDate(nextSaturday.getDate() + daysUntilSat);

    const all = [
      { label: "Vandaag", value: toDateStr(today), icon: "sun" },
      { label: "Morgen", value: toDateStr(tomorrow), icon: "sunrise" },
      { label: "Volgende week", value: toDateStr(nextMonday), icon: "calendar-next" },
      { label: "Weekend", value: toDateStr(nextSaturday), icon: "coffee" },
    ];
    // Deduplicate — if two quick dates resolve to the same date, keep the first
    const seen = new Set<string>();
    return all.filter((d) => {
      if (seen.has(d.value)) return false;
      seen.add(d.value);
      return true;
    });
  }, [today]);

  const selectedLabel = formData.scheduledDate ? getDateLabel(formData.scheduledDate) : null;
  const isQuickDate = quickDates.some((q) => q.value === formData.scheduledDate);

  const icons: Record<string, React.ReactNode> = {
    sun: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="5" />
        <line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
        <line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" />
        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
      </svg>
    ),
    sunrise: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M17 18a5 5 0 0 0-10 0" /><line x1="12" y1="9" x2="12" y2="2" />
        <line x1="4.22" y1="10.22" x2="5.64" y2="11.64" /><line x1="1" y1="18" x2="3" y2="18" />
        <line x1="21" y1="18" x2="23" y2="18" /><line x1="18.36" y1="11.64" x2="19.78" y2="10.22" />
        <line x1="23" y1="22" x2="1" y2="22" /><polyline points="8 6 12 2 16 6" />
      </svg>
    ),
    "calendar-next": (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
        <polyline points="12 14 15 17 12 20" />
      </svg>
    ),
    coffee: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M18 8h1a4 4 0 0 1 0 8h-1" /><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" />
        <line x1="6" y1="1" x2="6" y2="4" /><line x1="10" y1="1" x2="10" y2="4" /><line x1="14" y1="1" x2="14" y2="4" />
      </svg>
    ),
  };

  return (
    <div className="space-y-3">
      <label className="block text-xs font-medium text-muted-foreground">
        Planning
      </label>

      {/* Quick date chips */}
      <div className="flex flex-wrap gap-1.5">
        {quickDates.map((q) => {
          const isActive = formData.scheduledDate === q.value;
          return (
            <button
              key={q.value}
              type="button"
              onClick={() =>
                onChange({
                  scheduledDate: isActive ? "" : q.value,
                })
              }
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                isActive
                  ? "bg-accent text-white shadow-sm"
                  : "bg-surface border border-border text-muted-foreground hover:bg-surface-hover hover:text-foreground"
              }`}
            >
              <span className={isActive ? "text-white/80" : "text-muted-foreground/70"}>
                {icons[q.icon]}
              </span>
              {q.label}
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => setShowDatePicker(!showDatePicker)}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            formData.scheduledDate && !isQuickDate
              ? "bg-accent text-white shadow-sm"
              : "bg-surface border border-border text-muted-foreground hover:bg-surface-hover hover:text-foreground"
          }`}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          {formData.scheduledDate && !isQuickDate ? selectedLabel : "Kies datum"}
        </button>
        {formData.scheduledDate && (
          <button
            type="button"
            onClick={() => onChange({ scheduledDate: "", scheduledTime: "" })}
            className="inline-flex items-center px-2 py-1.5 rounded-lg text-xs text-muted-foreground/60 hover:text-red-400 hover:bg-red-500/10 transition-all"
            title="Datum wissen"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
      </div>

      {/* Custom date picker (expandable) */}
      {showDatePicker && (
        <div className="animate-fade-in">
          <SmartDateInput
            value={formData.scheduledDate}
            onChange={(v) => onChange({ scheduledDate: v })}
            className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
          />
        </div>
      )}

      {/* Tijd & Duur - alleen tonen als er een datum is */}
      {formData.scheduledDate && (
        <div className="grid grid-cols-2 gap-3 animate-fade-in">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              Tijd
            </label>
            <input
              type="time"
              value={formData.scheduledTime}
              onChange={(e) => onChange({ scheduledTime: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              Duur
            </label>
            <select
              value={formData.estimatedDuration}
              onChange={(e) => onChange({ estimatedDuration: parseInt(e.target.value) })}
              className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
            >
              <option value={15}>15 min</option>
              <option value={30}>30 min</option>
              <option value={45}>45 min</option>
              <option value={60}>1 uur</option>
              <option value={90}>1,5 uur</option>
              <option value={120}>2 uur</option>
              <option value={180}>3 uur</option>
              <option value={240}>4 uur</option>
            </select>
          </div>
        </div>
      )}
    </div>
  );
}
