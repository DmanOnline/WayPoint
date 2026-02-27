"use client";

import { Person, PERSON_TYPES, isBirthdayWithin } from "@/lib/types/people";

export type PeopleNav = "all" | "pinned" | "archived" | string; // string for type filter

interface PeopleSidebarProps {
  people: Person[];
  archivedCount?: number;
  activeNav: PeopleNav;
  search: string;
  onSearchChange: (v: string) => void;
  onSelectNav: (nav: PeopleNav) => void;
  onNewPerson: () => void;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export default function PeopleSidebar({
  people,
  archivedCount = 0,
  activeNav,
  search,
  onSearchChange,
  onSelectNav,
  onNewPerson,
  mobileOpen = false,
  onMobileClose,
}: PeopleSidebarProps) {
  const pinnedCount = people.filter((p) => p.isPinned).length;
  const birthdayCount = people.filter((p) => isBirthdayWithin(p.birthday, 30)).length;
  const typeCounts = PERSON_TYPES.map((t) => ({
    ...t,
    count: people.filter((p) => p.type === t.value).length,
  }));
  const allTags = Array.from(new Set(people.flatMap((p) => p.tags ?? []))).sort();
  const tagCounts = allTags.map((tag) => ({
    tag,
    count: people.filter((p) => p.tags?.includes(tag)).length,
  }));

  const navBtn = (nav: PeopleNav, label: string, count: number, icon: React.ReactNode) => (
    <button
      key={nav}
      onClick={() => { onSelectNav(nav); onMobileClose?.(); }}
      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
        activeNav === nav
          ? "bg-accent/10 text-accent"
          : "text-muted-foreground hover:text-foreground hover:bg-surface-hover"
      }`}
    >
      <span className="flex-shrink-0">{icon}</span>
      <span className="flex-1 text-left">{label}</span>
      {count > 0 && (
        <span className="text-xs text-muted-foreground">{count}</span>
      )}
    </button>
  );

  const sidebarContent = (
    <div className="h-full flex flex-col">
      {/* Search */}
      <div className="px-3 pt-4 pb-2">
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-hover">
          <svg className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Zoeken..."
            className="flex-1 bg-transparent text-sm outline-none text-foreground placeholder:text-muted-foreground/50"
          />
          {search && (
            <button onClick={() => onSearchChange("")} className="text-muted-foreground hover:text-foreground">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Main nav */}
      <nav className="px-3 pb-2 space-y-0.5">
        {navBtn("dashboard", "Dashboard", 0, (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 0 0 6 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0 1 18 16.5h-2.25m-7.5 0h7.5m-7.5 0-1 3m8.5-3 1 3m0 0 .5 1.5m-.5-1.5h-9.5m0 0-.5 1.5" />
          </svg>
        ))}
        {navBtn("all", "Alle mensen", people.length, (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
          </svg>
        ))}
        {pinnedCount > 0 && navBtn("pinned", "Gepind", pinnedCount, (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0Z" />
          </svg>
        ))}
        {birthdayCount > 0 && navBtn("birthdays", "Verjaardagen", birthdayCount, (
          <span className="text-sm">🎂</span>
        ))}
        {archivedCount > 0 && navBtn("archived", "Gearchiveerd", archivedCount, (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0-3-3m3 3 3-3M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" />
          </svg>
        ))}
      </nav>

      <div className="border-t border-border mx-3 my-2" />

      {/* Type filters */}
      <div className="px-3 pb-2">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 px-1">Categorie</p>
        <div className="space-y-0.5">
          {typeCounts.filter((t) => t.count > 0).map((t) => (
            <button
              key={t.value}
              onClick={() => { onSelectNav(`type:${t.value}`); onMobileClose?.(); }}
              className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                activeNav === `type:${t.value}`
                  ? "bg-accent/10 text-accent"
                  : "text-muted-foreground hover:text-foreground hover:bg-surface-hover"
              }`}
            >
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: t.color }} />
              <span className="flex-1 text-left">{t.label}</span>
              <span className="text-xs text-muted-foreground">{t.count}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Tag filters */}
      {tagCounts.length > 0 && (
        <>
          <div className="border-t border-border mx-3 my-2" />
          <div className="px-3 pb-2">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 px-1">Tags</p>
            <div className="space-y-0.5">
              {tagCounts.map((t) => (
                <button
                  key={t.tag}
                  onClick={() => { onSelectNav(`tag:${t.tag}`); onMobileClose?.(); }}
                  className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                    activeNav === `tag:${t.tag}`
                      ? "bg-accent/10 text-accent"
                      : "text-muted-foreground hover:text-foreground hover:bg-surface-hover"
                  }`}
                >
                  <span className="text-xs">🏷</span>
                  <span className="flex-1 text-left truncate">{t.tag}</span>
                  <span className="text-xs text-muted-foreground">{t.count}</span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      <div className="flex-1" />

      {/* New person button */}
      <div className="px-3 py-3 border-t border-border">
        <button
          onClick={() => { onNewPerson(); onMobileClose?.(); }}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/90 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Persoon toevoegen
        </button>
      </div>
    </div>
  );

  return (
    <>
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 md:hidden" onClick={onMobileClose} />
      )}
      <aside className={`w-[240px] h-full border-r border-border bg-sidebar-bg flex-col overflow-hidden ${
        mobileOpen ? "flex fixed inset-y-0 left-0 z-50" : "hidden"
      } md:flex md:relative md:inset-auto`}>
        {sidebarContent}
      </aside>
    </>
  );
}
