"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import { Project } from "@/lib/types/tasks";

type NavItem = "inbox" | "today" | "upcoming" | "completed" | "insights";

interface TaskSidebarProps {
  projects: Project[];
  activeNav: NavItem;
  activeProjectId: string | null;
  counts: {
    inbox: number;
    today: number;
    upcoming: number;
    completed: number;
    insights?: number;
  };
  onSelectNav: (nav: NavItem) => void;
  onSelectProject: (id: string) => void;
  onNewProject: () => void;
  onEditProject: (project: Project) => void;
  onDeleteProject: (id: string) => void;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export default function TaskSidebar({
  projects,
  activeNav,
  activeProjectId,
  counts,
  onSelectNav,
  onSelectProject,
  onNewProject,
  onEditProject,
  onDeleteProject,
  mobileOpen = false,
  onMobileClose,
}: TaskSidebarProps) {
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [projectsExpanded, setProjectsExpanded] = useState(true);

  // Liquid glass indicator
  const navRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const [indicatorStyle, setIndicatorStyle] = useState({ top: 0, height: 0, opacity: 0 });
  const [hasAnimated, setHasAnimated] = useState(false);

  const setItemRef = useCallback((key: string, el: HTMLButtonElement | null) => {
    if (el) itemRefs.current.set(key, el);
    else itemRefs.current.delete(key);
  }, []);

  const updateIndicator = useCallback(() => {
    // Only animate nav items, not projects
    if (activeProjectId) {
      setIndicatorStyle((s) => ({ ...s, opacity: 0 }));
      return;
    }
    const activeEl = itemRefs.current.get(activeNav);
    const navEl = navRef.current;
    if (!activeEl || !navEl) {
      setIndicatorStyle((s) => ({ ...s, opacity: 0 }));
      return;
    }
    const navRect = navEl.getBoundingClientRect();
    const itemRect = activeEl.getBoundingClientRect();
    setIndicatorStyle({ top: itemRect.top - navRect.top, height: itemRect.height, opacity: 1 });
    if (!hasAnimated) requestAnimationFrame(() => setHasAnimated(true));
  }, [activeNav, activeProjectId, hasAnimated]);

  useEffect(() => {
    updateIndicator();
  }, [activeNav, activeProjectId, projectsExpanded, mobileOpen, updateIndicator]);

  useEffect(() => {
    window.addEventListener("resize", updateIndicator);
    return () => window.removeEventListener("resize", updateIndicator);
  }, [updateIndicator]);

  const navItems: { key: NavItem; label: string; icon: React.ReactNode; count: number; dividerBefore?: boolean }[] = [
    {
      key: "inbox",
      label: "Inbox",
      count: counts.inbox,
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
          <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
        </svg>
      ),
    },
    {
      key: "today",
      label: "Vandaag",
      count: counts.today,
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
          <text x="12" y="17" textAnchor="middle" fill="currentColor" stroke="none" fontSize="7" fontWeight="700">
            {new Date().getDate()}
          </text>
        </svg>
      ),
    },
    {
      key: "upcoming",
      label: "Aankomend",
      count: counts.upcoming,
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      ),
    },
    {
      key: "completed",
      label: "Voltooid",
      count: counts.completed,
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
      ),
    },
    {
      key: "insights",
      label: "Inzichten",
      count: 0,
      dividerBefore: true,
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <line x1="18" y1="20" x2="18" y2="10" />
          <line x1="12" y1="20" x2="12" y2="4" />
          <line x1="6" y1="20" x2="6" y2="14" />
        </svg>
      ),
    },
  ];

  const handleSelectNav = (nav: NavItem) => {
    onSelectNav(nav);
    onMobileClose?.();
  };

  const handleSelectProject = (id: string) => {
    onSelectProject(id);
    onMobileClose?.();
  };

  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden animate-backdrop"
          onClick={onMobileClose}
        />
      )}

      <div className={`w-64 shrink-0 border-r border-border flex-col h-full bg-surface/50 ${mobileOpen ? "flex fixed inset-y-0 left-0 z-50" : "hidden"} md:flex md:relative`}>
        {/* Navigation */}
        <div ref={navRef} className="p-3 space-y-0.5 relative">
          {/* Liquid glass indicator */}
          <div
            className="absolute left-3 right-3 rounded-lg pointer-events-none z-0"
            style={{
              top: indicatorStyle.top,
              height: indicatorStyle.height,
              opacity: indicatorStyle.opacity,
              transition: hasAnimated
                ? "top 0.5s cubic-bezier(0.32, 0.72, 0, 1), height 0.3s cubic-bezier(0.32, 0.72, 0, 1), opacity 0.2s ease"
                : "none",
              background: "var(--accent-glow)",
              backdropFilter: "blur(12px) saturate(1.8)",
              WebkitBackdropFilter: "blur(12px) saturate(1.8)",
              border: "1px solid rgba(108, 99, 255, 0.15)",
              boxShadow: "0 0 20px var(--accent-glow), inset 0 1px 0 rgba(255, 255, 255, 0.1), inset 0 -1px 0 rgba(0, 0, 0, 0.05)",
            }}
          />

          {navItems.map((item) => {
            const isActive = !activeProjectId && activeNav === item.key;
            return (
              <React.Fragment key={item.key}>
                {item.dividerBefore && (
                  <div className="mx-0 my-1 border-t border-border" />
                )}
                <button
                  ref={(el) => setItemRef(item.key, el)}
                  onClick={() => handleSelectNav(item.key)}
                  className={`relative z-10 w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors duration-150 ${
                    isActive
                      ? "text-accent font-medium"
                      : "text-foreground hover:bg-surface-hover"
                  }`}
                >
                  <span className={isActive ? "text-accent" : "text-muted-foreground"}>
                    {item.icon}
                  </span>
                  <span className="flex-1 text-left">{item.label}</span>
                  {item.count > 0 && (
                    <span className={`text-xs ${isActive ? "text-accent/70" : "text-muted-foreground/60"}`}>
                      {item.count}
                    </span>
                  )}
                </button>
              </React.Fragment>
            );
          })}
        </div>

        <div className="mx-3 border-t border-border" />

        {/* Projects */}
        <div className="p-3 flex-1 overflow-y-auto">
          <button
            onClick={() => setProjectsExpanded(!projectsExpanded)}
            className="w-full flex items-center justify-between px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
          >
            <span>Mijn projecten</span>
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className={`transition-transform ${projectsExpanded ? "rotate-90" : ""}`}
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>

          {projectsExpanded && (
            <div className="mt-1 space-y-0.5">
              {projects.map((project) => {
                const isActive = activeProjectId === project.id;
                return (
                  <div key={project.id} className="relative group">
                    <button
                      onClick={() => handleSelectProject(project.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${
                        isActive
                          ? "bg-accent/10 text-accent font-medium"
                          : "text-foreground hover:bg-surface-hover"
                      }`}
                    >
                      <span className="text-muted-foreground">#</span>
                      <span className="flex-1 text-left truncate">{project.name}</span>
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: project.color }}
                      />
                      {(project._count?.tasks ?? 0) > 0 && (
                        <span className={`text-xs ${isActive ? "text-accent/70" : "text-muted-foreground/60"}`}>
                          {project._count?.tasks ?? 0}
                        </span>
                      )}
                    </button>

                    {/* Context menu trigger */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuOpen(menuOpen === project.id ? null : project.id);
                      }}
                      className="absolute right-1 top-1/2 -translate-y-1/2 p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-surface-hover transition-all"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="text-muted-foreground">
                        <circle cx="12" cy="5" r="2" />
                        <circle cx="12" cy="12" r="2" />
                        <circle cx="12" cy="19" r="2" />
                      </svg>
                    </button>

                    {/* Dropdown */}
                    {menuOpen === project.id && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(null)} />
                        <div className="absolute right-0 top-full mt-1 z-50 w-36 bg-card border border-border rounded-lg shadow-lg overflow-hidden">
                          <button
                            onClick={() => { setMenuOpen(null); onEditProject(project); }}
                            className="w-full px-3 py-2 text-left text-sm text-foreground hover:bg-surface-hover transition-colors"
                          >
                            Bewerken
                          </button>
                          <button
                            onClick={() => { setMenuOpen(null); onDeleteProject(project.id); }}
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
                onClick={onNewProject}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-surface-hover transition-all"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Project toevoegen
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
