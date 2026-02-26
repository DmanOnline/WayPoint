export type GoalStatus = "active" | "completed" | "abandoned";
export type GoalPriority = "low" | "medium" | "high";

export interface GoalCategory {
  id: string;
  userId: string;
  name: string;
  color: string;
  icon: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  _count?: { goals: number };
}

export interface GoalMilestone {
  id: string;
  goalId: string;
  title: string;
  isCompleted: boolean;
  completedAt: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface Goal {
  id: string;
  userId: string;
  categoryId: string | null;
  category?: GoalCategory | null;

  title: string;
  description: string | null;
  status: GoalStatus;
  priority: GoalPriority;
  color: string;
  manualProgress: number | null;
  targetDate: string | null;
  completedAt: string | null;
  isArchived: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;

  milestones?: GoalMilestone[];
}

export interface GoalFormData {
  title: string;
  description: string;
  priority: GoalPriority;
  color: string;
  categoryId: string;
  targetDate: string;
}

export interface GoalModalState {
  open: boolean;
  mode: "create" | "edit";
  goal?: Goal;
}

export interface CategoryModalState {
  open: boolean;
  mode: "create" | "edit";
  category?: GoalCategory;
}

export type GoalNav = "active" | "completed" | "archived";
