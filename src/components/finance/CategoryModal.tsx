"use client";

import { useState, useEffect } from "react";
import { FinanceCategoryGroup } from "@/lib/types/finance";

interface CategoryModalProps {
  open: boolean;
  mode: "group" | "category";
  groupId?: string; // voor category mode
  editItem?: { id: string; name: string } | null; // voor edit mode
  categoryGroups?: FinanceCategoryGroup[]; // voor category mode dropdown
  onClose: () => void;
  onSave: (data: { name: string; groupId?: string; type: "group" | "category"; editId?: string }) => Promise<void>;
  onDelete?: (id: string, type: "group" | "category") => Promise<void>;
}

export default function CategoryModal({
  open,
  mode,
  groupId,
  editItem,
  categoryGroups,
  onClose,
  onSave,
  onDelete,
}: CategoryModalProps) {
  const [name, setName] = useState("");
  const [selectedGroupId, setSelectedGroupId] = useState(groupId || "");
  const [saving, setSaving] = useState(false);

  const isEditing = !!editItem;

  useEffect(() => {
    if (open) {
      setName(editItem?.name || "");
      setSelectedGroupId(groupId || "");
    }
  }, [open, editItem, groupId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSaving(true);
    try {
      await onSave({
        name: name.trim(),
        groupId: mode === "category" ? selectedGroupId : undefined,
        type: mode,
        editId: editItem?.id,
      });
      onClose();
    } catch (err) {
      console.error("Save category failed:", err);
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  const title = isEditing
    ? mode === "group"
      ? "Groep bewerken"
      : "Categorie bewerken"
    : mode === "group"
    ? "Nieuwe groep"
    : "Nieuwe categorie";

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/50 animate-backdrop" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-sm pointer-events-auto animate-scale-in"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <h2 className="text-lg font-bold text-foreground">{title}</h2>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface-hover transition-colors"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {/* Group selector for categories */}
            {mode === "category" && !groupId && categoryGroups && (
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                  Groep
                </label>
                <select
                  value={selectedGroupId}
                  onChange={(e) => setSelectedGroupId(e.target.value)}
                  className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm text-foreground outline-none focus:border-accent transition-colors"
                >
                  <option value="">Kies een groep...</option>
                  {categoryGroups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Name */}
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                Naam
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={mode === "group" ? "bijv. Bills" : "bijv. Benzine"}
                className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-accent transition-colors"
                autoFocus
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-2">
              <div>
                {isEditing && onDelete && (
                  <button
                    type="button"
                    onClick={() => onDelete(editItem!.id, mode)}
                    className="text-sm text-red-400 hover:text-red-300 transition-colors"
                  >
                    Verwijderen
                  </button>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Annuleren
                </button>
                <button
                  type="submit"
                  disabled={!name.trim() || (mode === "category" && !groupId && !selectedGroupId) || saving}
                  className="px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent/90 transition-colors disabled:opacity-50"
                >
                  {saving ? "Opslaan..." : isEditing ? "Opslaan" : "Toevoegen"}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
