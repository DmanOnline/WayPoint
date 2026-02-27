"use client";

import { useState, useEffect } from "react";
import { Person, PersonFormData, PERSON_TYPES, CONTACT_FREQUENCIES } from "@/lib/types/people";
import SmartDateInput from "@/components/ui/SmartDateInput";

const AVATAR_COLORS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#ef4444", "#f97316",
  "#eab308", "#22c55e", "#10b981", "#3b82f6", "#06b6d4",
];

interface PersonModalProps {
  open: boolean;
  person?: Person;
  onClose: () => void;
  onSave: (data: PersonFormData) => Promise<void>;
  onDelete?: () => Promise<void>;
}

export default function PersonModal({ open, person, onClose, onSave, onDelete }: PersonModalProps) {
  const [name, setName] = useState("");
  const [nickname, setNickname] = useState("");
  const [type, setType] = useState("");
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");
  const [birthday, setBirthday] = useState("");
  const [contactFrequency, setContactFrequency] = useState("");
  const [metAt, setMetAt] = useState("");
  const [metThrough, setMetThrough] = useState("");
  const [avatarColor, setAvatarColor] = useState(AVATAR_COLORS[0]);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  useEffect(() => {
    if (open) {
      setName(person?.name ?? "");
      setNickname(person?.nickname ?? "");
      setType(person?.type ?? "");
      setCompany(person?.company ?? "");
      setRole(person?.role ?? "");
      setEmail(person?.email ?? "");
      setPhone(person?.phone ?? "");
      setLocation(person?.location ?? "");
      setBirthday(person?.birthday ? person.birthday.slice(0, 10) : "");
      setContactFrequency(person?.contactFrequency ?? "");
      setMetAt(person?.metAt ? person.metAt.slice(0, 10) : "");
      setMetThrough(person?.metThrough ?? "");
      setAvatarColor(person?.avatarColor ?? AVATAR_COLORS[0]);
      setTags(person?.tags ?? []);
      setTagInput("");
      setShowDelete(false);
    }
  }, [open, person]);

  if (!open) return null;

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await onSave({ name, nickname: nickname || undefined, type: type || undefined, company: company || undefined, role: role || undefined, email: email || undefined, phone: phone || undefined, location: location || undefined, birthday: birthday || undefined, avatarColor, tags: tags.length > 0 ? tags : undefined, contactFrequency: contactFrequency || undefined, metAt: metAt || undefined, metThrough: metThrough || undefined });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    setSaving(true);
    try {
      await onDelete();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const isEdit = !!person;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-surface border border-border rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-border">
          <h2 className="font-semibold text-foreground">{isEdit ? "Persoon bewerken" : "Persoon toevoegen"}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-4 space-y-4 max-h-[60vh] overflow-y-auto">
          {/* Avatar color */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Kleur avatar</p>
            <div className="flex gap-2 flex-wrap">
              {AVATAR_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setAvatarColor(c)}
                  className={`w-7 h-7 rounded-full transition-all ${avatarColor === c ? "ring-2 ring-offset-2 ring-offset-surface scale-110" : "hover:scale-105"}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="text-xs font-medium text-muted-foreground">Naam *</label>
            <input
              autoFocus
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
              className="w-full mt-1 px-3 py-2 rounded-lg bg-surface-hover border border-border text-sm text-foreground outline-none focus:border-accent transition-colors"
              placeholder="Volledige naam"
            />
          </div>

          {/* Type */}
          <div>
            <label className="text-xs font-medium text-muted-foreground">Categorie</label>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {PERSON_TYPES.map((t) => (
                <button
                  key={t.value}
                  onClick={() => setType(type === t.value ? "" : t.value)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                    type === t.value ? "text-white" : "bg-surface border border-border text-muted-foreground hover:text-foreground"
                  }`}
                  style={type === t.value ? { backgroundColor: t.color } : {}}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Company + Role */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Bedrijf</label>
              <input type="text" value={company} onChange={(e) => setCompany(e.target.value)}
                className="w-full mt-1 px-3 py-2 rounded-lg bg-surface-hover border border-border text-sm text-foreground outline-none focus:border-accent transition-colors"
                placeholder="Bedrijfsnaam" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Rol</label>
              <input type="text" value={role} onChange={(e) => setRole(e.target.value)}
                className="w-full mt-1 px-3 py-2 rounded-lg bg-surface-hover border border-border text-sm text-foreground outline-none focus:border-accent transition-colors"
                placeholder="Functie" />
            </div>
          </div>

          {/* Email + Phone */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">E-mail</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                className="w-full mt-1 px-3 py-2 rounded-lg bg-surface-hover border border-border text-sm text-foreground outline-none focus:border-accent transition-colors"
                placeholder="email@..." />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Telefoon</label>
              <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
                className="w-full mt-1 px-3 py-2 rounded-lg bg-surface-hover border border-border text-sm text-foreground outline-none focus:border-accent transition-colors"
                placeholder="+31..." />
            </div>
          </div>

          {/* Location + Birthday */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Locatie</label>
              <input type="text" value={location} onChange={(e) => setLocation(e.target.value)}
                className="w-full mt-1 px-3 py-2 rounded-lg bg-surface-hover border border-border text-sm text-foreground outline-none focus:border-accent transition-colors"
                placeholder="Stad, land" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Verjaardag</label>
              <SmartDateInput value={birthday} onChange={setBirthday}
                className="w-full mt-1 px-3 py-2 rounded-lg bg-surface-hover border border-border text-sm text-foreground outline-none focus:border-accent transition-colors" />
            </div>
          </div>

          {/* Contact frequency */}
          <div>
            <label className="text-xs font-medium text-muted-foreground">Hoe vaak contact?</label>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {CONTACT_FREQUENCIES.map((f) => (
                <button
                  key={f.value}
                  onClick={() => setContactFrequency(contactFrequency === f.value ? "" : f.value)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                    contactFrequency === f.value
                      ? "bg-accent text-white"
                      : "bg-surface border border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Met at + Met through */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Leren kennen op</label>
              <SmartDateInput value={metAt} onChange={setMetAt}
                className="w-full mt-1 px-3 py-2 rounded-lg bg-surface-hover border border-border text-sm text-foreground outline-none focus:border-accent transition-colors" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Hoe leren kennen</label>
              <input type="text" value={metThrough} onChange={(e) => setMetThrough(e.target.value)}
                className="w-full mt-1 px-3 py-2 rounded-lg bg-surface-hover border border-border text-sm text-foreground outline-none focus:border-accent transition-colors"
                placeholder="Via werk, op een feest..." />
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="text-xs font-medium text-muted-foreground">Tags</label>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {tags.map((tag) => (
                <span key={tag} className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-accent/10 text-accent">
                  {tag}
                  <button onClick={() => setTags(tags.filter((t) => t !== tag))} className="hover:text-accent/60 transition-colors">
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
                onKeyDown={(e) => {
                  if ((e.key === "Enter" || e.key === ",") && tagInput.trim()) {
                    e.preventDefault();
                    const val = tagInput.trim().replace(/,/g, "");
                    if (val && !tags.includes(val)) setTags([...tags, val]);
                    setTagInput("");
                  }
                }}
                placeholder={tags.length === 0 ? "bv. basketbal, studie..." : "+"}
                className="flex-1 min-w-[80px] px-2 py-0.5 bg-transparent text-xs outline-none text-foreground placeholder:text-muted-foreground/40"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between px-6 py-4 border-t border-border">
          {isEdit && onDelete ? (
            showDelete ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Zeker?</span>
                <button onClick={handleDelete} disabled={saving} className="text-xs text-red-400 hover:text-red-300 font-medium">Verwijderen</button>
                <button onClick={() => setShowDelete(false)} className="text-xs text-muted-foreground hover:text-foreground">Annuleren</button>
              </div>
            ) : (
              <button onClick={() => setShowDelete(true)} className="text-xs text-muted-foreground hover:text-red-400 transition-colors">
                Verwijderen
              </button>
            )
          ) : <div />}

          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-surface-hover transition-colors">
              Annuleren
            </button>
            <button onClick={handleSave} disabled={!name.trim() || saving}
              className="px-4 py-2 rounded-lg text-sm bg-accent text-white font-medium hover:bg-accent/90 transition-colors disabled:opacity-50">
              {saving ? "Opslaan..." : isEdit ? "Opslaan" : "Toevoegen"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
