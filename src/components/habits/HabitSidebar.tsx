"use client";

import { HabitCategory } from "@/lib/types/habits";
import { useState } from "react";

export type HabitNav = "today" | "all" | "stats" | "archived";

interface HabitSidebarProps {
  categories: HabitCategory[];
  activeNav: HabitNav;
  activeCategoryId: string | null;
  counts: {
    today: number;
    todayDone: number;
    all: number;
    archived: number;
  };
  onSelectNav: (nav: HabitNav) => void;
  onSelectCategory: (id: string | null) => void;
  onNewCategory: () => void;
  onEditCategory: (category: HabitCategory) => void;
  onDeleteCategory: (id: string) => void;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export default function HabitSidebar({
  categories,
  activeNav,
  activeCategoryId,
  counts,
  onSelectNav,
  onSelectCategory,
  onNewCategory,
  onEditCategory,
  onDeleteCategory,
  mobileOpen = false,
  onMobileClose,
}: HabitSidebarProps) {
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [categoriesExpanded, setCategoriesExpanded] = useState(true);

  const navItems: { key: HabitNav; label: string; icon: React.ReactNode; count?: string }[] = [
    {
      key: "today",
      label: "Vandaag",
      count: `${counts.todayDone}/${counts.today}`,
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      ),
    },
    {
      key: "all",
      label: "Alle habits",
      count: counts.all > 0 ? String(counts.all) : undefined,
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <line x1="8" y1="6" x2="21" y2="6" />
          <line x1="8" y1="12" x2="21" y2="12" />
          <line x1="8" y1="18" x2="21" y2="18" />
          <line x1="3" y1="6" x2="3.01" y2="6" />
          <line x1="3" y1="12" x2="3.01" y2="12" />
          <line x1="3" y1="18" x2="3.01" y2="18" />
        </svg>
      ),
    },
    {
      key: "stats",
      label: "Statistieken",
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <line x1="18" y1="20" x2="18" y2="10" />
          <line x1="12" y1="20" x2="12" y2="4" />
          <line x1="6" y1="20" x2="6" y2="14" />
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

  const handleSelectNav = (nav: HabitNav) => {
    onSelectNav(nav);
    onSelectCategory(null);
    onMobileClose?.();
  };

  const handleSelectCategory = (id: string) => {
    onSelectCategory(id);
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
            const isActive = !activeCategoryId && activeNav === item.key;
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

        {/* Categories */}
        <div className="p-3 flex-1 overflow-y-auto">
          <button
            onClick={() => setCategoriesExpanded(!categoriesExpanded)}
            className="w-full flex items-center justify-between px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
          >
            <span>Categorieën</span>
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className={`transition-transform ${categoriesExpanded ? "rotate-90" : ""}`}
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>

          {categoriesExpanded && (
            <div className="mt-1 space-y-0.5">
              {categories.map((category) => {
                const isActive = activeCategoryId === category.id;
                return (
                  <div key={category.id} className="relative group">
                    <button
                      onClick={() => handleSelectCategory(category.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${
                        isActive
                          ? "bg-accent/10 text-accent font-medium"
                          : "text-foreground hover:bg-surface-hover"
                      }`}
                    >
                      {category.icon ? (
                        <span className="text-sm">{category.icon}</span>
                      ) : (
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: category.color }}
                        />
                      )}
                      <span className="flex-1 text-left truncate">{category.name}</span>
                      {(category._count?.habits ?? 0) > 0 && (
                        <span className={`text-xs ${isActive ? "text-accent/70" : "text-muted-foreground/60"}`}>
                          {category._count?.habits ?? 0}
                        </span>
                      )}
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuOpen(menuOpen === category.id ? null : category.id);
                      }}
                      className="absolute right-1 top-1/2 -translate-y-1/2 p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-surface-hover transition-all"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="text-muted-foreground">
                        <circle cx="12" cy="5" r="2" />
                        <circle cx="12" cy="12" r="2" />
                        <circle cx="12" cy="19" r="2" />
                      </svg>
                    </button>

                    {menuOpen === category.id && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(null)} />
                        <div className="absolute right-0 top-full mt-1 z-50 w-36 bg-card border border-border rounded-lg shadow-lg overflow-hidden">
                          <button
                            onClick={() => { setMenuOpen(null); onEditCategory(category); }}
                            className="w-full px-3 py-2 text-left text-sm text-foreground hover:bg-surface-hover transition-colors"
                          >
                            Bewerken
                          </button>
                          <button
                            onClick={() => { setMenuOpen(null); onDeleteCategory(category.id); }}
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
                onClick={onNewCategory}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-surface-hover transition-all"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Categorie toevoegen
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
