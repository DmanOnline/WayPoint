export interface NoteFolder {
  id: string;
  userId: string;
  name: string;
  color: string;
  icon: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  _count?: { notes: number };
}

export interface Note {
  id: string;
  userId: string;
  folderId: string | null;
  folder?: NoteFolder | null;
  title: string;
  content: string;
  color: string;
  tags: string | null;
  isPinned: boolean;
  isArchived: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface NoteFormData {
  title: string;
  content: string;
  color: string;
  folderId: string;
  tags: string[];
}

export interface NoteModalState {
  open: boolean;
  mode: "create" | "edit";
  note?: Note;
}

export interface FolderModalState {
  open: boolean;
  mode: "create" | "edit";
  folder?: NoteFolder;
}

export type NoteNav = "all" | "pinned" | "archived";
