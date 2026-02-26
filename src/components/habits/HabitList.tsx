"use client";

import { Habit, HabitCompletion, HabitCategory } from "@/lib/types/habits";
import HabitCard from "./HabitCard";

interface HabitListProps {
  habits: Habit[];
  categories: HabitCategory[];
  completionsMap: Map<string, HabitCompletion>;
  onToggle: (habitId: string) => void;
  onClick: (habit: Habit) => void;
  onNewHabit: () => void;
  groupByCategory?: boolean;
  locked?: boolean;
}

export default function HabitList({
  habits,
  categories,
  completionsMap,
  onToggle,
  onClick,
  onNewHabit,
  groupByCategory = true,
  locked = false,
}: HabitListProps) {
  if (habits.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center mb-4">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-accent">
            <path d="M12 2C12 2 4 8 4 14a8 8 0 0 0 16 0c0-6-8-12-8-12z" />
          </svg>
        </div>
        <h3 className="text-base font-medium text-foreground mb-1">Geen habits voor vandaag</h3>
        <p className="text-sm text-muted-foreground mb-4">Maak je eerste habit aan om te beginnen</p>
        <button
          onClick={onNewHabit}
          className="px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/90 transition-all"
        >
          Habit toevoegen
        </button>
      </div>
    );
  }

  if (!groupByCategory) {
    return (
      <div className="space-y-1">
        {habits.map((habit) => (
          <HabitCard
            key={habit.id}
            habit={habit}
            isCompleted={completionsMap.has(habit.id)}
            completion={completionsMap.get(habit.id)}
            onToggle={onToggle}
            onClick={onClick}
            locked={locked}
          />
        ))}
        <AddButton onClick={onNewHabit} />
      </div>
    );
  }

  // Group by category
  const uncategorized = habits.filter((h) => !h.categoryId);
  const byCategory = categories
    .map((cat) => ({
      category: cat,
      habits: habits.filter((h) => h.categoryId === cat.id),
    }))
    .filter((g) => g.habits.length > 0);

  return (
    <div className="space-y-6">
      {byCategory.map(({ category, habits: catHabits }) => (
        <div key={category.id}>
          <div className="flex items-center gap-2 mb-2 px-1">
            {category.icon && <span className="text-sm">{category.icon}</span>}
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: category.color }}
            />
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {category.name}
            </h3>
            <span className="text-xs text-muted-foreground/50">
              {catHabits.filter((h) => completionsMap.has(h.id)).length}/{catHabits.length}
            </span>
          </div>
          <div className="space-y-0.5">
            {catHabits.map((habit) => (
              <HabitCard
                key={habit.id}
                habit={habit}
                isCompleted={completionsMap.has(habit.id)}
                completion={completionsMap.get(habit.id)}
                onToggle={onToggle}
                onClick={onClick}
                locked={locked}
              />
            ))}
          </div>
        </div>
      ))}

      {uncategorized.length > 0 && (
        <div>
          {byCategory.length > 0 && (
            <div className="flex items-center gap-2 mb-2 px-1">
              <span className="w-2 h-2 rounded-full bg-muted-foreground/30" />
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Overig
              </h3>
            </div>
          )}
          <div className="space-y-0.5">
            {uncategorized.map((habit) => (
              <HabitCard
                key={habit.id}
                habit={habit}
                isCompleted={completionsMap.has(habit.id)}
                completion={completionsMap.get(habit.id)}
                onToggle={onToggle}
                onClick={onClick}
                locked={locked}
              />
            ))}
          </div>
        </div>
      )}

      <AddButton onClick={onNewHabit} />
    </div>
  );
}

function AddButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-muted-foreground hover:text-foreground hover:bg-surface-hover/50 transition-all mt-2"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <line x1="12" y1="5" x2="12" y2="19" />
        <line x1="5" y1="12" x2="19" y2="12" />
      </svg>
      Habit toevoegen
    </button>
  );
}
