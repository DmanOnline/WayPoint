"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  Note,
  NoteFolder,
  FolderModalState,
  NoteNav,
} from "@/lib/types/notes";
import NoteSidebar from "@/components/notes/NoteSidebar";
import NoteGrid from "@/components/notes/NoteGrid";
import NoteEditor from "@/components/notes/NoteEditor";
import FolderModal from "@/components/notes/FolderModal";

export default function NotesPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [archivedNotes, setArchivedNotes] = useState<Note[]>([]);
  const [folders, setFolders] = useState<NoteFolder[]>([]);
  const [loading, setLoading] = useState(true);

  const [nav, setNav] = useState<NoteNav>("all");
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Editor state: null = grid view, Note = editing existing, "new" = creating new
  const [editingNote, setEditingNote] = useState<Note | "new" | null>(null);

  const [folderModal, setFolderModal] = useState<FolderModalState>({
    open: false,
    mode: "create",
  });

  // --- Data fetching ---

  const fetchNotes = useCallback(async () => {
    try {
      const res = await fetch("/api/notes");
      if (res.ok) {
        const data = await res.json();
        setNotes(data.notes);
      }
    } catch (err) {
      console.error("Failed to fetch notes:", err);
    }
  }, []);

  const fetchArchivedNotes = useCallback(async () => {
    try {
      const res = await fetch("/api/notes?archived=true");
      if (res.ok) {
        const data = await res.json();
        setArchivedNotes(data.notes);
      }
    } catch (err) {
      console.error("Failed to fetch archived notes:", err);
    }
  }, []);

  const fetchFolders = useCallback(async () => {
    try {
      const res = await fetch("/api/notes/folders");
      if (res.ok) {
        const data = await res.json();
        setFolders(data.folders);
      }
    } catch (err) {
      console.error("Failed to fetch folders:", err);
    }
  }, []);

  useEffect(() => {
    async function init() {
      setLoading(true);
      await Promise.all([fetchNotes(), fetchFolders()]);
      setLoading(false);
    }
    init();
  }, [fetchNotes, fetchFolders]);

  // Load archived when switching to archive view
  useEffect(() => {
    if (nav === "archived") {
      fetchArchivedNotes();
    }
  }, [nav, fetchArchivedNotes]);

  // Debounce search query
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchQuery]);

  // --- Computed ---

  const filteredNotes = useMemo(() => {
    let result: Note[];

    if (nav === "archived") {
      result = archivedNotes;
    } else if (nav === "pinned") {
      result = notes.filter((n) => n.isPinned);
    } else {
      result = notes;
    }

    if (activeFolderId && nav !== "archived") {
      result = result.filter((n) => n.folderId === activeFolderId);
    }

    return result;
  }, [notes, archivedNotes, nav, activeFolderId]);

  const searchedNotes = useMemo(() => {
    if (!debouncedSearch.trim()) return filteredNotes;
    const q = debouncedSearch.toLowerCase();
    return filteredNotes.filter(
      (n) =>
        n.title.toLowerCase().includes(q) ||
        n.content.toLowerCase().includes(q) ||
        (n.tags && n.tags.toLowerCase().includes(q))
    );
  }, [filteredNotes, debouncedSearch]);

  const counts = useMemo(() => ({
    all: notes.length,
    pinned: notes.filter((n) => n.isPinned).length,
    archived: archivedNotes.length,
  }), [notes, archivedNotes]);

  // --- Page title ---

  const activeFolder = activeFolderId
    ? folders.find((f) => f.id === activeFolderId)
    : null;

  const NAV_TITLES: Record<NoteNav, string> = {
    all: "Alle notities",
    pinned: "Vastgepind",
    archived: "Archief",
  };

  const pageTitle = activeFolder
    ? `${activeFolder.icon ? activeFolder.icon + " " : ""}${activeFolder.name}`
    : NAV_TITLES[nav];

  // --- Handlers ---

  const handleSaveNote = async (data: { title: string; content: string; color: string; folderId: string; tags: string[] }) => {
    const body = {
      title: data.title,
      content: data.content,
      color: data.color,
      folderId: data.folderId || null,
      tags: data.tags.length > 0 ? data.tags : null,
    };

    if (editingNote && editingNote !== "new") {
      const res = await fetch(`/api/notes/${editingNote.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Bijwerken mislukt");
      }
    } else {
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Aanmaken mislukt");
      }
      const data = await res.json();
      // Switch to editing the newly created note
      setEditingNote(data.note);
    }

    await fetchNotes();
    await fetchFolders();
  };

  const handleDeleteNote = async (id: string) => {
    const res = await fetch(`/api/notes/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Verwijderen mislukt");
    }
    setEditingNote(null);
    await fetchNotes();
    await fetchFolders();
    if (nav === "archived") await fetchArchivedNotes();
  };

  const handleTogglePin = async (id: string) => {
    setNotes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isPinned: !n.isPinned } : n))
    );
    try {
      await fetch(`/api/notes/${id}/pin`, { method: "PUT" });
      await fetchNotes();
    } catch (err) {
      console.error("Toggle pin failed:", err);
      await fetchNotes();
    }
  };

  const handleArchiveNote = async (id: string) => {
    const res = await fetch(`/api/notes/${id}/archive`, { method: "PUT" });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Archiveren mislukt");
    }
    setEditingNote(null);
    await fetchNotes();
    if (nav === "archived") await fetchArchivedNotes();
  };

  const handleSaveFolder = async (data: { name: string; color: string; icon: string }) => {
    const body = { name: data.name, color: data.color, icon: data.icon || null };

    if (folderModal.mode === "edit" && folderModal.folder) {
      const res = await fetch(`/api/notes/folders/${folderModal.folder.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Bijwerken mislukt");
      }
    } else {
      const res = await fetch("/api/notes/folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Aanmaken mislukt");
      }
    }

    await fetchFolders();
    await fetchNotes();
  };

  const handleDeleteFolder = async (id: string) => {
    const res = await fetch(`/api/notes/folders/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Verwijderen mislukt");
    }
    if (activeFolderId === id) setActiveFolderId(null);
    await fetchFolders();
    await fetchNotes();
  };

  // --- Render ---

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-muted-foreground">Notities laden...</span>
        </div>
      </div>
    );
  }

  // Full-page editor mode
  if (editingNote) {
    return (
      <div className="flex-1 flex h-full overflow-hidden">
        <NoteEditor
          note={editingNote === "new" ? undefined : editingNote}
          folders={folders}
          onSave={handleSaveNote}
          onDelete={editingNote !== "new" ? handleDeleteNote : undefined}
          onArchive={editingNote !== "new" ? handleArchiveNote : undefined}
          onBack={() => setEditingNote(null)}
        />
      </div>
    );
  }

  // Grid view
  return (
    <div className="flex-1 flex h-full overflow-hidden">
      <NoteSidebar
        folders={folders}
        activeNav={nav}
        activeFolderId={activeFolderId}
        counts={counts}
        onSelectNav={setNav}
        onSelectFolder={setActiveFolderId}
        onNewFolder={() => setFolderModal({ open: true, mode: "create" })}
        onEditFolder={(f) => setFolderModal({ open: true, mode: "edit", folder: f })}
        onDeleteFolder={handleDeleteFolder}
        mobileOpen={sidebarOpen}
        onMobileClose={() => setSidebarOpen(false)}
      />

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Header */}
        <div className="px-4 md:px-10 pt-4 md:pt-8 pb-2">
          <div className="flex items-center gap-3 mb-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden p-2 -ml-2 rounded-lg hover:bg-surface-hover transition-colors"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>

            <h1 className="text-xl md:text-2xl font-bold text-foreground">{pageTitle}</h1>

            <button
              onClick={() => setEditingNote("new")}
              className="ml-auto px-3 py-1.5 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/90 transition-all flex items-center gap-1.5"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              <span className="hidden sm:inline">Nieuwe notitie</span>
            </button>
          </div>

          {/* Search bar */}
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/50"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Zoeken in notities..."
              className="w-full pl-9 pr-4 py-2 rounded-lg border border-border bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 placeholder:text-muted-foreground/50"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-foreground transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Notes grid */}
        <div className="flex-1 overflow-y-auto px-4 md:px-10 pb-8">
          <div className="animate-fade-in">
            <NoteGrid
              notes={searchedNotes}
              onClickNote={(note) => setEditingNote(note)}
              onTogglePin={handleTogglePin}
              onNewNote={() => setEditingNote("new")}
            />
          </div>
        </div>
      </div>

      {/* Folder modal only */}
      <FolderModal
        modalState={folderModal}
        onClose={() => setFolderModal({ open: false, mode: "create" })}
        onSave={handleSaveFolder}
        onDelete={
          folderModal.folder
            ? async (id) => { await handleDeleteFolder(id); }
            : undefined
        }
      />
    </div>
  );
}
