"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { JournalEntry, ENERGY_LEVELS, toDateStr, getMood, getEnergy } from "@/lib/types/journal";
import MoodPicker from "./MoodPicker";

interface MentionPerson {
  id: string;
  name: string;
  avatarColor: string;
}

interface JournalEditorProps {
  date: Date;
  entry: JournalEntry | null;
  allEntries: JournalEntry[];
  onSaved: (entry: JournalEntry) => void;
  onDelete: (id: string) => Promise<void>;
}

type SaveStatus = "idle" | "unsaved" | "saving" | "saved" | "error";

const MONTH_NAMES = [
  "januari", "februari", "maart", "april", "mei", "juni",
  "juli", "augustus", "september", "oktober", "november", "december",
];
const DAY_NAMES = ["zondag", "maandag", "dinsdag", "woensdag", "donderdag", "vrijdag", "zaterdag"];

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function calcStreak(entries: JournalEntry[], today: Date): number {
  const todayStr = toDateStr(today);
  const dateSet = new Set(entries.map((e) => toDateStr(new Date(e.date))));
  let streak = 0;
  const check = new Date(today);
  for (let i = 0; i < 365; i++) {
    const ds = toDateStr(check);
    if (dateSet.has(ds) || (i === 0 && !dateSet.has(todayStr))) {
      // Day 0: if today has no entry yet, don't break streak — check yesterday
      if (i === 0 && !dateSet.has(todayStr)) {
        check.setDate(check.getDate() - 1);
        continue;
      }
      streak++;
      check.setDate(check.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}

function getInitials(name: string): string {
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

export default function JournalEditor({ date, entry, allEntries, onSaved, onDelete }: JournalEditorProps) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [mood, setMood] = useState<number | null>(null);
  const [moodNote, setMoodNote] = useState("");
  const [energy, setEnergy] = useState<number | null>(null);
  const [gratitude1, setGratitude1] = useState("");
  const [gratitude2, setGratitude2] = useState("");
  const [gratitude3, setGratitude3] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // @-mention state
  const [mentionedPeople, setMentionedPeople] = useState<MentionPerson[]>([]);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null); // null = popup closed
  const [mentionIndex, setMentionIndex] = useState(0);
  const [allPeople, setAllPeople] = useState<MentionPerson[]>([]);
  const [mentionPos, setMentionPos] = useState<{ top: number; left: number } | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mentionStartRef = useRef<number | null>(null); // cursor position of the @

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSaving = useRef(false);
  const latestData = useRef({ title, content, mood, moodNote, energy, gratitude1, gratitude2, gratitude3, tags, mentionedPersonIds: [] as string[] });

  // Fetch all people once for @-mention autocomplete
  useEffect(() => {
    async function fetchPeople() {
      try {
        const res = await fetch("/api/people");
        if (res.ok) {
          const data = await res.json();
          setAllPeople(data.people.map((p: MentionPerson) => ({ id: p.id, name: p.name, avatarColor: p.avatarColor })));
        }
      } catch { /* ignore */ }
    }
    fetchPeople();
  }, []);

  // Sync state when date/entry changes
  useEffect(() => {
    setTitle(entry?.title ?? "");
    setContent(entry?.content ?? "");
    setMood(entry?.mood ?? null);
    setMoodNote(entry?.moodNote ?? "");
    setEnergy(entry?.energy ?? null);
    setGratitude1(entry?.gratitude1 ?? "");
    setGratitude2(entry?.gratitude2 ?? "");
    setGratitude3(entry?.gratitude3 ?? "");
    setTags(entry?.tags ?? []);
    setTagInput("");
    setSaveStatus("idle");
    setMentionQuery(null);
    // Load existing mentions from entry
    const mentions = entry?.personMentions?.map((m) => ({
      id: m.person.id,
      name: m.person.name,
      avatarColor: m.person.avatarColor,
    })) ?? [];
    setMentionedPeople(mentions);
  }, [entry, date]);

  // Keep ref in sync
  useEffect(() => {
    latestData.current = {
      title, content, mood, moodNote, energy, gratitude1, gratitude2, gratitude3, tags,
      mentionedPersonIds: mentionedPeople.map((p) => p.id),
    };
  }, [title, content, mood, moodNote, energy, gratitude1, gratitude2, gratitude3, tags, mentionedPeople]);

  const save = useCallback(async () => {
    if (isSaving.current) return;
    isSaving.current = true;
    setSaveStatus("saving");
    const d = latestData.current;
    try {
      const res = await fetch("/api/journal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: toDateStr(date),
          title: d.title || null,
          content: d.content,
          mood: d.mood,
          moodNote: d.moodNote || null,
          energy: d.energy,
          gratitude1: d.gratitude1 || null,
          gratitude2: d.gratitude2 || null,
          gratitude3: d.gratitude3 || null,
          tags: d.tags,
          mentionedPersonIds: d.mentionedPersonIds,
        }),
      });
      if (!res.ok) throw new Error("Save failed");
      const data = await res.json();
      onSaved(data.entry);
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
    } catch {
      setSaveStatus("error");
    } finally {
      isSaving.current = false;
    }
  }, [date, onSaved]);

  const scheduleSave = useCallback(() => {
    setSaveStatus("unsaved");
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(save, 1200);
  }, [save]);

  const scheduleFastSave = useCallback(() => {
    setSaveStatus("unsaved");
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(save, 300);
  }, [save]);

  const handleMoodChange = (v: number | null) => {
    setMood(v);
    latestData.current = { ...latestData.current, mood: v };
    scheduleFastSave();
  };

  const handleEnergyChange = (v: number | null) => {
    setEnergy(v);
    latestData.current = { ...latestData.current, energy: v };
    scheduleFastSave();
  };

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if ((e.key === "Enter" || e.key === ",") && tagInput.trim()) {
      e.preventDefault();
      const tag = tagInput.trim().toLowerCase();
      if (!tags.includes(tag)) {
        const newTags = [...tags, tag];
        setTags(newTags);
        latestData.current = { ...latestData.current, tags: newTags };
        scheduleSave();
      }
      setTagInput("");
    }
    if (e.key === "Backspace" && !tagInput && tags.length > 0) {
      const newTags = tags.slice(0, -1);
      setTags(newTags);
      latestData.current = { ...latestData.current, tags: newTags };
      scheduleSave();
    }
  };

  const removeTag = (tag: string) => {
    const newTags = tags.filter((t) => t !== tag);
    setTags(newTags);
    latestData.current = { ...latestData.current, tags: newTags };
    scheduleSave();
  };

  const removeMention = (personId: string) => {
    const updated = mentionedPeople.filter((p) => p.id !== personId);
    setMentionedPeople(updated);
    latestData.current = { ...latestData.current, mentionedPersonIds: updated.map((p) => p.id) };
    scheduleSave();
  };

  const handleDelete = async () => {
    if (!entry) return;
    await onDelete(entry.id);
    setShowDeleteConfirm(false);
  };

  // @-mention: filtered results
  const mentionResults = useMemo(() => {
    if (mentionQuery === null) return [];
    const q = mentionQuery.toLowerCase();
    const mentionedIds = new Set(mentionedPeople.map((p) => p.id));
    return allPeople
      .filter((p) => !mentionedIds.has(p.id) && p.name.toLowerCase().includes(q))
      .slice(0, 6);
  }, [mentionQuery, allPeople, mentionedPeople]);

  // Calculate popup position based on cursor in textarea
  const updateMentionPosition = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea || mentionStartRef.current === null) return;

    // Create a mirror div to measure cursor position
    const mirror = document.createElement("div");
    const style = window.getComputedStyle(textarea);
    mirror.style.cssText = `
      position: absolute; visibility: hidden; white-space: pre-wrap; word-wrap: break-word;
      width: ${style.width}; font: ${style.font}; padding: ${style.padding};
      border: ${style.border}; line-height: ${style.lineHeight}; letter-spacing: ${style.letterSpacing};
    `;
    const textBefore = textarea.value.substring(0, mentionStartRef.current);
    mirror.textContent = textBefore;
    const marker = document.createElement("span");
    marker.textContent = "@";
    mirror.appendChild(marker);
    document.body.appendChild(mirror);

    const rect = textarea.getBoundingClientRect();
    const markerRect = marker.getBoundingClientRect();
    const mirrorRect = mirror.getBoundingClientRect();

    const top = rect.top + (markerRect.top - mirrorRect.top) - textarea.scrollTop + 24;
    const left = rect.left + (markerRect.left - mirrorRect.left);

    document.body.removeChild(mirror);
    setMentionPos({ top, left: Math.min(left, window.innerWidth - 260) });
  }, []);

  // Handle content change with @-detection
  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setContent(val);
    scheduleSave();

    // Reconcile: remove mentioned people whose @Name is no longer in the content
    const remaining = mentionedPeople.filter((p) => val.includes(`@${p.name}`));
    if (remaining.length !== mentionedPeople.length) {
      setMentionedPeople(remaining);
      latestData.current = { ...latestData.current, content: val, mentionedPersonIds: remaining.map((p) => p.id) };
    }

    const cursorPos = e.target.selectionStart;

    // Check if we're in an @-mention context
    // Look backward from cursor to find @ that starts a mention
    const textBeforeCursor = val.substring(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf("@");

    if (lastAtIndex >= 0) {
      // Check that @ is at start of line or preceded by whitespace
      const charBefore = lastAtIndex > 0 ? textBeforeCursor[lastAtIndex - 1] : " ";
      if (charBefore === " " || charBefore === "\n" || lastAtIndex === 0) {
        const query = textBeforeCursor.substring(lastAtIndex + 1);
        // Only show popup if query doesn't contain spaces (still typing the name)
        // Allow spaces in query to match multi-word names
        if (!query.includes("\n")) {
          mentionStartRef.current = lastAtIndex;
          setMentionQuery(query);
          setMentionIndex(0);
          // Position after state update
          setTimeout(updateMentionPosition, 0);
          return;
        }
      }
    }

    // No active mention context
    setMentionQuery(null);
    mentionStartRef.current = null;
  };

  // Insert a mention into the content
  const insertMention = useCallback((person: MentionPerson) => {
    const textarea = textareaRef.current;
    if (!textarea || mentionStartRef.current === null) return;

    const start = mentionStartRef.current;
    const cursorPos = textarea.selectionStart;
    const before = content.substring(0, start);
    const after = content.substring(cursorPos);
    const newContent = `${before}@${person.name} ${after}`;

    setContent(newContent);
    setMentionQuery(null);
    mentionStartRef.current = null;

    // Add to mentioned people if not already there
    if (!mentionedPeople.find((p) => p.id === person.id)) {
      const updated = [...mentionedPeople, person];
      setMentionedPeople(updated);
      latestData.current = { ...latestData.current, content: newContent, mentionedPersonIds: updated.map((p) => p.id) };
    } else {
      latestData.current = { ...latestData.current, content: newContent };
    }

    scheduleSave();

    // Restore cursor position after the inserted name
    const newCursorPos = start + person.name.length + 2; // @ + name + space
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  }, [content, mentionedPeople, scheduleSave]);

  // Handle keyboard navigation in mention popup
  const handleContentKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (mentionQuery !== null && mentionResults.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setMentionIndex((prev) => Math.min(prev + 1, mentionResults.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setMentionIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        insertMention(mentionResults[mentionIndex]);
      } else if (e.key === "Escape") {
        e.preventDefault();
        setMentionQuery(null);
        mentionStartRef.current = null;
      }
    }
  };

  // Close mention popup on blur (with delay to allow clicks)
  const handleContentBlur = () => {
    setTimeout(() => {
      setMentionQuery(null);
      mentionStartRef.current = null;
    }, 200);
  };

  // Highlight backdrop: render content with @mentions styled
  const backdropRef = useRef<HTMLDivElement>(null);
  const mentionNames = useMemo(() => new Set(mentionedPeople.map((p) => p.name)), [mentionedPeople]);

  const highlightedContent = useMemo(() => {
    if (mentionNames.size === 0) return null;
    // Build regex to match all mentioned @Names
    const escaped = [...mentionNames].map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
    const regex = new RegExp(`(@(?:${escaped.join("|")}))`, "g");
    const parts = content.split(regex);
    return parts.map((part, i) => {
      if (regex.test(part)) {
        regex.lastIndex = 0;
        return <span key={i} className="text-accent font-medium">{part}</span>;
      }
      regex.lastIndex = 0;
      // Normal text: same color as textarea would have
      return <span key={i} className="text-foreground/90">{part}</span>;
    });
  }, [content, mentionNames]);

  // Sync scroll between textarea and backdrop
  const handleContentScroll = useCallback(() => {
    if (textareaRef.current && backdropRef.current) {
      backdropRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  }, []);

  const today = new Date();
  const isFuture = date > today;
  const moodConfig = getMood(mood);
  const energyConfig = getEnergy(energy);
  const wordCount = useMemo(() => countWords(content), [content]);
  const streak = useMemo(() => calcStreak(allEntries, today), [allEntries]);

  const isToday = toDateStr(date) === toDateStr(today);
  const dateLabel = isToday
    ? "Vandaag"
    : `${DAY_NAMES[date.getDay()]} ${date.getDate()} ${MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}`;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 md:px-10 pt-6 pb-3 flex-shrink-0 border-b border-border">
        <div className="flex items-center gap-4">
          <h1 className="text-xl md:text-2xl font-bold text-foreground capitalize">{dateLabel}</h1>
          {streak > 0 && (
            <span className="flex items-center gap-1 text-xs font-semibold text-orange-400 bg-orange-400/10 px-2 py-0.5 rounded-full">
              🔥 {streak} dag{streak !== 1 ? "en" : ""}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {wordCount > 0 && (
            <span className="text-xs text-muted-foreground">
              {wordCount} {wordCount === 1 ? "woord" : "woorden"}
            </span>
          )}
          <span
            className={`text-xs transition-colors duration-300 ${
              saveStatus === "saved"    ? "text-green-500" :
              saveStatus === "error"    ? "text-red-500" :
              saveStatus === "unsaved"  ? "text-orange-400" :
              "text-muted-foreground/60"
            }`}
          >
            {saveStatus === "saving"   && "Opslaan..."}
            {saveStatus === "saved"    && "Opgeslagen ✓"}
            {saveStatus === "error"    && "Fout bij opslaan"}
            {saveStatus === "unsaved"  && "Niet-opgeslagen wijzigingen"}
            {saveStatus === "idle"     && (entry ? "Alles opgeslagen" : "Autosave actief")}
          </span>

          {entry && (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-400/10 transition-all"
              title="Verwijder entry"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {isFuture ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground text-sm">Je kunt niet journallen over de toekomst.</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto px-6 md:px-10 py-6">

          {/* Mood + Energie row */}
          <div className="flex flex-wrap gap-8 mb-7">
            {/* Mood */}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Stemming</p>
              <div className="pb-5">
                <MoodPicker value={mood} onChange={handleMoodChange} />
              </div>
              {mood && (
                <input
                  type="text"
                  value={moodNote}
                  onChange={(e) => { setMoodNote(e.target.value); scheduleSave(); }}
                  placeholder={`Waarom ${moodConfig?.label.toLowerCase()}?`}
                  className="w-full text-sm bg-transparent border-b border-border focus:border-accent outline-none py-1 text-foreground placeholder:text-muted-foreground/50 transition-colors"
                />
              )}
            </div>

            {/* Energie */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Energie</p>
              <div className="flex items-center gap-1.5 pb-5">
                {ENERGY_LEVELS.map((level) => {
                  const isSelected = energy === level.value;
                  return (
                    <button
                      key={level.value}
                      onClick={() => handleEnergyChange(isSelected ? null : level.value)}
                      title={level.label}
                      className="relative flex flex-col items-center gap-1 transition-all duration-150"
                    >
                      <span
                        className={`text-2xl transition-all duration-150 ${
                          isSelected
                            ? "scale-125"
                            : "opacity-40 hover:opacity-80 hover:scale-110"
                        }`}
                        style={isSelected ? { filter: `drop-shadow(0 0 6px ${level.color})` } : {}}
                      >
                        {level.icon}
                      </span>
                      {isSelected && (
                        <span
                          className="absolute -bottom-5 text-[10px] font-medium whitespace-nowrap"
                          style={{ color: level.color }}
                        >
                          {level.label}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Title */}
          <input
            type="text"
            value={title}
            onChange={(e) => { setTitle(e.target.value); scheduleSave(); }}
            placeholder="Titel (optioneel)"
            className="w-full text-lg font-semibold bg-transparent outline-none text-foreground placeholder:text-muted-foreground/30 mb-3"
          />

          {/* Content with @-mention highlight overlay */}
          <div className="relative min-h-[45vh]">
            {/* Highlight backdrop — mirrors textarea text with @mentions styled in accent color */}
            {highlightedContent && (
              <div
                ref={backdropRef}
                aria-hidden
                className="absolute inset-0 text-base leading-relaxed whitespace-pre-wrap break-words overflow-hidden pointer-events-none"
              >
                {highlightedContent}
                {/* Extra space to match textarea scrollable area */}
                {"\n"}
              </div>
            )}

            <textarea
              ref={textareaRef}
              value={content}
              onChange={handleContentChange}
              onKeyDown={handleContentKeyDown}
              onBlur={handleContentBlur}
              onScroll={handleContentScroll}
              placeholder={`Schrijf hier je gedachten van ${isToday ? "vandaag" : "deze dag"}... (typ @ om iemand te taggen)`}
              className={`w-full text-base bg-transparent outline-none resize-none leading-relaxed min-h-[45vh] relative z-10 placeholder:text-muted-foreground/30 ${
                highlightedContent ? "text-transparent caret-foreground selection:bg-accent/20" : "text-foreground/90"
              }`}
            />

            {/* @-mention popup */}
            {mentionQuery !== null && mentionResults.length > 0 && mentionPos && (
              <div
                className="fixed z-50 w-56 bg-surface border border-border rounded-xl shadow-2xl overflow-hidden"
                style={{ top: mentionPos.top, left: mentionPos.left }}
              >
                <div className="p-1">
                  {mentionResults.map((person, idx) => (
                    <button
                      key={person.id}
                      onMouseDown={(e) => { e.preventDefault(); insertMention(person); }}
                      className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-colors ${
                        idx === mentionIndex
                          ? "bg-accent/10 text-accent"
                          : "text-foreground hover:bg-surface-hover"
                      }`}
                    >
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0"
                        style={{ backgroundColor: person.avatarColor }}
                      >
                        {getInitials(person.name)}
                      </div>
                      <span className="truncate">{person.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Mentioned people chips */}
          {mentionedPeople.length > 0 && (
            <div className="flex items-center flex-wrap gap-1.5 mt-2 mb-4">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mr-1">Getagd:</span>
              {mentionedPeople.map((person) => (
                <span
                  key={person.id}
                  className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs bg-accent/10 text-accent"
                >
                  <span
                    className="w-3.5 h-3.5 rounded-full flex items-center justify-center text-[6px] font-bold text-white flex-shrink-0"
                    style={{ backgroundColor: person.avatarColor }}
                  >
                    {getInitials(person.name)}
                  </span>
                  {person.name}
                  <button onClick={() => removeMention(person.id)} className="hover:text-accent/60 transition-colors ml-0.5">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                    </svg>
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Dankbaarheid */}
          <div className="mt-6 pt-5 border-t border-border">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Dankbaarheid
            </p>
            <div className="space-y-2.5">
              {[
                { value: gratitude1, setter: setGratitude1, key: "g1", placeholder: "Ik ben dankbaar voor..." },
                { value: gratitude2, setter: setGratitude2, key: "g2", placeholder: "Ik ben dankbaar voor..." },
                { value: gratitude3, setter: setGratitude3, key: "g3", placeholder: "Ik ben dankbaar voor..." },
              ].map(({ value, setter, key, placeholder }, idx) => (
                <div key={key} className="flex items-center gap-2.5">
                  <span className="text-sm text-muted-foreground/50 w-4 flex-shrink-0 text-right">{idx + 1}.</span>
                  <input
                    type="text"
                    value={value}
                    onChange={(e) => {
                      setter(e.target.value);
                      // update ref directly
                      const field = `gratitude${idx + 1}` as "gratitude1" | "gratitude2" | "gratitude3";
                      latestData.current = { ...latestData.current, [field]: e.target.value };
                      scheduleSave();
                    }}
                    placeholder={placeholder}
                    className="flex-1 text-sm bg-transparent border-b border-border/50 focus:border-accent outline-none py-1 text-foreground placeholder:text-muted-foreground/30 transition-colors"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Tags */}
          <div className="mt-5 pt-4 border-t border-border">
            <div className="flex items-center flex-wrap gap-1.5">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-accent/10 text-accent"
                >
                  #{tag}
                  <button onClick={() => removeTag(tag)} className="hover:text-accent/60 transition-colors ml-0.5">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                    </svg>
                  </button>
                </span>
              ))}
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleTagKeyDown}
                placeholder="+ tag"
                className="text-xs bg-transparent outline-none text-muted-foreground placeholder:text-muted-foreground/40 w-16"
              />
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-surface border border-border rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl">
            <h3 className="font-semibold text-foreground mb-2">Entry verwijderen?</h3>
            <p className="text-sm text-muted-foreground mb-5">
              Dit verwijdert je journalentry van {toDateStr(date)} permanent.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-surface-hover transition-colors"
              >
                Annuleren
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 rounded-lg text-sm bg-red-500 text-white hover:bg-red-600 transition-colors"
              >
                Verwijderen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
