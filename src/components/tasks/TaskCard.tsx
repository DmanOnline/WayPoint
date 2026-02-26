"use client";

import { useState, useRef } from "react";
import { Task } from "@/lib/types/tasks";
import { formatScheduledDate, formatDueDate, formatRecurrence } from "@/lib/tasks";

interface TaskCardProps {
  task: Task;
  onToggle: (task: Task) => void;
  onClick: (task: Task) => void;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent, task: Task) => void;
}

export default function TaskCard({
  task,
  onToggle,
  onClick,
  draggable = false,
  onDragStart,
}: TaskCardProps) {
  const isDone = task.status === "done";
  const [completing, setCompleting] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const scheduledInfo = formatScheduledDate(task.scheduledDate, task.scheduledTime);
  const dueInfo = formatDueDate(task.dueDate);
  const recurrenceLabel = formatRecurrence(task.recurrenceRule, task.recurrenceDay);

  const priorityBorder: Record<string, string> = {
    high: "border-red-500 hover:bg-red-500/10",
    medium: "border-muted-foreground/40 hover:bg-accent/5",
    low: "border-blue-400 hover:bg-blue-500/10",
  };

  const checkboxStyle = priorityBorder[task.priority] || priorityBorder.medium;

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();

    if (isDone) {
      // Uncomplete: just toggle immediately
      onToggle(task);
      return;
    }

    // Complete: play animation first, then toggle
    setCompleting(true);
    timeoutRef.current = setTimeout(() => {
      onToggle(task);
      setCompleting(false);
    }, 800);
  };

  return (
    <div
      className={`group flex items-start gap-3 px-2 py-2.5 border-b border-border/50 hover:bg-surface-hover/50 transition-colors cursor-pointer ${
        isDone ? "opacity-50" : ""
      } ${completing ? "animate-task-complete" : ""} ${
        draggable ? "cursor-grab active:cursor-grabbing" : ""
      }`}
      onClick={() => onClick(task)}
      draggable={draggable}
      onDragStart={(e) => onDragStart?.(e, task)}
    >
      {/* Checkbox */}
      <button
        onClick={handleToggle}
        className={`shrink-0 mt-0.5 w-[18px] h-[18px] rounded-full border-2 flex items-center justify-center transition-all duration-200 ${
          isDone
            ? "border-positive bg-positive"
            : completing
            ? "border-positive bg-positive animate-checkbox-pop animate-success-ring"
            : checkboxStyle
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

      {/* Content */}
      <div className="flex-1 min-w-0">
        <span
          className={`text-sm leading-snug ${
            isDone
              ? "line-through text-muted-foreground"
              : completing
              ? "text-muted-foreground task-title-strike"
              : "text-foreground"
          }`}
        >
          {task.title}
        </span>
        {task.description && !isDone && !completing && (
          <p className="text-xs text-muted-foreground/70 mt-0.5 truncate">
            {task.description}
          </p>
        )}

        {/* Meta tags */}
        {!isDone && !completing && (scheduledInfo.label || dueInfo.label || recurrenceLabel) && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1">
            {scheduledInfo.label && (
              <span className={`inline-flex items-center gap-1 text-xs ${
                scheduledInfo.isOverdue ? "text-red-400" : "text-accent"
              }`}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                {scheduledInfo.label}
              </span>
            )}
            {dueInfo.label && (
              <span className={`inline-flex items-center gap-1 text-xs ${
                dueInfo.isOverdue ? "text-red-400" : "text-orange-400"
              }`}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                {dueInfo.label}
              </span>
            )}
            {recurrenceLabel && (
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="23 4 23 10 17 10" />
                  <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10" />
                </svg>
                {recurrenceLabel}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Right side: project tag */}
      {task.project && (
        <span className="shrink-0 inline-flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
          <span
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: task.project.color }}
          />
          {task.project.name}
        </span>
      )}
    </div>
  );
}
