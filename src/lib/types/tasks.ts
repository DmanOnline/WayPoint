export type TaskStatus = "todo" | "in_progress" | "done";
export type TaskPriority = "low" | "medium" | "high";
export type TaskRecurrenceRule = "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";

export interface Project {
  id: string;
  userId: string;
  name: string;
  color: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  _count?: { tasks: number };
}

export interface Task {
  id: string;
  userId: string;
  projectId: string | null;
  project?: Project | null;

  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;

  scheduledDate: string | null;
  scheduledTime: string | null;
  dueDate: string | null;

  recurrenceRule: TaskRecurrenceRule | null;
  recurrenceDay: number | null;
  recurrenceEnd: string | null;

  estimatedDuration: number; // in minutes, default 60

  completedAt: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;

  // Virtual fields for people follow-ups
  _isFollowUp?: boolean;
  _followUpId?: string;
  _personId?: string;
  _personName?: string;
}

export interface ParsedTaskInput {
  title: string;
  scheduledDate?: string; // YYYY-MM-DD
  scheduledTime?: string; // HH:mm
  dueDate?: string; // YYYY-MM-DD
  priority?: TaskPriority;
  projectName?: string;
  recurrenceRule?: TaskRecurrenceRule;
  recurrenceDay?: number;
  estimatedDuration?: number; // in minutes
}

export interface TaskModalState {
  open: boolean;
  mode: "create" | "edit";
  task?: Task;
}

export interface ProjectModalState {
  open: boolean;
  mode: "create" | "edit";
  project?: Project;
}

export interface TaskFormData {
  title: string;
  description: string;
  priority: TaskPriority;
  scheduledDate: string;
  scheduledTime: string;
  dueDate: string;
  projectId: string;
  recurrenceRule: TaskRecurrenceRule | null;
  recurrenceDay: number | null;
  recurrenceEnd: string;
  estimatedDuration: number;
}
