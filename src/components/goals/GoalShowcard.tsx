"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Goal } from "@/lib/types/goals";
import MilestoneList from "./MilestoneList";
import GoalTimeline from "./GoalTimeline";

interface GoalShowcardProps {
  goal: Goal;
  index: number;
  onEdit: (goal: Goal) => void;
  onArchive: (id: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onComplete: (id: string) => Promise<void>;
  onReopen: (id: string) => Promise<void>;
  onToggleMilestone: (milestoneId: string) => Promise<void>;
  onAddMilestone: (goalId: string, title: string) => Promise<void>;
  onDeleteMilestone: (milestoneId: string) => Promise<void>;
  onUpdateMilestone: (milestoneId: string, title: string) => Promise<void>;
  onUpdateProgress: (goalId: string, progress: number) => Promise<void>;
}

const PRIORITY_CONFIG = {
  high: { label: "Hoog", className: "bg-red-500/10 text-red-400 border-red-500/20" },
  medium: { label: "Gemiddeld", className: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
  low: { label: "Laag", className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
};

function ProgressRing({
  progress,
  color,
  size = 110,
  interactive = false,
  isFull = false,
  onProgressChange,
}: {
  progress: number;
  color: string;
  size?: number;
  interactive?: boolean;
  isFull?: boolean;
  onProgressChange?: (progress: number) => void;
}) {
  const strokeWidth = 7;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [hasAnimated, setHasAnimated] = useState(false);
  const initialProgress = useRef(progress);

  // After initial mount animation, switch to CSS transitions for live updates
  useEffect(() => {
    const timer = setTimeout(() => setHasAnimated(true), 1300);
    return () => clearTimeout(timer);
  }, []);

  // If progress changes before initial animation finishes, switch to transitions immediately
  useEffect(() => {
    if (!hasAnimated && progress !== initialProgress.current) {
      setHasAnimated(true);
    }
  }, [progress, hasAnimated]);

  // Calculate progress from pointer position relative to the container div
  // The visual ring starts at 12 o'clock (top) and goes clockwise
  const calculateProgress = useCallback(
    (clientX: number, clientY: number) => {
      if (!containerRef.current) return progress;
      const rect = containerRef.current.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = clientX - cx;
      const dy = clientY - cy;
      // atan2 from top (12 o'clock), clockwise
      let angle = Math.atan2(dx, -dy);
      if (angle < 0) angle += 2 * Math.PI;
      const pct = (angle / (2 * Math.PI)) * 100;
      return Math.max(0, Math.min(100, Math.round(pct / 5) * 5));
    },
    [progress]
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!interactive || !onProgressChange) return;
      e.preventDefault();
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      setIsDragging(true);
      const newProgress = calculateProgress(e.clientX, e.clientY);
      onProgressChange(newProgress);
    },
    [interactive, onProgressChange, calculateProgress]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging || !onProgressChange) return;
      const newProgress = calculateProgress(e.clientX, e.clientY);
      onProgressChange(newProgress);
    },
    [isDragging, onProgressChange, calculateProgress]
  );

  const handlePointerUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Handle position: angle in visual space (from top, clockwise)
  // The SVG is rotated -90deg CSS, so in SVG coordinate space 0deg = 3 o'clock
  // We need the handle in SVG space: progress 0% = top = SVG 0 (after -90deg CSS rotation)
  // SVG strokeDasharray starts at 3 o'clock in SVG space = 12 o'clock after CSS rotate
  // Handle in SVG space: angle = progress * 360 degrees from 3 o'clock (0 deg in SVG)
  const handleAngleRad = ((progress / 100) * 360) * (Math.PI / 180);
  const handleX = size / 2 + radius * Math.cos(handleAngleRad);
  const handleY = size / 2 + radius * Math.sin(handleAngleRad);

  const activeColor = isFull ? "#22c55e" : color;
  const activeOffset = isFull ? 0 : offset;

  return (
    <div
      ref={containerRef}
      className={`relative shrink-0 ${interactive ? "cursor-pointer" : ""} ${isFull ? "ring-complete-glow" : ""}`}
      style={{ width: size, height: size }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="transform -rotate-90"
        style={{ touchAction: "none" }}
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={isFull ? "rgba(34, 197, 94, 0.15)" : "var(--border)"}
          strokeWidth={strokeWidth}
        />
        {/* Hover track */}
        {interactive && (isHovered || isDragging) && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={activeColor}
            strokeWidth={strokeWidth}
            opacity={0.12}
          />
        )}
        {/* 100% celebration glow ring */}
        {isFull && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#22c55e"
            strokeWidth={18}
            opacity={0.12}
            className="ring-complete-pulse"
            style={{ filter: "blur(8px)" }}
          />
        )}
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={activeColor}
          strokeWidth={isDragging ? 9 : isFull ? 8 : strokeWidth}
          strokeDasharray={circumference}
          strokeLinecap="round"
          className={!hasAnimated && !isDragging ? "goal-progress-ring" : ""}
          style={{
            "--ring-circumference": circumference,
            "--ring-offset": activeOffset,
            strokeDashoffset: activeOffset,
            transition: hasAnimated
              ? `stroke-dashoffset 0.6s cubic-bezier(0.4, 0, 0.2, 1), stroke-width 0.15s, stroke 0.3s`
              : isDragging ? "stroke-width 0.15s" : undefined,
          } as React.CSSProperties}
        />
        {/* Glow effect when dragging */}
        {isDragging && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={activeColor}
            strokeWidth={16}
            strokeDasharray={circumference}
            strokeLinecap="round"
            strokeDashoffset={activeOffset}
            opacity={0.15}
            style={{ filter: "blur(6px)" }}
          />
        )}
        {/* Draggable handle */}
        {interactive && (isHovered || isDragging) && (
          <>
            <circle
              cx={handleX}
              cy={handleY}
              r={isDragging ? 10 : 7}
              fill={activeColor}
              stroke="var(--card)"
              strokeWidth={3}
              style={{
                filter: `drop-shadow(0 0 ${isDragging ? 8 : 4}px ${activeColor}80)`,
                transition: "r 0.15s, filter 0.15s",
              }}
            />
            <circle
              cx={handleX}
              cy={handleY}
              r={2}
              fill="white"
              opacity={0.9}
            />
          </>
        )}
      </svg>
      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        {isFull ? (
          <>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" className="ring-complete-check">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <span className="text-[10px] text-emerald-400 uppercase tracking-wider font-semibold mt-0.5">
              100%
            </span>
          </>
        ) : (
          <>
            <span
              className={`font-bold text-foreground transition-all duration-200 ${
                isDragging ? "text-3xl scale-110" : "text-2xl"
              }`}
              style={isDragging ? { color: activeColor } : undefined}
            >
              {progress}%
            </span>
            <span className={`text-[10px] uppercase tracking-wider transition-colors duration-200 ${
              isDragging ? "text-foreground/60" : "text-muted-foreground"
            }`}>
              {interactive && (isHovered || isDragging) ? "sleep" : "klaar"}
            </span>
          </>
        )}
      </div>
    </div>
  );
}

