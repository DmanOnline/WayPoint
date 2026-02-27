"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { Person, PersonFormData, isBirthdayWithin, daysUntilBirthday } from "@/lib/types/people";
import PeopleSidebar, { PeopleNav } from "@/components/people/PeopleSidebar";
import PersonCard from "@/components/people/PersonCard";
import PersonDetail from "@/components/people/PersonDetail";
import PersonModal from "@/components/people/PersonModal";
import PeopleDashboard from "@/components/people/PeopleDashboard";

export default function PeoplePage() {
  const searchParams = useSearchParams();
  const [people, setPeople] = useState<Person[]>([]);
  const [archivedPeople, setArchivedPeople] = useState<Person[]>([]);
  const [archivedLoaded, setArchivedLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(searchParams.get("person"));
  const [nav, setNav] = useState<PeopleNav>("all");
  const [search, setSearch] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [modal, setModal] = useState<{ open: boolean; person?: Person }>({ open: false });

  const fetchPeople = useCallback(async () => {
    try {
      const res = await fetch("/api/people");
      if (res.ok) {
        const data = await res.json();
        setPeople(data.people);
      }
    } catch (err) {
      console.error("People ophalen mislukt:", err);
    }
  }, []);

  const fetchArchivedPeople = useCallback(async () => {
    try {
      const res = await fetch("/api/people?archived=true");
      if (res.ok) {
        const data = await res.json();
        setArchivedPeople(data.people);
        setArchivedLoaded(true);
      }
    } catch (err) {
      console.error("Gearchiveerde mensen ophalen mislukt:", err);
    }
  }, []);

  // Fetch person detail (with interactions + followUps) when selected
  const fetchPersonDetail = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/people/${id}`);
      if (res.ok) {
        const data = await res.json();
        setPeople((prev) => prev.map((p) => p.id === id ? data.person : p));
      }
    } catch (err) {
      console.error("Persoon ophalen mislukt:", err);
    }
  }, []);

  useEffect(() => {
    async function init() {
      setLoading(true);
      await Promise.all([fetchPeople(), fetchArchivedPeople()]);
      setLoading(false);
    }
    init();
  }, [fetchPeople, fetchArchivedPeople]);

  // Load detail when selecting a person
  useEffect(() => {
    if (selectedId) fetchPersonDetail(selectedId);
  }, [selectedId, fetchPersonDetail]);

  const filteredPeople = useMemo(() => {
    let list = nav === "archived" ? archivedPeople : people;
    if (nav === "pinned") list = list.filter((p) => p.isPinned);
    else if (nav === "birthdays") {
      list = list.filter((p) => isBirthdayWithin(p.birthday, 30));
      list.sort((a, b) => (daysUntilBirthday(a.birthday) ?? 999) - (daysUntilBirthday(b.birthday) ?? 999));
    }
    else if (nav.startsWith("type:")) list = list.filter((p) => p.type === nav.slice(5));
    else if (nav.startsWith("tag:")) {
      const tag = nav.slice(4);
      list = list.filter((p) => p.tags?.includes(tag));
    }
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((p) =>
        p.name.toLowerCase().includes(q) ||
        p.company?.toLowerCase().includes(q) ||
        p.bio?.toLowerCase().includes(q) ||
        p.tags?.some((t) => t.toLowerCase().includes(q))
      );
    }
    return list;
  }, [people, archivedPeople, nav, search]);

  const selectedPerson = people.find((p) => p.id === selectedId) ?? archivedPeople.find((p) => p.id === selectedId) ?? null;

  const handleSave = async (data: PersonFormData) => {
    if (modal.person) {
      const res = await fetch(`/api/people/${modal.person.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        const d = await res.json();
        setPeople((prev) => prev.map((p) => p.id === modal.person!.id ? d.person : p));
      }
    } else {
      const res = await fetch("/api/people", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        const d = await res.json();
        setPeople((prev) => [d.person, ...prev]);
        setSelectedId(d.person.id);
      }
    }
  };

  const handleDelete = async () => {
    if (!modal.person) return;
    const res = await fetch(`/api/people/${modal.person.id}`, { method: "DELETE" });
    if (res.ok) {
      setPeople((prev) => prev.filter((p) => p.id !== modal.person!.id));
      if (selectedId === modal.person.id) setSelectedId(null);
    }
  };

  const handleUpdate = (updated: Person) => {
    if (updated.isArchived) {
      // Move from active to archived
      setPeople((prev) => prev.filter((p) => p.id !== updated.id));
      setArchivedPeople((prev) => {
        const exists = prev.some((p) => p.id === updated.id);
        return exists ? prev.map((p) => p.id === updated.id ? updated : p) : [updated, ...prev];
      });
    } else {
      // Move from archived to active (or just update)
      setArchivedPeople((prev) => prev.filter((p) => p.id !== updated.id));
      setPeople((prev) => {
        const exists = prev.some((p) => p.id === updated.id);
        return exists ? prev.map((p) => p.id === updated.id ? updated : p) : [updated, ...prev];
      });
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-muted-foreground">People laden...</span>
        </div>
      </div>
    );
  }

  const navLabel: Record<string, string> = {
    all: "Alle mensen",
    pinned: "Gepind",
    birthdays: "Verjaardagen",
    dashboard: "Dashboard",
    archived: "Gearchiveerd",
  };
  const listTitle = nav.startsWith("type:")
    ? nav.slice(5).charAt(0).toUpperCase() + nav.slice(6)
    : nav.startsWith("tag:")
    ? `Tag: ${nav.slice(4)}`
    : (navLabel[nav] ?? "People");

  return (
    <div className="flex-1 flex h-full overflow-hidden">
      <PeopleSidebar
        people={people}
        archivedCount={archivedPeople.length}
        activeNav={nav}
        search={search}
        onSearchChange={setSearch}
        onSelectNav={setNav}
        onNewPerson={() => setModal({ open: true })}
        mobileOpen={sidebarOpen}
        onMobileClose={() => setSidebarOpen(false)}
      />

      {/* List column — hidden on mobile when detail is open, hidden entirely on dashboard */}
      <div className={`w-full md:w-72 flex-shrink-0 flex flex-col border-r border-border overflow-hidden ${nav === "dashboard" ? "hidden" : selectedPerson ? "hidden md:flex" : "flex"}`}>
        {/* List header */}
        <div className="flex items-center gap-2 px-4 pt-5 pb-3 flex-shrink-0">
          <button onClick={() => setSidebarOpen(true)} className="p-1.5 -ml-1.5 rounded-lg hover:bg-surface-hover transition-colors md:hidden">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <h2 className="text-base font-bold text-foreground flex-1">{listTitle}</h2>
          <span className="text-xs text-muted-foreground">{filteredPeople.length}</span>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-1">
          {filteredPeople.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center px-4">
              <p className="text-3xl mb-3">👥</p>
              <p className="text-sm font-medium text-foreground/60">
                {search ? "Geen resultaten" : "Nog niemand toegevoegd"}
              </p>
              {!search && (
                <button onClick={() => setModal({ open: true })}
                  className="mt-3 text-xs text-accent hover:text-accent/80 transition-colors">
                  Voeg iemand toe
                </button>
              )}
            </div>
          ) : (
            filteredPeople.map((person) => (
              <PersonCard
                key={person.id}
                person={person}
                isSelected={selectedId === person.id}
                onClick={() => setSelectedId(selectedId === person.id ? null : person.id)}
              />
            ))
          )}
        </div>
      </div>

      {/* Detail pane — full width on mobile when person selected */}
      <div className={`flex-1 flex flex-col overflow-hidden min-w-0 ${selectedPerson || nav === "dashboard" ? "flex" : "hidden md:flex"}`}>
        {nav === "dashboard" ? (
          <PeopleDashboard people={people} onSelectPerson={(id) => { setSelectedId(id); setNav("all"); }} />
        ) : selectedPerson ? (
          <>
            {/* Mobile back button */}
            <div className="md:hidden flex items-center gap-2 px-4 pt-3 pb-1 border-b border-border flex-shrink-0">
              <button onClick={() => setSelectedId(null)} className="flex items-center gap-1.5 text-sm text-accent">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
                </svg>
                Terug
              </button>
            </div>
            <PersonDetail
              person={selectedPerson}
              onUpdate={handleUpdate}
              onEdit={() => setModal({ open: true, person: selectedPerson })}
            />
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-center">
            <div>
              <p className="text-4xl mb-3">👤</p>
              <p className="text-sm text-muted-foreground">Selecteer iemand om te bekijken</p>
              <button onClick={() => setModal({ open: true })}
                className="mt-4 px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/90 transition-colors">
                Persoon toevoegen
              </button>
            </div>
          </div>
        )}
      </div>

      <PersonModal
        open={modal.open}
        person={modal.person}
        onClose={() => setModal({ open: false })}
        onSave={handleSave}
        onDelete={modal.person ? handleDelete : undefined}
      />
    </div>
  );
}
