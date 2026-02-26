export type FrequencyType = "daily" | "weekly" | "custom";
export type FrequencyPeriod = "day" | "week" | "month";

export interface HabitCategory {
  id: string;
  userId: string;
  name: string;
  color: string;
  icon: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  _count?: { habits: number };
}

export interface HabitCompletion {
  id: string;
  habitId: string;
  completedAt: string;
  count: number;
  note: string | null;
  createdAt: string;
}

export interface Habit {
  id: string;
  userId: string;
  categoryId: string | null;
  category?: HabitCategory | null;

  name: string;
  description: string | null;
  color: string;
  icon: string | null;

  frequencyType: FrequencyType;
  frequencyTarget: number;
  frequencyPeriod: FrequencyPeriod;
  frequencyInterval: number;
  frequencyDays: string | null;

  startDate: string;
  reminderTime: string | null;
  isArchived: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;

  completions?: HabitCompletion[];
}

export interface HabitFormData {
  name: string;
  description: string;
  color: string;
  icon: string;
  categoryId: string;
  frequencyType: FrequencyType;
  frequencyTarget: number;
  frequencyPeriod: FrequencyPeriod;
  frequencyInterval: number;
  frequencyDays: number[];
  startDate: string;
  reminderTime: string;
}

export interface HabitModalState {
  open: boolean;
  mode: "create" | "edit";
  habit?: Habit;
}

export interface CategoryModalState {
  open: boolean;
  mode: "create" | "edit";
  category?: HabitCategory;
}

export interface HabitStreak {
  current: number;
  longest: number;
}

export interface HabitStats {
  habitId: string;
  streak: HabitStreak;
  completionRate7d: number;
  completionRate30d: number;
  totalCompletions: number;
}

export interface HeatmapDay {
  date: string;
  count: number;
  level: 0 | 1 | 2 | 3 | 4;
}

export interface TodayProgress {
  total: number;
  completed: number;
  percentage: number;
}