export default function GoalShowcard({
  goal,
  index,
  onEdit,
  onArchive,
  onDelete,
  onComplete,
  onReopen,
  onToggleMilestone,
  onAddMilestone,
  onDeleteMilestone,
  onUpdateMilestone,
  onUpdateProgress,
}: GoalShowcardProps) {
  const [showActions, setShowActions] = useState(false);
  const [localProgress, setLocalProgress] = useState<number | null>(null);
  const [isCompleting, setIsCompleting] = useState(false);
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const milestones = goal.milestones || [];
  const completedCount = milestones.filter((m) => m.isCompleted).length;
  const totalCount = milestones.length;
  const hasMilestones = totalCount > 0;

  const priority = PRIORITY_CONFIG[goal.priority] || PRIORITY_CONFIG.medium;
  const isCompleted = goal.status === "completed";

  // Progress: completed goals = 100%, then milestones, then manualProgress, then 0
  const milestoneProgress = hasMilestones
    ? Math.round((completedCount / totalCount) * 100)
    : null;
  const progress = isCompleted
    ? 100
    : localProgress !== null
      ? localProgress
      : milestoneProgress !== null
        ? milestoneProgress
        : goal.manualProgress ?? 0;

  const isInteractiveRing = !hasMilestones && !isCompleted;
  const allMilestonesDone = totalCount > 0 && completedCount === totalCount;
  const manualComplete = !hasMilestones && progress === 100 && !isCompleted;

  const handleProgressChange = useCallback(
    (newProgress: number) => {
      setLocalProgress(newProgress);
      // Debounce the API save
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
      saveTimeout.current = setTimeout(() => {
        onUpdateProgress(goal.id, newProgress);
      }, 400);
    },
    [goal.id, onUpdateProgress]
  );

  // Clear localProgress once server data catches up, or when milestones take over
  useEffect(() => {
    if (localProgress !== null) {
      if (hasMilestones || goal.manualProgress === localProgress) {
        setLocalProgress(null);
      }
    }
  }, [goal.manualProgress, localProgress, hasMilestones]);

  const handleComplete = useCallback(async (id: string) => {
    setIsCompleting(true);
    // Let the celebration animation play fully
    await new Promise((resolve) => setTimeout(resolve, 1300));
    await onComplete(id);
    setIsCompleting(false);
  }, [onComplete]);

  const getDaysRemaining = () => {
    if (!goal.targetDate) return null;
    const target = new Date(goal.targetDate);
    const now = new Date();
    const diffMs = target.getTime() - now.getTime();
    return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  };

  const daysRemaining = getDaysRemaining();

  const getDeadlineDisplay = () => {
    if (daysRemaining === null) return null;
    if (daysRemaining < 0) return { text: "Verlopen!", className: "text-red-400 bg-red-500/10 border-red-500/20" };
    if (daysRemaining === 0) return { text: "Vandaag!", className: "text-red-400 bg-red-500/10 border-red-500/20" };
    if (daysRemaining === 1) return { text: "Morgen", className: "text-amber-400 bg-amber-500/10 border-amber-500/20" };
    if (daysRemaining <= 7) return { text: `${daysRemaining}d`, className: "text-amber-400 bg-amber-500/10 border-amber-500/20" };
    if (daysRemaining <= 30) return { text: `${daysRemaining}d`, className: "text-foreground/60 bg-surface-hover border-border" };
    return { text: `${daysRemaining}d`, className: "text-foreground/60 bg-surface-hover border-border" };
  };

  const deadline = getDeadlineDisplay();

  return (
    <div
      className={`animate-goal-card relative rounded-2xl border overflow-hidden transition-all duration-500 ${
        isCompleted
          ? "opacity-60 border-border bg-card"
          : "border-border bg-card"
      }`}
      style={{
        animationDelay: `${index * 0.12}s`,
        boxShadow: isCompleted
          ? "none"
          : `0 0 40px ${goal.color}08, 0 4px 20px var(--shadow-color)`,
      }}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Completion overlay */}
      {isCompleting && <div className="goal-completing absolute inset-0 z-10 pointer-events-none rounded-2xl" />}

      {/* Color accent bar */}
      <div
        className="h-1 relative z-0"
        style={{
          background: isCompleting
            ? "linear-gradient(90deg, #22c55e, #22c55e80)"
            : `linear-gradient(90deg, ${goal.color}, ${goal.color}80)`,
          transition: "background 0.5s",
        }}
      />

      <div className="p-6 md:p-8">
        {/* Top section: progress ring + info */}
        <div className="flex gap-6 md:gap-8 items-start">
          {/* Progress ring */}
          <ProgressRing
            progress={isCompleting ? 100 : progress}
            color={goal.color}
            interactive={isInteractiveRing}
            isFull={progress === 100 || isCompleted || isCompleting}
            onProgressChange={isInteractiveRing ? handleProgressChange : undefined}
          />

          {/* Info */}
          <div className="flex-1 min-w-0 pt-1">
            <h2 className={`text-xl md:text-2xl font-bold text-foreground ${isCompleted ? "line-through opacity-60" : ""}`}>
              {goal.title}
            </h2>
            {goal.description && (
              <p className="text-sm text-muted-foreground mt-1.5 line-clamp-2">
                {goal.description}
              </p>
            )}

            {/* Badges */}
            <div className="flex items-center gap-2 mt-3 flex-wrap">
              {goal.category && (
                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-hover border border-border text-xs text-foreground">
                  {goal.category.icon ? (
                    <span>{goal.category.icon}</span>
                  ) : (
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: goal.category.color }} />
                  )}
                  {goal.category.name}
                </span>
              )}
              <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${priority.className}`}>
                {priority.label}
              </span>
              {deadline && (
                <span className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs border ${deadline.className}`}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                  {deadline.text}
                </span>
              )}
              {hasMilestones && (
                <span className="px-2.5 py-1 rounded-full text-xs text-muted-foreground bg-surface-hover border border-border">
                  {completedCount}/{totalCount} mijlpalen
                </span>
              )}
              {!hasMilestones && !isCompleted && (
                <span className="px-2.5 py-1 rounded-full text-xs text-muted-foreground bg-surface-hover border border-border">
                  Handmatige voortgang
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Quick progress buttons (no milestones mode) */}
        {isInteractiveRing && (
          <div className="mt-5 flex items-center gap-2">
            <span className="text-xs text-muted-foreground mr-1">Snel:</span>
            {[0, 25, 50, 75, 100].map((pct) => (
              <button
                key={pct}
                onClick={() => handleProgressChange(pct)}
                className={`goal-quick-btn px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                  progress === pct
                    ? "text-white shadow-sm"
                    : "bg-surface-hover text-muted-foreground hover:text-foreground hover:scale-105"
                }`}
                style={progress === pct ? { backgroundColor: goal.color, boxShadow: `0 2px 8px ${goal.color}40` } : undefined}
              >
                {pct}%
              </button>
            ))}
          </div>
        )}

        {/* Timeline */}
        {goal.targetDate && (
          <div className="mt-6">
            <GoalTimeline goal={goal} />
          </div>
        )}

        {/* All milestones done prompt */}
        {allMilestonesDone && !isCompleted && (
          <div className="flex items-center gap-3 mt-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-emerald-400">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-emerald-400">Alle mijlpalen voltooid!</p>
              <p className="text-xs text-emerald-400/70 mt-0.5">Klaar om dit doel af te ronden?</p>
            </div>
            <button
              onClick={() => handleComplete(goal.id)}
              className="px-4 py-2 rounded-lg bg-emerald-500 text-white text-sm font-medium hover:bg-emerald-600 transition-all"
            >
              Voltooien
            </button>
          </div>
        )}

        {/* Manual 100% done prompt */}
        {manualComplete && (
          <div className="flex items-center gap-3 mt-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-emerald-400">
                <path d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-emerald-400">100% bereikt!</p>
              <p className="text-xs text-emerald-400/70 mt-0.5">Markeer dit doel als voltooid?</p>
            </div>
            <button
              onClick={() => handleComplete(goal.id)}
              className="px-4 py-2 rounded-lg bg-emerald-500 text-white text-sm font-medium hover:bg-emerald-600 transition-all"
            >
              Voltooien
            </button>
          </div>
        )}

        {/* Milestones */}
        <div className="mt-6">
          <div className="flex items-center gap-2 mb-3">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Mijlpalen
            </h3>
            {hasMilestones && (
              <div
                className="h-1 flex-1 rounded-full bg-border overflow-hidden"
              >
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${milestoneProgress}%`, backgroundColor: goal.color }}
                />
              </div>
            )}
          </div>
          <MilestoneList
            milestones={milestones}
            goalColor={goal.color}
            onToggle={onToggleMilestone}
            onAdd={(title) => onAddMilestone(goal.id, title)}
            onDelete={onDeleteMilestone}
            onUpdate={onUpdateMilestone}
          />
        </div>

        {/* Actions */}
        <div
          className={`flex items-center gap-2 mt-6 pt-4 border-t border-border transition-all duration-300 ${
            isCompleted || showActions ? "opacity-100" : "opacity-0 md:opacity-0"
          }`}
          style={{ opacity: isCompleted || showActions ? 1 : undefined }}
        >
          {!isCompleted ? (
            <button
              onClick={() => onEdit(goal)}
              className="px-4 py-2 rounded-lg bg-accent/10 text-accent text-sm font-medium hover:bg-accent/20 transition-all"
            >
              Bewerken
            </button>
          ) : (
            <button
              onClick={() => onReopen(goal.id)}
              className="px-4 py-2 rounded-lg bg-emerald-500/10 text-emerald-400 text-sm font-medium hover:bg-emerald-500/20 transition-all flex items-center gap-1.5"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 12a9 9 0 1 1 9 9m-9-9h9m0 0-4-4m4 4-4 4" />
              </svg>
              Heropenen
            </button>
          )}
          <button
            onClick={() => onArchive(goal.id)}
            className="px-4 py-2 rounded-lg text-muted-foreground text-sm hover:bg-surface-hover transition-all"
          >
            {goal.isArchived ? "Dearchiveren" : "Archiveren"}
          </button>
          <button
            onClick={() => onDelete(goal.id)}
            className="px-4 py-2 rounded-lg text-red-400 text-sm hover:bg-red-500/10 transition-all ml-auto"
          >
            Verwijderen
          </button>
        </div>
      </div>
    </div>
  );
}
