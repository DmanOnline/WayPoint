"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Person, PersonInteraction, PersonFollowUp, PersonLifeEvent, PersonRelationship, JournalPersonMention,
  getPersonType, getInitials, getInteractionType, daysSince, INTERACTION_TYPES,
  fmtBirthday, getAge, daysUntilBirthday, getDueDateStatus,
  getRelationshipHealth, getContactFrequency, HEALTH_CONFIG,
  LIFE_EVENT_ICONS, RELATIONSHIP_TYPES, getRelationshipType,
} from "@/lib/types/people";
import { getMood } from "@/lib/types/journal";
import SmartDateInput from "@/components/ui/SmartDateInput";

interface PersonDetailProps {
  person: Person;
  onUpdate: (updated: Person) => void;
  onEdit: () => void;
}

type SaveStatus = "idle" | "unsaved" | "saving" | "saved";

const MONTH_NAMES = ["jan", "feb", "mrt", "apr", "mei", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];

function fmtDate(iso: string) {
  const d = new Date(iso);
  return `${d.getDate()} ${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
}

export default function PersonDetail({ person, onUpdate, onEdit }: PersonDetailProps) {
  const [bio, setBio] = useState(person.bio ?? "");
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [interactions, setInteractions] = useState<PersonInteraction[]>(person.interactions ?? []);
  const [followUps, setFollowUps] = useState<PersonFollowUp[]>(person.followUps ?? []);
  const [lifeEvents, setLifeEvents] = useState<PersonLifeEvent[]>(person.lifeEvents ?? []);
  const [relationships, setRelationships] = useState<PersonRelationship[]>(person.relationships ?? []);
  // journalMentions is read-only (created from journal page), read directly from prop
  const journalMentions = person.journalMentions ?? [];

  // Interaction form
  const [showInteractionForm, setShowInteractionForm] = useState(false);
  const [intType, setIntType] = useState("general");
  const [intNotes, setIntNotes] = useState("");
  const [intDate, setIntDate] = useState(new Date().toISOString().slice(0, 10));
  const [addingInt, setAddingInt] = useState(false);

  // Follow-up form
  const [followUpInput, setFollowUpInput] = useState("");
  const [followUpDueDate, setFollowUpDueDate] = useState("");
  const [addingFollowUp, setAddingFollowUp] = useState(false);

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestBio = useRef(bio);

  // Life event form
  const [showLifeEventForm, setShowLifeEventForm] = useState(false);
  const [leTitle, setLeTitle] = useState("");
  const [leDate, setLeDate] = useState(new Date().toISOString().slice(0, 10));
  const [leDescription, setLeDescription] = useState("");
  const [leIcon, setLeIcon] = useState("📌");
  const [addingLifeEvent, setAddingLifeEvent] = useState(false);

  // Relationship form
  const [showRelForm, setShowRelForm] = useState(false);
  const [relSearch, setRelSearch] = useState("");
  const [relType, setRelType] = useState("friend");
  const [relLabel, setRelLabel] = useState("");
  const [relResults, setRelResults] = useState<{ id: string; name: string; avatarColor: string }[]>([]);
  const [addingRel, setAddingRel] = useState(false);

  // Sync when person data changes (including when detail data loads)
  useEffect(() => {
    setBio(person.bio ?? "");
    setInteractions(person.interactions ?? []);
    setFollowUps(person.followUps ?? []);
    setLifeEvents(person.lifeEvents ?? []);
    setRelationships(person.relationships ?? []);
    latestBio.current = person.bio ?? "";
  }, [person]);

  useEffect(() => { latestBio.current = bio; }, [bio]);

  const saveBio = useCallback(async () => {
    setSaveStatus("saving");
    try {
      const res = await fetch(`/api/people/${person.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bio: latestBio.current }),
      });
      if (res.ok) {
        const data = await res.json();
        onUpdate(data.person);
        setSaveStatus("saved");
        setTimeout(() => setSaveStatus("idle"), 2000);
      }
    } catch { setSaveStatus("idle"); }
  }, [person.id, onUpdate]);

  const scheduleSave = () => {
    setSaveStatus("unsaved");
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(saveBio, 1200);
  };

  const handlePin = async () => {
    const res = await fetch(`/api/people/${person.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isPinned: !person.isPinned }),
    });
    if (res.ok) { const d = await res.json(); onUpdate(d.person); }
  };

  const handleArchive = async () => {
    const res = await fetch(`/api/people/${person.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isArchived: !person.isArchived }),
    });
    if (res.ok) { const d = await res.json(); onUpdate(d.person); }
  };

  const handleAddInteraction = async () => {
    if (addingInt) return;
    setAddingInt(true);
    try {
      const res = await fetch(`/api/people/${person.id}/interactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: intDate, type: intType, notes: intNotes }),
      });
      if (res.ok) {
        const data = await res.json();
        setInteractions((prev) => [data.interaction, ...prev]);
        // refresh person for lastContactedAt
        const personRes = await fetch(`/api/people/${person.id}`);
        if (personRes.ok) { const d = await personRes.json(); onUpdate(d.person); }
        setIntNotes(""); setIntType("general"); setIntDate(new Date().toISOString().slice(0, 10));
        setShowInteractionForm(false);
      }
    } finally { setAddingInt(false); }
  };

  const handleDeleteInteraction = async (id: string) => {
    const res = await fetch(`/api/people/${person.id}/interactions`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ interactionId: id }),
    });
    if (res.ok) setInteractions((prev) => prev.filter((i) => i.id !== id));
  };

  const handleAddFollowUp = async () => {
    if (!followUpInput.trim() || addingFollowUp) return;
    setAddingFollowUp(true);
    try {
      const res = await fetch(`/api/people/${person.id}/followups`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: followUpInput, ...(followUpDueDate ? { dueDate: followUpDueDate } : {}) }),
      });
      if (res.ok) {
        const data = await res.json();
        setFollowUps((prev) => [...prev, data.followUp]);
        setFollowUpInput("");
        setFollowUpDueDate("");
      }
    } finally { setAddingFollowUp(false); }
  };

  // Track pending auto-delete timers for checked-off follow-ups
  const deleteTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const handleToggleFollowUp = async (id: string, isDone: boolean) => {
    // Optimistic: update UI immediately
    setFollowUps((prev) => prev.map((f) => f.id === id ? { ...f, isDone, doneAt: isDone ? new Date().toISOString() : null } : f));

    const res = await fetch(`/api/people/${person.id}/followups`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ followUpId: id, isDone }),
    });
    if (res.ok) {
      const data = await res.json();
      setFollowUps((prev) => prev.map((f) => f.id === id ? data.followUp : f));
    }

    // Auto-delete after 10s when checked off
    if (isDone) {
      const timer = setTimeout(async () => {
        deleteTimers.current.delete(id);
        const delRes = await fetch(`/api/people/${person.id}/followups`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ followUpId: id }),
        });
        if (delRes.ok) setFollowUps((prev) => prev.filter((f) => f.id !== id));
      }, 10000);
      deleteTimers.current.set(id, timer);
    } else {
      // Unchecked: cancel pending delete
      const existing = deleteTimers.current.get(id);
      if (existing) { clearTimeout(existing); deleteTimers.current.delete(id); }
    }
  };

  const handleEditFollowUp = async (id: string, newText: string) => {
    if (!newText.trim()) return;
    const res = await fetch(`/api/people/${person.id}/followups`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ followUpId: id, text: newText.trim() }),
    });
    if (res.ok) {
      const data = await res.json();
      setFollowUps((prev) => prev.map((f) => f.id === id ? data.followUp : f));
    }
  };

  const handleDeleteFollowUp = async (id: string) => {
    // Cancel any pending auto-delete timer
    const existing = deleteTimers.current.get(id);
    if (existing) { clearTimeout(existing); deleteTimers.current.delete(id); }
    const res = await fetch(`/api/people/${person.id}/followups`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ followUpId: id }),
    });
    if (res.ok) setFollowUps((prev) => prev.filter((f) => f.id !== id));
  };

  // Life event handlers
  const handleAddLifeEvent = async () => {
    if (!leTitle.trim() || addingLifeEvent) return;
    setAddingLifeEvent(true);
    try {
      const res = await fetch(`/api/people/${person.id}/life-events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: leDate, title: leTitle, description: leDescription || undefined, icon: leIcon }),
      });
      if (res.ok) {
        const data = await res.json();
        setLifeEvents((prev) => [data.lifeEvent, ...prev]);
        setLeTitle(""); setLeDescription(""); setLeIcon("📌"); setShowLifeEventForm(false);
      }
    } finally { setAddingLifeEvent(false); }
  };

  const handleDeleteLifeEvent = async (id: string) => {
    const res = await fetch(`/api/people/${person.id}/life-events`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lifeEventId: id }),
    });
    if (res.ok) setLifeEvents((prev) => prev.filter((e) => e.id !== id));
  };

  // Relationship handlers
  const searchPeople = async (query: string) => {
    if (!query.trim()) { setRelResults([]); return; }
    try {
      const res = await fetch(`/api/people?search=${encodeURIComponent(query)}`);
      if (res.ok) {
        const data = await res.json();
        // Filter out current person and already linked people
        const linkedIds = new Set(relationships.map((r) => r.otherPerson?.id));
        setRelResults(
          data.people
            .filter((p: any) => p.id !== person.id && !linkedIds.has(p.id))
            .slice(0, 5)
            .map((p: any) => ({ id: p.id, name: p.name, avatarColor: p.avatarColor }))
        );
      }
    } catch { /* ignore */ }
  };

  const handleAddRelationship = async (targetId: string) => {
    if (addingRel) return;
    setAddingRel(true);
    try {
      const res = await fetch(`/api/people/${person.id}/relationships`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetPersonId: targetId, type: relType, label: relLabel || undefined }),
      });
      if (res.ok) {
        const data = await res.json();
        setRelationships((prev) => [...prev, data.relationship]);
        setRelSearch(""); setRelResults([]); setRelLabel(""); setShowRelForm(false);
      }
    } finally { setAddingRel(false); }
  };

  const handleDeleteRelationship = async (id: string) => {
    const res = await fetch(`/api/people/${person.id}/relationships`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ relationshipId: id }),
    });
    if (res.ok) setRelationships((prev) => prev.filter((r) => r.id !== id));
  };

  const type = getPersonType(person.type);
  const initials = getInitials(person.name);
  const since = daysSince(person.lastContactedAt);
  const openFollowUps = followUps.filter((f) => !f.isDone);
  const doneFollowUps = followUps.filter((f) => f.isDone);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-start gap-4 px-6 md:px-10 pt-6 pb-5 border-b border-border flex-shrink-0">
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center text-lg font-bold text-white flex-shrink-0"
          style={{ backgroundColor: person.avatarColor }}
        >
          {initials}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold text-foreground">{person.name}</h1>
            {type && (
              <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ backgroundColor: `${type.color}20`, color: type.color }}>
                {type.label}
              </span>
            )}
            {person.tags && person.tags.length > 0 && person.tags.map((tag) => (
              <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-accent/10 text-accent">
                {tag}
              </span>
            ))}
          </div>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            {person.role && <span className="text-sm text-muted-foreground">{person.role}</span>}
            {person.company && <span className="text-sm text-muted-foreground">{person.role ? `bij ${person.company}` : person.company}</span>}
            {person.location && <span className="text-xs text-muted-foreground">📍 {person.location}</span>}
          </div>
          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
            {person.email && <a href={`mailto:${person.email}`} className="text-xs text-accent hover:underline">{person.email}</a>}
            {person.phone && <a href={`tel:${person.phone}`} className="text-xs text-muted-foreground hover:text-foreground">{person.phone}</a>}
            {person.birthday && (() => {
              const bday = fmtBirthday(person.birthday);
              const age = getAge(person.birthday);
              const daysUntil = daysUntilBirthday(person.birthday);
              const isSoon = daysUntil !== null && daysUntil <= 7;
              return (
                <span className={`text-xs ${isSoon ? "text-accent font-medium" : "text-muted-foreground"}`}>
                  🎂 {bday}{age !== null ? ` (${age})` : ""}{isSoon ? (daysUntil === 0 ? " — vandaag! 🎉" : ` — over ${daysUntil}d`) : ""}
                </span>
              );
            })()}
            {since !== null && (() => {
              const health = getRelationshipHealth(person.lastContactedAt, person.contactFrequency);
              const healthCfg = health ? HEALTH_CONFIG[health] : null;
              return (
                <span className={`text-xs flex items-center gap-1.5 ${since > 30 && !healthCfg ? "text-orange-400" : "text-muted-foreground"}`}>
                  {healthCfg && <span className={`w-2 h-2 rounded-full flex-shrink-0 ${healthCfg.dot}`} title={healthCfg.label} />}
                  Laatste contact: {since === 0 ? "vandaag" : since === 1 ? "gisteren" : `${since} dagen geleden`}
                  {healthCfg && <span style={{ color: healthCfg.color }}>· {healthCfg.label}</span>}
                </span>
              );
            })()}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <button onClick={handlePin} title={person.isPinned ? "Losmaken" : "Pinnen"}
            className={`p-2 rounded-lg transition-colors ${person.isPinned ? "text-accent" : "text-muted-foreground hover:text-foreground hover:bg-surface-hover"}`}>
            <svg className="w-4 h-4" fill={person.isPinned ? "currentColor" : "none"} viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0Z" />
            </svg>
          </button>
          <button onClick={handleArchive} title={person.isArchived ? "Dearchiveren" : "Archiveren"}
            className={`p-2 rounded-lg transition-colors ${person.isArchived ? "text-orange-400" : "text-muted-foreground hover:text-foreground hover:bg-surface-hover"}`}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0-3-3m3 3 3-3M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" />
            </svg>
          </button>
          <button onClick={onEdit} title="Bewerken"
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface-hover transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125" />
            </svg>
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-6 md:px-10 py-6 space-y-8">

        {/* Origin story */}
        {(person.metThrough || person.metAt) && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>🤝</span>
            <span>
              {person.metThrough && <span>Leren kennen: {person.metThrough}</span>}
              {person.metThrough && person.metAt && <span> · </span>}
              {person.metAt && <span>sinds {fmtDate(person.metAt)}</span>}
            </span>
          </div>
        )}

        {/* Bio */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Over {person.name.split(" ")[0]}</p>
            <span className={`text-xs transition-colors duration-300 ${
              saveStatus === "saved"   ? "text-green-500" :
              saveStatus === "unsaved" ? "text-orange-400" :
              "text-muted-foreground/60"
            }`}>
              {saveStatus === "saving"  && "Opslaan..."}
              {saveStatus === "saved"   && "Opgeslagen ✓"}
              {saveStatus === "unsaved" && "Niet opgeslagen"}
              {saveStatus === "idle"    && "Autosave actief"}
            </span>
          </div>
          <textarea
            value={bio}
            onChange={(e) => { setBio(e.target.value); scheduleSave(); }}
            placeholder={`Wat weet je over ${person.name.split(" ")[0]}? Achtergrond, interesses, context...`}
            className="w-full text-sm bg-transparent outline-none text-foreground/90 placeholder:text-muted-foreground/30 resize-none leading-relaxed min-h-[100px]"
            rows={5}
          />
        </div>

        {/* Follow-ups */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Follow-ups</p>
          <div className="space-y-1.5">
            {openFollowUps.map((f) => {
              const due = getDueDateStatus(f.dueDate);
              return (
                <div key={f.id} className="flex items-center gap-2 group">
                  <button onClick={() => handleToggleFollowUp(f.id, true)}
                    className="w-4 h-4 rounded border border-border hover:border-accent transition-colors flex-shrink-0" />
                  <input
                    type="text"
                    defaultValue={f.text}
                    onBlur={(e) => { if (e.target.value !== f.text) handleEditFollowUp(f.id, e.target.value); }}
                    onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
                    className="flex-1 text-sm text-foreground bg-transparent outline-none border-b border-transparent focus:border-border transition-colors"
                  />
                  {due && (
                    <span className={`text-[10px] flex-shrink-0 ${due.color}`}>
                      {due.color === "text-red-400" && "⚠️ "}{due.label}
                    </span>
                  )}
                  <button onClick={() => handleDeleteFollowUp(f.id)}
                    className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-400 transition-all">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              );
            })}

            {/* Add follow-up */}
            <div className="flex items-center gap-2 mt-2">
              <div className="w-4 h-4 rounded border border-border/40 flex-shrink-0" />
              <input
                type="text"
                value={followUpInput}
                onChange={(e) => setFollowUpInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddFollowUp()}
                placeholder="+ follow-up toevoegen"
                className="flex-1 text-sm bg-transparent outline-none text-foreground placeholder:text-muted-foreground/40"
              />
              <SmartDateInput
                value={followUpDueDate}
                onChange={setFollowUpDueDate}
                title="Deadline (optioneel)"
                className={`h-7 w-24 px-2 text-xs rounded-md border outline-none flex-shrink-0 transition-all ${
                  followUpDueDate
                    ? "border-accent/30 bg-accent/5 text-accent"
                    : "border-border/40 bg-transparent text-muted-foreground/50 hover:text-muted-foreground hover:border-border"
                }`}
              />
            </div>

            {/* Done follow-ups */}
            {doneFollowUps.length > 0 && (
              <div className="mt-3 space-y-1">
                {doneFollowUps.map((f) => {
                  const hasPendingDelete = deleteTimers.current.has(f.id);
                  return (
                    <div key={f.id} className="flex items-center gap-2 group opacity-50 hover:opacity-70 transition-opacity">
                      <button onClick={() => handleToggleFollowUp(f.id, false)}
                        title="Ongedaan maken"
                        className="w-4 h-4 rounded border border-green-500 bg-green-500/20 flex-shrink-0 flex items-center justify-center hover:bg-green-500/40 transition-colors">
                        <svg className="w-2.5 h-2.5 text-green-500" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                        </svg>
                      </button>
                      <span className="flex-1 text-sm line-through text-muted-foreground">{f.text}</span>
                      {hasPendingDelete && (
                        <span className="text-[10px] text-muted-foreground/50">wordt verwijderd...</span>
                      )}
                      <button onClick={() => handleDeleteFollowUp(f.id)}
                        className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-400 transition-all">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Interactions */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Contactmomenten</p>
            <button onClick={() => setShowInteractionForm(!showInteractionForm)}
              className="flex items-center gap-1 text-xs text-accent hover:text-accent/80 transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Loggen
            </button>
          </div>

          {showInteractionForm && (
            <div className="mb-4 p-4 rounded-xl border border-border bg-surface-hover space-y-3">
              <div className="flex flex-wrap gap-1.5">
                {INTERACTION_TYPES.map((t) => (
                  <button key={t.value} onClick={() => setIntType(t.value)}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs transition-all ${intType === t.value ? "bg-accent text-white" : "bg-surface border border-border text-muted-foreground hover:text-foreground"}`}>
                    {t.icon} {t.label}
                  </button>
                ))}
              </div>
              <SmartDateInput value={intDate} onChange={setIntDate}
                className="w-full px-3 py-1.5 rounded-lg bg-surface border border-border text-sm text-foreground outline-none focus:border-accent transition-colors" />
              <textarea value={intNotes} onChange={(e) => setIntNotes(e.target.value)}
                placeholder="Notities (optioneel)..."
                className="w-full px-3 py-2 rounded-lg bg-surface border border-border text-sm text-foreground outline-none focus:border-accent transition-colors resize-none"
                rows={2} />
              <div className="flex justify-end gap-2">
                <button onClick={() => setShowInteractionForm(false)} className="px-3 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground transition-colors">Annuleren</button>
                <button onClick={handleAddInteraction} disabled={addingInt}
                  className="px-3 py-1.5 rounded-lg text-xs bg-accent text-white hover:bg-accent/90 transition-colors disabled:opacity-50">
                  {addingInt ? "Opslaan..." : "Opslaan"}
                </button>
              </div>
            </div>
          )}

          {interactions.length === 0 ? (
            <p className="text-sm text-muted-foreground/40 italic">Nog geen contactmomenten gelogd.</p>
          ) : (
            <div className="space-y-2">
              {interactions.map((i) => {
                const itype = getInteractionType(i.type);
                return (
                  <div key={i.id} className="flex items-start gap-3 group">
                    <span className="text-base flex-shrink-0 mt-0.5">{itype.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-foreground">{itype.label}</span>
                        <span className="text-xs text-muted-foreground">{fmtDate(i.date)}</span>
                      </div>
                      {i.notes && <p className="text-sm text-muted-foreground mt-0.5 leading-relaxed">{i.notes}</p>}
                    </div>
                    <button onClick={() => handleDeleteInteraction(i.id)}
                      className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-400 transition-all flex-shrink-0 mt-0.5">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Life Events */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Levensgebeurtenissen</p>
            <button onClick={() => setShowLifeEventForm(!showLifeEventForm)}
              className="flex items-center gap-1 text-xs text-accent hover:text-accent/80 transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Toevoegen
            </button>
          </div>

          {showLifeEventForm && (
            <div className="mb-4 p-4 rounded-xl border border-border bg-surface-hover space-y-3">
              <div className="flex flex-wrap gap-1">
                {LIFE_EVENT_ICONS.map((icon) => (
                  <button key={icon} onClick={() => setLeIcon(icon)}
                    className={`w-8 h-8 rounded-lg text-base flex items-center justify-center transition-all ${leIcon === icon ? "bg-accent/20 ring-1 ring-accent" : "hover:bg-surface"}`}>
                    {icon}
                  </button>
                ))}
              </div>
              <input type="text" value={leTitle} onChange={(e) => setLeTitle(e.target.value)}
                placeholder="Wat is er gebeurd?"
                className="w-full px-3 py-1.5 rounded-lg bg-surface border border-border text-sm text-foreground outline-none focus:border-accent transition-colors" />
              <SmartDateInput value={leDate} onChange={setLeDate}
                className="w-full px-3 py-1.5 rounded-lg bg-surface border border-border text-sm text-foreground outline-none focus:border-accent transition-colors" />
              <textarea value={leDescription} onChange={(e) => setLeDescription(e.target.value)}
                placeholder="Beschrijving (optioneel)..."
                className="w-full px-3 py-2 rounded-lg bg-surface border border-border text-sm text-foreground outline-none focus:border-accent transition-colors resize-none"
                rows={2} />
              <div className="flex justify-end gap-2">
                <button onClick={() => setShowLifeEventForm(false)} className="px-3 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground transition-colors">Annuleren</button>
                <button onClick={handleAddLifeEvent} disabled={!leTitle.trim() || addingLifeEvent}
                  className="px-3 py-1.5 rounded-lg text-xs bg-accent text-white hover:bg-accent/90 transition-colors disabled:opacity-50">
                  {addingLifeEvent ? "Opslaan..." : "Opslaan"}
                </button>
              </div>
            </div>
          )}

          {lifeEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground/40 italic">Nog geen gebeurtenissen.</p>
          ) : (
            <div className="space-y-2 relative pl-4 before:absolute before:left-[5px] before:top-1 before:bottom-1 before:w-px before:bg-border">
              {lifeEvents.map((e) => (
                <div key={e.id} className="flex items-start gap-3 group relative">
                  <span className="text-base flex-shrink-0 -ml-4 bg-surface z-10">{e.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-foreground">{e.title}</span>
                      <span className="text-xs text-muted-foreground">{fmtDate(e.date)}</span>
                    </div>
                    {e.description && <p className="text-sm text-muted-foreground mt-0.5 leading-relaxed">{e.description}</p>}
                  </div>
                  <button onClick={() => handleDeleteLifeEvent(e.id)}
                    className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-400 transition-all flex-shrink-0 mt-0.5">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Relationships */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Relaties</p>
            <button onClick={() => setShowRelForm(!showRelForm)}
              className="flex items-center gap-1 text-xs text-accent hover:text-accent/80 transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Linken
            </button>
          </div>

          {showRelForm && (
            <div className="mb-4 p-4 rounded-xl border border-border bg-surface-hover space-y-3">
              <div className="flex flex-wrap gap-1.5">
                {RELATIONSHIP_TYPES.map((t) => (
                  <button key={t.value} onClick={() => setRelType(t.value)}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all ${relType === t.value ? "bg-accent text-white" : "bg-surface border border-border text-muted-foreground hover:text-foreground"}`}>
                    {t.label}
                  </button>
                ))}
              </div>
              <input type="text" value={relSearch}
                onChange={(e) => { setRelSearch(e.target.value); searchPeople(e.target.value); }}
                placeholder="Zoek persoon..."
                className="w-full px-3 py-1.5 rounded-lg bg-surface border border-border text-sm text-foreground outline-none focus:border-accent transition-colors" />
              {relResults.length > 0 && (
                <div className="space-y-1">
                  {relResults.map((p) => (
                    <button key={p.id} onClick={() => handleAddRelationship(p.id)}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-surface transition-colors text-left">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
                        style={{ backgroundColor: p.avatarColor }}>
                        {getInitials(p.name)}
                      </div>
                      <span className="text-sm text-foreground">{p.name}</span>
                    </button>
                  ))}
                </div>
              )}
              <div className="flex justify-end">
                <button onClick={() => { setShowRelForm(false); setRelSearch(""); setRelResults([]); }}
                  className="px-3 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground transition-colors">Sluiten</button>
              </div>
            </div>
          )}

          {relationships.length === 0 ? (
            <p className="text-sm text-muted-foreground/40 italic">Nog geen relaties gelinkt.</p>
          ) : (
            <div className="space-y-1.5">
              {relationships.map((r) => {
                const rtype = getRelationshipType(r.type);
                return (
                  <div key={r.id} className="flex items-center gap-2.5 group">
                    {r.otherPerson && (
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
                        style={{ backgroundColor: r.otherPerson.avatarColor }}>
                        {getInitials(r.otherPerson.name)}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <span className="text-sm text-foreground">{r.otherPerson?.name}</span>
                      {rtype && (
                        <span className="ml-1.5 text-[10px] text-muted-foreground">· {rtype.label}</span>
                      )}
                      {r.label && (
                        <span className="ml-1 text-[10px] text-muted-foreground/60">({r.label})</span>
                      )}
                    </div>
                    <button onClick={() => handleDeleteRelationship(r.id)}
                      className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-400 transition-all">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Journal mentions */}
        {journalMentions.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Journal</p>
            <div className="space-y-1.5">
              {journalMentions.map((m) => {
                const mood = m.journalEntry?.mood ? getMood(m.journalEntry.mood) : null;
                return (
                  <a key={m.id} href={`/journal?date=${m.journalEntry?.date?.slice(0, 10)}`}
                    className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-surface-hover transition-colors">
                    {mood && <span className="text-sm">{mood.emoji}</span>}
                    <span className="flex-1 text-sm text-foreground truncate">
                      {m.journalEntry?.title || fmtDate(m.journalEntry?.date ?? m.createdAt)}
                    </span>
                    <span className="text-[10px] text-muted-foreground">{fmtDate(m.journalEntry?.date ?? m.createdAt)}</span>
                  </a>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
