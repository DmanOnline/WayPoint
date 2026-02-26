"use client";

import { useState } from "react";
import { NoteFolder, NoteNav } from "@/lib/types/notes";

interface NoteSidebarProps {
  folders: NoteFolder[];
  activeNav: NoteNav;
  activeFolderId: string | null;
  counts: {
    all: number;
    pinned: number;
    archived: number;
  };
  onSelectNav: (nav: NoteNav) => void;
  onSelectFolder: (id: string | null) => void;
  onNewFolder: () => void;
  onEditFolder: (folder: NoteFolder) => void;
  onDeleteFolder: (id: string) => void;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export default function NoteSidebar({
  folders,
  activeNav,
  activeFolderId,
  counts,
  onSelectNav,
  onSelectFolder,
  onNewFolder,
  onEditFolder,
  onDeleteFolder,
  mobileOpen = false,
  onMobileClose,
}: NoteSidebarProps) {
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [foldersExpanded, setFoldersExpanded] = useState(true);

  const navItems: { key: NoteNav; label: string; icon: React.ReactNode; count?: string }[] = [
    {
      key: "all",
      label: "Alle notities",
      count: counts.all > 0 ? String(counts.all) : undefined,
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Z" />
          <path d="M19.5 7.125 16.862 4.487" />
          <path d="M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
        </svg>
      ),
    },
    {
      key: "pinned",
      label: "Vastgepind",
      count: counts.pinned > 0 ? String(counts.pinned) : undefined,
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M12 2v20M12 2 8 6M12 2l4 4" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      ),
    },
    {
      key: "archived",
      label: "Archief",
      count: counts.archived > 0 ? String(counts.archived) : undefined,
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <polyline points="21 8 21 21 3 21 3 8" />
          <rect x="1" y="3" width="22" height="5" />
          <line x1="10" y1="12" x2="14" y2="12" />
        </svg>
      ),
    },
  ];

  const handleSelectNav = (nav: NoteNav) => {
    onSelectNav(nav);
    onSelectFolder(null);
    onMobileClose?.();
  };

  const handleSelectFolder = (id: string) => {
    onSelectFolder(id);
    onSelectNav("all");
    onMobileClose?.();
  };

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden animate-backdrop"
          onClick={onMobileClose}
        />
      )}

      <div className={`w-64 shrink-0 border-r border-border flex-col h-full bg-surface/50 ${mobileOpen ? "flex fixed inset-y-0 left-0 z-50" : "hidden"} md:flex md:relative`}>
        {/* Navigation */}
        <div className="p-3 space-y-0.5">
          {navItems.map((item) => {
            const isActive = !activeFolderId && activeNav === item.key;
            return (
              <button
                key={item.key}
                onClick={() => handleSelectNav(item.key)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${
                  isActive
                    ? "bg-accent/10 text-accent font-medium"
                    : "text-foreground hover:bg-surface-hover"
                }`}
              >
                <span className={isActive ? "text-accent" : "text-muted-foreground"}>
                  {item.icon}
                </span>
                <span className="flex-1 text-left">{item.label}</span>
                {item.count && (
                  <span className={`text-xs ${isActive ? "text-accent/70" : "text-muted-foreground/60"}`}>
                    {item.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="mx-3 border-t border-border" />

        {/* Folders */}
        <div className="p-3 flex-1 overflow-y-auto">
          <button
            onClick={() => setFoldersExpanded(!foldersExpanded)}
            className="w-full flex items-center justify-between px-3 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
          >
            <span>Mappen</span>
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className={`transition-transform ${foldersExpanded ? "rotate-90" : ""}`}
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>

          {foldersExpanded && (
            <div className="mt-1 space-y-0.5">
              {folders.map((folder) => {
                const isActive = activeFolderId === folder.id;
                return (
                  <div key={folder.id} className="relative group">
                    <button
                      onClick={() => handleSelectFolder(folder.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${
                        isActive
                          ? "bg-accent/10 text-accent font-medium"
                          : "text-foreground hover:bg-surface-hover"
                      }`}
                    >
                      {folder.icon ? (
                        <span className="text-sm">{folder.icon}</span>
                      ) : (
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: folder.color }}
                        />
                      )}
                      <span className="flex-1 text-left truncate">{folder.name}</span>
                      {(folder._count?.notes ?? 0) > 0 && (
                        <span className={`text-xs ${isActive ? "text-accent/70" : "text-muted-foreground/60"}`}>
                          {folder._count?.notes ?? 0}
                        </span>
                      )}
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuOpen(menuOpen === folder.id ? null : folder.id);
                      }}
                      className="absolute right-1 top-1/2 -translate-y-1/2 p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-surface-hover transition-all"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="text-muted-foreground">
                        <circle cx="12" cy="5" r="2" />
                        <circle cx="12" cy="12" r="2" />
                        <circle cx="12" cy="19" r="2" />
                      </svg>
                    </button>

                    {menuOpen === folder.id && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(null)} />
                        <div className="absolute right-0 top-full mt-1 z-50 w-36 bg-card border border-border rounded-lg shadow-lg overflow-hidden">
                          <button
                            onClick={() => { setMenuOpen(null); onEditFolder(folder); }}
                            className="w-full px-3 py-2 text-left text-sm text-foreground hover:bg-surface-hover transition-colors"
                          >
                            Bewerken
                          </button>
                          <button
                            onClick={() => { setMenuOpen(null); onDeleteFolder(folder.id); }}
                            className="w-full px-3 py-2 text-left text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                          >
                            Verwijderen
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}

              <button
                onClick={onNewFolder}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-surface-hover transition-all"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Map toevoegen
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
