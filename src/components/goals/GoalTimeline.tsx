"use client";

import { Goal } from "@/lib/types/goals";

interface GoalTimelineProps {
  goal: Goal;
}

export default function GoalTimeline({ goal }: GoalTimelineProps) {
  if (!goal.targetDate) return null;

  const milestones = goal.milestones || [];
  const startDate = new Date(goal.createdAt);
  const targetDate = new Date(goal.targetDate);
  const now = new Date();

  const totalMs = targetDate.getTime() - startDate.getTime();
  if (totalMs <= 0) return null;

  const elapsedMs = now.getTime() - startDate.getTime();
  const currentProgress = Math.min(Math.max((elapsedMs / totalMs) * 100, 0), 100);

  const completedMilestones = milestones.filter((m) => m.isCompleted && m.completedAt);

  const getMilestonePosition = (completedAt: string) => {
    const date = new Date(completedAt);
    const ms = date.getTime() - startDate.getTime();
    return Math.min(Math.max((ms / totalMs) * 100, 2), 98);
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("nl-NL", { day: "numeric", month: "short" });
  };

  const isOverdue = now > targetDate;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{formatDate(startDate)}</span>
        <span className={isOverdue ? "text-red-400 font-medium" : ""}>
          {formatDate(targetDate)}
        </span>
      </div>

      {/* Timeline bar */}
      <div className="relative h-3 rounded-full bg-border overflow-visible">
        {/* Elapsed time background */}
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
          style={{
            width: `${currentProgress}%`,
            backgroundColor: isOverdue ? "#ef4444" : `${goal.color}30`,
          }}
        />

        {/* Completed milestones dots */}
        {completedMilestones.map((m) => (
          <div
            key={m.id}
            className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 border-white shadow-sm z-10"
            style={{
              left: `${getMilestonePosition(m.completedAt!)}%`,
              backgroundColor: goal.color,
              transform: "translate(-50%, -50%)",
            }}
            title={`${m.title} - ${formatDate(new Date(m.completedAt!))}`}
          />
        ))}

        {/* Current position indicator */}
        <div
          className="absolute top-1/2 w-4 h-4 rounded-full border-2 shadow-md z-20"
          style={{
            left: `${currentProgress}%`,
            transform: "translate(-50%, -50%)",
            backgroundColor: isOverdue ? "#ef4444" : goal.color,
            borderColor: "var(--card)",
          }}
        />
      </div>

      {/* Legend */}
      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
        <span>Start</span>
        <span className={isOverdue ? "text-red-400" : ""}>
          {isOverdue
            ? "Deadline verlopen"
            : `${Math.round(currentProgress)}% van de tijd verstreken`}
        </span>
        <span>Deadline</span>
      </div>
    </div>
  );
}
