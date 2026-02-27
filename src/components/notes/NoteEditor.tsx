"use client";

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
} from "react";
import { Note, NoteFolder } from "@/lib/types/notes";
import TagInput from "./TagInput";
import ConfirmDialog from "./ConfirmDialog";

interface NoteEditorProps {
  note?: Note;
  folders: NoteFolder[];
  onSave: (data: {
    title: string;
    content: string;
    color: string;
    folderId: string;
    tags: string[];
  }) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  onArchive?: (id: string) => Promise<void>;
  onBack: () => void;
}

type DraftData = {
  title: string;
  content: string;
  color: string;
  folderId: string;
  tags: string[];
};

type FormatState = {
  bold: boolean;
  italic: boolean;
  strike: boolean;
  code: boolean;
  link: boolean;
  blockquote: boolean;
  ul: boolean;
  ol: boolean;
  taskList: boolean;
  paragraph: boolean;
  h1: boolean;
  h2: boolean;
  h3: boolean;
};

const COLORS = [
  "#ffffff",
  "#6C63FF", "#8b5cf6", "#a855f7",
  "#ec4899", "#f43f5e", "#ef4444",
  "#f97316", "#f59e0b", "#eab308",
  "#22c55e", "#10b981", "#14b8a6",
  "#06b6d4", "#0ea5e9", "#3b82f6",
];

const BLOCK_TAGS = new Set(["p", "div", "h1", "h2", "h3", "h4", "h5", "h6", "blockquote", "ul", "ol", "pre", "hr"]);
const DEFAULT_FORMAT_STATE: FormatState = {
  bold: false,
  italic: false,
  strike: false,
  code: false,
  link: false,
  blockquote: false,
  ul: false,
  ol: false,
  taskList: false,
  paragraph: false,
  h1: false,
  h2: false,
  h3: false,
};

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function normalizeText(text: string): string {
  return text.replace(/\u00a0/g, " ");
}

function parseTags(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function buildDraft(
  title: string,
  content: string,
  color: string,
  folderId: string,
  tags: string[]
): DraftData {
  return {
    title: title.trim(),
    content,
    color,
    folderId,
    tags: [...tags],
  };
}

function draftToFingerprint(draft: DraftData): string {
  return JSON.stringify(draft);
}

function inlineMarkdownToHtml(text: string): string {
  return escapeHtml(text)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(/~~([^~]+)~~/g, "<s>$1</s>")
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, "<a href=\"$2\" target=\"_blank\" rel=\"noopener noreferrer\">$1</a>");
}

function isBlockMarkdownLine(line: string): boolean {
  return /^(#{1,6}\s+|>\s?|[-*+]\s+|\d+\.\s+)/.test(line);
}

function markdownToHtml(markdown: string): string {
  const source = markdown.replace(/\r\n/g, "\n").trim();
  if (!source) return "";

  const lines = source.split("\n");
  const blocks: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) {
      i += 1;
      continue;
    }

    const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      blocks.push(`<h${level}>${inlineMarkdownToHtml(headingMatch[2])}</h${level}>`);
      i += 1;
      continue;
    }

    if (/^>\s?/.test(line)) {
      const quoteLines: string[] = [];
      while (i < lines.length) {
        const match = lines[i].match(/^>\s?(.*)$/);
        if (!match) break;
        quoteLines.push(inlineMarkdownToHtml(match[1]));
        i += 1;
      }
      blocks.push(`<blockquote>${quoteLines.join("<br/>")}</blockquote>`);
      continue;
    }

    if (/^- \[[ x]\] /.test(line)) {
      const items: string[] = [];
      while (i < lines.length) {
        const match = lines[i].match(/^- \[([ x])\] (.*)$/);
        if (!match) break;
        const checked = match[1] === "x";
        items.push(`<li class="task-item"><input type="checkbox" contenteditable="false"${checked ? " checked" : ""}>${inlineMarkdownToHtml(match[2])}</li>`);
        i += 1;
      }
      blocks.push(`<ul class="task-list">${items.join("")}</ul>`);
      continue;
    }

    if (/^[-*+]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length) {
        const match = lines[i].match(/^[-*+]\s+(.*)$/);
        if (!match) break;
        items.push(`<li>${inlineMarkdownToHtml(match[1])}</li>`);
        i += 1;
      }
      blocks.push(`<ul>${items.join("")}</ul>`);
      continue;
    }

    if (/^\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length) {
        const match = lines[i].match(/^\d+\.\s+(.*)$/);
        if (!match) break;
        items.push(`<li>${inlineMarkdownToHtml(match[1])}</li>`);
        i += 1;
      }
      blocks.push(`<ol>${items.join("")}</ol>`);
      continue;
    }

    const paragraph: string[] = [];
    while (i < lines.length && lines[i].trim() && !isBlockMarkdownLine(lines[i])) {
      paragraph.push(inlineMarkdownToHtml(lines[i]));
      i += 1;
    }
    blocks.push(`<p>${paragraph.join("<br/>")}</p>`);
  }

  return blocks.join("");
}

function inlineNodeToMarkdown(node: ChildNode): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return normalizeText(node.textContent || "");
  }

  if (node.nodeType !== Node.ELEMENT_NODE) return "";

  const el = node as HTMLElement;
  const tag = el.tagName.toLowerCase();

  if (tag === "input") return ""; // Handled at block level (task list checkboxes)
  if (tag === "strong" || tag === "b") return `**${inlineNodesToMarkdown(Array.from(el.childNodes))}**`;
  if (tag === "em" || tag === "i") return `*${inlineNodesToMarkdown(Array.from(el.childNodes))}*`;
  if (tag === "s" || tag === "strike" || tag === "del") return `~~${inlineNodesToMarkdown(Array.from(el.childNodes))}~~`;
  if (tag === "code") return `\`${normalizeText(el.textContent || "").replace(/\n/g, " ").trim()}\``;
  if (tag === "a") {
    const href = el.getAttribute("href") || "";
    const label = inlineNodesToMarkdown(Array.from(el.childNodes)).trim() || href;
    return `[${label}](${href})`;
  }
  if (tag === "br") return "\n";
  if (BLOCK_TAGS.has(tag)) return blockElementToMarkdown(el);

  return inlineNodesToMarkdown(Array.from(el.childNodes));
}

function inlineNodesToMarkdown(nodes: ChildNode[]): string {
  return nodes.map((node) => inlineNodeToMarkdown(node)).join("");
}

function blockElementToMarkdown(el: HTMLElement): string {
  const tag = el.tagName.toLowerCase();

  if (/^h[1-6]$/.test(tag)) {
    const level = Number(tag[1]);
    const text = inlineNodesToMarkdown(Array.from(el.childNodes)).trim();
    return text ? `${"#".repeat(level)} ${text}` : "";
  }

  if (tag === "blockquote") {
    const inner = nodesToMarkdown(Array.from(el.childNodes)).trim();
    if (!inner) return "";
    return inner.split("\n").map((line) => (line.trim() ? `> ${line}` : ">")).join("\n");
  }

  if (tag === "ul") {
    if (el.classList.contains("task-list")) {
      const items = Array.from(el.children)
        .filter((child): child is HTMLElement => child.tagName.toLowerCase() === "li")
        .map((li) => {
          const checkbox = li.querySelector<HTMLInputElement>('input[type="checkbox"]');
          const checked = checkbox?.checked ?? checkbox?.hasAttribute("checked") ?? false;
          const textNodes = Array.from(li.childNodes).filter(
            (n) => !(n instanceof HTMLElement && n.tagName.toLowerCase() === "input")
          );
          const text = inlineNodesToMarkdown(textNodes).trim();
          return `- [${checked ? "x" : " "}] ${text}`;
        });
      return items.join("\n");
    }
    const items = Array.from(el.children)
      .filter((child): child is HTMLElement => child.tagName.toLowerCase() === "li")
      .map((li) => `- ${nodesToMarkdown(Array.from(li.childNodes)).trim()}`);
    return items.join("\n");
  }

  if (tag === "ol") {
    const items = Array.from(el.children)
      .filter((child): child is HTMLElement => child.tagName.toLowerCase() === "li")
      .map((li, index) => `${index + 1}. ${nodesToMarkdown(Array.from(li.childNodes)).trim()}`);
    return items.join("\n");
  }

  if (tag === "pre") {
    const codeText = normalizeText(el.textContent || "").replace(/\n+$/, "");
    if (!codeText.trim()) return "";
    return `\`\`\`\n${codeText}\n\`\`\``;
  }

  if (tag === "hr") return "---";

  return inlineNodesToMarkdown(Array.from(el.childNodes)).trim();
}

function nodesToMarkdown(nodes: ChildNode[]): string {
  const blocks: string[] = [];
  let inlineBuffer = "";

  const flushInlineBuffer = () => {
    const value = inlineBuffer.trim();
    if (value) blocks.push(value);
    inlineBuffer = "";
  };

  for (const node of nodes) {
    if (node.nodeType === Node.TEXT_NODE) {
      inlineBuffer += normalizeText(node.textContent || "");
      continue;
    }

    if (node.nodeType !== Node.ELEMENT_NODE) continue;

    const el = node as HTMLElement;
    const tag = el.tagName.toLowerCase();

    if (BLOCK_TAGS.has(tag)) {
      flushInlineBuffer();
      const block = blockElementToMarkdown(el).trim();
      if (block) blocks.push(block);
      continue;
    }

    inlineBuffer += inlineNodeToMarkdown(node);
  }

  flushInlineBuffer();

  return blocks
    .join("\n\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function htmlToMarkdown(html: string): string {
  if (!html.trim()) return "";

  const parser = new DOMParser();
  const doc = parser.parseFromString(`<div>${html}</div>`, "text/html");
  const root = doc.body.firstElementChild;
  if (!root) return "";

  return nodesToMarkdown(Array.from(root.childNodes));
}

const INLINE_BLOCK_TAGS = new Set(["p", "div", "li", "h1", "h2", "h3", "h4", "h5", "h6"]);

export default function NoteEditor({
  note,
  folders,
  onSave,
  onDelete,
  onArchive,
  onBack,
}: NoteEditorProps) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [color, setColor] = useState("#ffffff");
  const [folderId, setFolderId] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [showToolbar, setShowToolbar] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isEditorEmpty, setIsEditorEmpty] = useState(true);
  const [formatState, setFormatState] = useState<FormatState>(DEFAULT_FORMAT_STATE);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    type: "delete" | "unsaved";
  }>({ open: false, type: "delete" });
  const [linkPopover, setLinkPopover] = useState<{
    open: boolean;
    url: string;
    label: string;
    isEditing: boolean;
    anchor: HTMLAnchorElement | null;
    position: { top: number; left: number };
  }>({ open: false, url: "", label: "", isEditing: false, anchor: null, position: { top: 0, left: 0 } });

  const editorRef = useRef<HTMLDivElement>(null);
  const onSaveRef = useRef(onSave);
  const draftRef = useRef<DraftData>(buildDraft("", "", "#ffffff", "", []));
  const noteIdRef = useRef<string | null>(note?.id ?? null);
  const isHydratingRef = useRef(true);
  const saveInFlightRef = useRef(false);
  const queuedSaveRef = useRef(false);
  const waitingForCreatedNoteRef = useRef(false);
  const pendingAfterCreateRef = useRef(false);
  const autosaveTimerRef = useRef<number | null>(null);
  const lastSavedFingerprintRef = useRef("");
  const savedRangeRef = useRef<Range | null>(null);
  const linkInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    onSaveRef.current = onSave;
  }, [onSave]);

  const isSelectionInsideTag = useCallback((tagName: string) => {
    const editor = editorRef.current;
    const selection = window.getSelection();
    if (!editor || !selection || !selection.rangeCount) return false;

    const anchorNode = selection.anchorNode;
    if (!anchorNode || !editor.contains(anchorNode)) return false;

    let current: Node | null = anchorNode.nodeType === Node.TEXT_NODE ? anchorNode.parentNode : anchorNode;
    while (current && current !== editor) {
      if (current instanceof HTMLElement && current.tagName.toLowerCase() === tagName) {
        return true;
      }
      current = current.parentNode;
    }
    return false;
  }, []);

  const isSelectionInsideTaskList = useCallback(() => {
    const editor = editorRef.current;
    const selection = window.getSelection();
    if (!editor || !selection || !selection.rangeCount) return false;

    const anchorNode = selection.anchorNode;
    if (!anchorNode || !editor.contains(anchorNode)) return false;

    let current: Node | null = anchorNode.nodeType === Node.TEXT_NODE ? anchorNode.parentNode : anchorNode;
    while (current && current !== editor) {
      if (current instanceof HTMLUListElement && current.classList.contains("task-list")) return true;
      current = current.parentNode;
    }
    return false;
  }, []);

  const updateFormatState = useCallback(() => {
    const editor = editorRef.current;
    const selection = window.getSelection();
    const anchorNode = selection?.anchorNode;
    const inEditor = !!(editor && selection && selection.rangeCount && anchorNode && editor.contains(anchorNode));

    if (!inEditor) {
      setFormatState(DEFAULT_FORMAT_STATE);
      return;
    }

    const blockquote = isSelectionInsideTag("blockquote");
    const h1 = isSelectionInsideTag("h1");
    const h2 = isSelectionInsideTag("h2");
    const h3 = isSelectionInsideTag("h3");

    const taskList = isSelectionInsideTaskList();
    setFormatState({
      bold: document.queryCommandState("bold"),
      italic: document.queryCommandState("italic"),
      strike: document.queryCommandState("strikeThrough"),
      code: isSelectionInsideTag("code"),
      link: isSelectionInsideTag("a"),
      blockquote,
      ul: !taskList && document.queryCommandState("insertUnorderedList"),
      ol: document.queryCommandState("insertOrderedList"),
      taskList,
      paragraph: !blockquote && !h1 && !h2 && !h3 && !taskList,
      h1,
      h2,
      h3,
    });
  }, [isSelectionInsideTag]);

  const syncFromEditor = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return;
    setContent(htmlToMarkdown(editor.innerHTML));
    setIsEditorEmpty(!normalizeText(editor.innerText).trim());
    updateFormatState();
  }, [updateFormatState]);

  const runEditorCommand = useCallback((command: string, value?: string) => {
    const editor = editorRef.current;
    if (!editor) return;

    editor.focus();
    document.execCommand(command, false, value);
    syncFromEditor();
  }, [syncFromEditor]);

  const wrapSelectionWithTag = useCallback((tag: string, fallback = "tekst") => {
    const editor = editorRef.current;
    if (!editor) return;

    editor.focus();
    const selection = window.getSelection();
    const selectedText = selection?.toString() || "";
    const text = selectedText.trim() ? selectedText : fallback;
    runEditorCommand("insertHTML", `<${tag}>${escapeHtml(text)}</${tag}>`);
  }, [runEditorCommand]);

  const getPopoverPosition = useCallback((anchorEl?: HTMLAnchorElement | null): { top: number; left: number } => {
    const editor = editorRef.current;
    if (!editor) return { top: 0, left: 0 };

    if (anchorEl) {
      const rect = anchorEl.getBoundingClientRect();
      const editorRect = editor.closest(".flex-1.overflow-hidden.flex.flex-col")?.getBoundingClientRect() ?? editor.getBoundingClientRect();
      return { top: rect.bottom - editorRect.top + 8, left: rect.left - editorRect.left };
    }

    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      const editorRect = editor.closest(".flex-1.overflow-hidden.flex.flex-col")?.getBoundingClientRect() ?? editor.getBoundingClientRect();
      return { top: rect.bottom - editorRect.top + 8, left: rect.left - editorRect.left };
    }

    return { top: 0, left: 0 };
  }, []);

  const closeLinkPopover = useCallback(() => {
    setLinkPopover(p => ({ ...p, open: false }));
  }, []);

  const openLinkPopover = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return;

    const getClosestAnchor = (node: Node | null): HTMLAnchorElement | null => {
      let current: Node | null = node;
      if (current?.nodeType === Node.TEXT_NODE) current = current.parentNode;
      while (current && current !== editor) {
        if (current instanceof HTMLAnchorElement) return current;
        current = current.parentNode;
      }
      return null;
    };

    const selection = window.getSelection();
    const range = selection && selection.rangeCount > 0 ? selection.getRangeAt(0).cloneRange() : null;
    if (!range || !editor.contains(range.startContainer)) {
      editor.focus();
      return;
    }

    savedRangeRef.current = range;

    const startAnchor = getClosestAnchor(range.startContainer);
    const endAnchor = getClosestAnchor(range.endContainer);
    const activeAnchor = startAnchor && startAnchor === endAnchor ? startAnchor : null;
    const selectedText = range.toString().trim();

    if (activeAnchor) {
      setLinkPopover({
        open: true,
        url: activeAnchor.getAttribute("href") || "",
        label: activeAnchor.textContent || "",
        isEditing: true,
        anchor: activeAnchor,
        position: getPopoverPosition(activeAnchor),
      });
    } else {
      setLinkPopover({
        open: true,
        url: "",
        label: selectedText,
        isEditing: false,
        anchor: null,
        position: getPopoverPosition(),
      });
    }

    setTimeout(() => linkInputRef.current?.focus(), 50);
  }, [getPopoverPosition]);

  const applyLink = useCallback(() => {
    const url = linkPopover.url.trim();
    if (!url) return;

    const editor = editorRef.current;
    if (!editor) return;

    if (linkPopover.isEditing && linkPopover.anchor) {
      linkPopover.anchor.setAttribute("href", url);
      linkPopover.anchor.setAttribute("target", "_blank");
      linkPopover.anchor.setAttribute("rel", "noopener noreferrer");
      syncFromEditor();
    } else {
      const range = savedRangeRef.current;
      if (range) {
        const sel = window.getSelection();
        if (sel) {
          sel.removeAllRanges();
          sel.addRange(range);
        }
      }

      editor.focus();
      const selectedText = window.getSelection()?.toString().trim();
      if (selectedText) {
        runEditorCommand("createLink", url);
      } else {
        runEditorCommand(
          "insertHTML",
          `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(url)}</a>`
        );
      }
    }

    closeLinkPopover();
  }, [linkPopover, runEditorCommand, syncFromEditor, closeLinkPopover]);

  const removeLink = useCallback(() => {
    if (linkPopover.anchor) {
      const range = savedRangeRef.current;
      if (range) {
        const sel = window.getSelection();
        if (sel) {
          sel.removeAllRanges();
          sel.addRange(range);
        }
      }
      document.execCommand("unlink");
      syncFromEditor();
    }
    closeLinkPopover();
  }, [linkPopover, syncFromEditor, closeLinkPopover]);

  const toggleBlockquote = useCallback(() => {
    if (isSelectionInsideTag("blockquote")) {
      runEditorCommand("outdent");
      return;
    }
    runEditorCommand("formatBlock", "<blockquote>");
  }, [isSelectionInsideTag, runEditorCommand]);

  const setParagraphBlock = useCallback(() => {
    runEditorCommand("formatBlock", "<p>");
  }, [runEditorCommand]);

  const toggleHeadingLevel = useCallback((level: 1 | 2 | 3) => {
    const tag = `h${level}`;
    if (isSelectionInsideTag(tag)) {
      setParagraphBlock();
      return;
    }
    runEditorCommand("formatBlock", `<${tag}>`);
  }, [isSelectionInsideTag, runEditorCommand, setParagraphBlock]);

  const clearFormatting = useCallback(() => {
    runEditorCommand("removeFormat");
    runEditorCommand("unlink");
    setParagraphBlock();
  }, [runEditorCommand, setParagraphBlock]);

  const toggleTaskList = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return;
    editor.focus();

    if (isSelectionInsideTaskList()) {
      // Exit task list: convert current item to paragraph
      runEditorCommand("formatBlock", "<p>");
      return;
    }

    runEditorCommand(
      "insertHTML",
      `<ul class="task-list"><li class="task-item"><input type="checkbox" contenteditable="false"> </li></ul><p><br></p>`
    );
    syncFromEditor();
  }, [isSelectionInsideTaskList, runEditorCommand, syncFromEditor]);

  const performSave = useCallback(async () => {
    const draft = draftRef.current;
    if (!draft.title) return;

    const fingerprint = draftToFingerprint(draft);
    if (fingerprint === lastSavedFingerprintRef.current) return;

    if (saveInFlightRef.current) {
      queuedSaveRef.current = true;
      return;
    }

    const isCreateSave = !noteIdRef.current;
    if (isCreateSave) waitingForCreatedNoteRef.current = true;

    let didSave = false;
    saveInFlightRef.current = true;
    setIsSaving(true);
    try {
      await onSaveRef.current(draft);
      didSave = true;
      lastSavedFingerprintRef.current = fingerprint;
      setLastSaved(new Date());
    } catch (err) {
      console.error("Save failed:", err);
    } finally {
      saveInFlightRef.current = false;
      setIsSaving(false);

      if (!didSave) {
        waitingForCreatedNoteRef.current = false;
        queuedSaveRef.current = false;
        pendingAfterCreateRef.current = false;
        return;
      }

      const latestFingerprint = draftToFingerprint(draftRef.current);
      const hasUnsavedChanges = latestFingerprint !== lastSavedFingerprintRef.current;

      if (isCreateSave && waitingForCreatedNoteRef.current && !noteIdRef.current) {
        pendingAfterCreateRef.current = queuedSaveRef.current || hasUnsavedChanges;
        queuedSaveRef.current = false;
        return;
      }

      if (queuedSaveRef.current || hasUnsavedChanges) {
        queuedSaveRef.current = false;
        void performSave();
      }
    }
  }, []);

  const handleEditorKeyDown = useCallback((e: ReactKeyboardEvent<HTMLDivElement>) => {
    const editor = editorRef.current;
    const selection = window.getSelection();

    // --- Task list: Enter creates new task item, or exits on empty item ---
    if (e.key === "Enter" && !e.shiftKey && editor && selection && selection.rangeCount) {
      const anchorNode = selection.anchorNode;
      let taskLi: HTMLLIElement | null = null;
      let current: Node | null = anchorNode?.nodeType === Node.TEXT_NODE ? anchorNode.parentNode : anchorNode ?? null;
      while (current && current !== editor) {
        if (current instanceof HTMLLIElement) {
          const parent = current.parentNode;
          if (parent instanceof HTMLUListElement && parent.classList.contains("task-list")) {
            taskLi = current;
          }
          break;
        }
        current = current.parentNode;
      }

      if (taskLi) {
        e.preventDefault();
        const textContent = normalizeText(taskLi.textContent ?? "").trim();

        if (!textContent) {
          // Empty task item → exit task list, insert paragraph
          const taskList = taskLi.parentNode as HTMLUListElement;
          taskLi.remove();
          if (!taskList.children.length) taskList.remove();
          runEditorCommand("insertParagraph");
          syncFromEditor();
          return;
        }

        // Non-empty → create new task item after current
        const newLi = document.createElement("li");
        newLi.className = "task-item";
        const newCheckbox = document.createElement("input");
        newCheckbox.type = "checkbox";
        newCheckbox.contentEditable = "false";
        newLi.appendChild(newCheckbox);
        const spacer = document.createTextNode("\u00a0");
        newLi.appendChild(spacer);
        taskLi.parentNode?.insertBefore(newLi, taskLi.nextSibling);

        const range = document.createRange();
        range.setStart(spacer, 1);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
        syncFromEditor();
        return;
      }
    }

    // --- Task list: Backspace on empty item exits task list ---
    if (e.key === "Backspace" && editor && selection && selection.rangeCount && selection.isCollapsed) {
      const range = selection.getRangeAt(0);
      const anchorNode = range.startContainer;
      if (editor.contains(anchorNode)) {
        let taskLi: HTMLLIElement | null = null;
        let current: Node | null = anchorNode.nodeType === Node.TEXT_NODE ? anchorNode.parentNode : anchorNode;
        while (current && current !== editor) {
          if (current instanceof HTMLLIElement) {
            const parent = current.parentNode;
            if (parent instanceof HTMLUListElement && parent.classList.contains("task-list")) {
              taskLi = current;
            }
            break;
          }
          current = current.parentNode;
        }

        if (taskLi) {
          const beforeCaret = range.cloneRange();
          beforeCaret.selectNodeContents(taskLi);
          beforeCaret.setEnd(range.startContainer, range.startOffset);
          const textBefore = normalizeText(beforeCaret.toString()).trim();
          const textContent = normalizeText(taskLi.textContent ?? "").trim();

          if (!textBefore && !textContent) {
            e.preventDefault();
            const taskList = taskLi.parentNode as HTMLUListElement;
            taskLi.remove();
            if (!taskList.children.length) taskList.remove();
            syncFromEditor();
            return;
          }
        }
      }
    }

    if (e.key === "Backspace") {
      if (editor && selection && selection.rangeCount && selection.isCollapsed) {
        const range = selection.getRangeAt(0);
        const anchorNode = range.startContainer;
        if (editor.contains(anchorNode)) {
          let quoteEl: HTMLElement | null = null;
          let current: Node | null = anchorNode.nodeType === Node.TEXT_NODE ? anchorNode.parentNode : anchorNode;
          while (current && current !== editor) {
            if (current instanceof HTMLElement && current.tagName.toLowerCase() === "blockquote") {
              quoteEl = current;
              break;
            }
            current = current.parentNode;
          }

          if (quoteEl) {
            let lineEl: HTMLElement | null = null;
            current = anchorNode.nodeType === Node.TEXT_NODE ? anchorNode.parentNode : anchorNode;
            while (current && current !== quoteEl) {
              if (current instanceof HTMLElement && INLINE_BLOCK_TAGS.has(current.tagName.toLowerCase())) {
                lineEl = current;
                break;
              }
              current = current.parentNode;
            }

            const target = lineEl ?? quoteEl;
            const beforeCaret = range.cloneRange();
            beforeCaret.selectNodeContents(target);
            beforeCaret.setEnd(range.startContainer, range.startOffset);

            const isAtStart = normalizeText(beforeCaret.toString()).trim().length === 0;
            const isEmptyLine = normalizeText((lineEl?.textContent ?? "")).trim().length === 0;

            if (isAtStart && isEmptyLine) {
              e.preventDefault();
              runEditorCommand("outdent");
              return;
            }
          }
        }
      }
    }

    if (!(e.metaKey || e.ctrlKey)) return;

    const key = e.key.toLowerCase();
    if (key === "b") {
      e.preventDefault();
      runEditorCommand("bold");
      return;
    }
    if (key === "i") {
      e.preventDefault();
      runEditorCommand("italic");
      return;
    }
    if (key === "k") {
      e.preventDefault();
      openLinkPopover();
    }
  }, [openLinkPopover, runEditorCommand]);

  const handleEditorClick = useCallback((e: ReactMouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement | null;

    // Toggle task list checkbox
    if (target instanceof HTMLInputElement && target.type === "checkbox") {
      // Sync the attribute so innerHTML serialization captures the checked state
      if (target.checked) {
        target.setAttribute("checked", "");
      } else {
        target.removeAttribute("checked");
      }
      syncFromEditor();
      return;
    }

    const anchor = target?.closest("a");
    if (!anchor) return;

    if (e.metaKey || e.ctrlKey) {
      e.preventDefault();
      const href = anchor.getAttribute("href");
      if (!href) return;
      window.open(href, "_blank", "noopener,noreferrer");
    }
  }, [syncFromEditor]);

  const handleSave = useCallback(async () => {
    await performSave();
  }, [performSave]);

  const handleDeleteClick = useCallback(() => {
    if (!note || !onDelete) return;
    setConfirmDialog({ open: true, type: "delete" });
  }, [note, onDelete]);

  const confirmDelete = useCallback(async () => {
    if (!note || !onDelete) return;
    setConfirmDialog({ open: false, type: "delete" });
    await onDelete(note.id);
  }, [note, onDelete]);

  useEffect(() => {
    draftRef.current = buildDraft(title, content, color, folderId, tags);
  }, [title, content, color, folderId, tags]);

  useEffect(() => {
    const incomingNoteId = note?.id ?? null;
    const justCreatedFromAutosave =
      waitingForCreatedNoteRef.current &&
      !noteIdRef.current &&
      !!incomingNoteId;

    if (justCreatedFromAutosave) {
      noteIdRef.current = incomingNoteId;
      waitingForCreatedNoteRef.current = false;
      isHydratingRef.current = false;

      if (pendingAfterCreateRef.current) {
        pendingAfterCreateRef.current = false;
        void performSave();
      }
      return;
    }

    isHydratingRef.current = true;
    noteIdRef.current = incomingNoteId;
    waitingForCreatedNoteRef.current = false;

    const nextTitle = note?.title ?? "";
    const nextContent = note?.content ?? "";
    const nextColor = note?.color ?? "#ffffff";
    const nextFolderId = note?.folderId || "";
    const nextTags = parseTags(note?.tags);

    setTitle(nextTitle);
    setContent(nextContent);
    setColor(nextColor);
    setFolderId(nextFolderId);
    setTags(nextTags);

    const snapshot = buildDraft(nextTitle, nextContent, nextColor, nextFolderId, nextTags);
    draftRef.current = snapshot;
    lastSavedFingerprintRef.current = note ? draftToFingerprint(snapshot) : "";
    setLastSaved(note ? new Date(note.updatedAt) : null);

    requestAnimationFrame(() => {
      const editor = editorRef.current;
      if (!editor) return;
      editor.innerHTML = markdownToHtml(nextContent);
      setIsEditorEmpty(!normalizeText(editor.innerText).trim());
      updateFormatState();
      isHydratingRef.current = false;

      if (note?.id && pendingAfterCreateRef.current) {
        pendingAfterCreateRef.current = false;
        void performSave();
      }
    });

    if (!note) {
      setTimeout(() => {
        const titleInput = document.getElementById("note-title-input");
        titleInput?.focus();
      }, 100);
    }
  }, [note, performSave, updateFormatState]);

  useEffect(() => {
    if (isHydratingRef.current) return;

    const draft = draftRef.current;
    if (!draft.title) return;
    if (draftToFingerprint(draft) === lastSavedFingerprintRef.current) return;

    if (autosaveTimerRef.current) {
      window.clearTimeout(autosaveTimerRef.current);
    }

    autosaveTimerRef.current = window.setTimeout(() => {
      void performSave();
    }, 850);

    return () => {
      if (autosaveTimerRef.current) {
        window.clearTimeout(autosaveTimerRef.current);
      }
    };
  }, [title, content, color, folderId, tags, performSave]);

  useEffect(() => {
    const handleSelectionChange = () => {
      updateFormatState();
    };
    document.addEventListener("selectionchange", handleSelectionChange);
    return () => document.removeEventListener("selectionchange", handleSelectionChange);
  }, [updateFormatState]);

  const hasPendingChanges = useCallback(() => {
    const draft = buildDraft(title, content, color, folderId, tags);
    return !!draft.title && draftToFingerprint(draft) !== lastSavedFingerprintRef.current;
  }, [title, content, color, folderId, tags]);

  const handleBackClick = useCallback(() => {
    if (hasPendingChanges()) {
      setConfirmDialog({ open: true, type: "unsaved" });
      return;
    }
    onBack();
  }, [hasPendingChanges, onBack]);

  const confirmBack = useCallback(() => {
    setConfirmDialog({ open: false, type: "delete" });
    onBack();
  }, [onBack]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        void handleSave();
      }
      if (e.key === "Escape") {
        handleBackClick();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleSave, handleBackClick]);

  const hasColor = color && color !== "#ffffff";
  const hasTitle = !!title.trim();
  const hasUnsavedChanges = hasPendingChanges();

  const toolbarButtonClass = (active = false) =>
    `inline-flex shrink-0 items-center justify-center gap-1.5 h-9 min-w-9 px-3 rounded-lg text-xs font-semibold border transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-accent/35 ${
      active
        ? "bg-accent/15 border-accent/40 text-accent shadow-[inset_0_1px_0_rgba(255,255,255,0.25)]"
        : "bg-card/50 border-border/40 text-muted-foreground hover:text-foreground hover:border-border/80 hover:bg-surface/80"
    }`;

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden animate-fade-in relative">
      {/* Top bar */}
      <div className="shrink-0 flex items-center gap-2 px-4 md:px-8 py-3 border-b border-border bg-card/50">
        <button
          onClick={handleBackClick}
          className="p-2 -ml-2 rounded-lg hover:bg-surface-hover transition-colors text-muted-foreground hover:text-foreground"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        <div className="flex-1 flex items-center gap-2 min-w-0">
          <span className="text-xs text-muted-foreground/60 hidden sm:block">
            {isSaving
              ? "Automatisch opslaan..."
              : !hasTitle
                ? "Voeg een titel toe om op te slaan"
                : hasUnsavedChanges
                  ? "Niet-opgeslagen wijzigingen"
                  : lastSaved
                    ? "Alles opgeslagen"
                    : "Autosave actief"}
          </span>
        </div>

        {/* Toolbar toggle */}
        <button
          onClick={() => setShowToolbar(!showToolbar)}
          className={`p-2 rounded-lg transition-colors ${showToolbar ? "bg-accent/10 text-accent" : "text-muted-foreground hover:text-foreground hover:bg-surface-hover"}`}
          title="Opties"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>

        {/* Archive */}
        {note && onArchive && (
          <button
            onClick={() => onArchive(note.id)}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface-hover transition-colors"
            title={note.isArchived ? "Dearchiveren" : "Archiveren"}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="21 8 21 21 3 21 3 8" />
              <rect x="1" y="3" width="22" height="5" />
              <line x1="10" y1="12" x2="14" y2="12" />
            </svg>
          </button>
        )}

        {/* Delete */}
        {note && onDelete && (
          <button
            onClick={handleDeleteClick}
            className="p-2 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors"
            title="Verwijderen"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
          </button>
        )}

        {/* Save button */}
        <button
          onClick={() => void handleSave()}
          disabled={isSaving || !hasUnsavedChanges}
          className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
            isSaving || !hasUnsavedChanges
              ? "bg-muted text-muted-foreground cursor-not-allowed"
              : "bg-accent text-white hover:bg-accent/90"
          }`}
        >
          {isSaving ? "Opslaan..." : "Opslaan"}
        </button>
      </div>

      {/* Toolbar panel (collapsible) */}
      {showToolbar && (
        <div className="shrink-0 px-4 md:px-8 py-3 border-b border-border bg-surface/30 space-y-3 animate-fade-in">
          <div className="flex flex-wrap items-center gap-4">
            {/* Folder */}
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-muted-foreground">Map:</label>
              <select
                value={folderId}
                onChange={(e) => setFolderId(e.target.value)}
                className="px-2 py-1 rounded-lg border border-border bg-card text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-accent/50"
              >
                <option value="">Geen</option>
                {folders.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.icon ? `${f.icon} ` : ""}{f.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Color */}
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-muted-foreground">Kleur:</label>
              <div className="flex gap-1">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={`w-5 h-5 rounded-full transition-all border ${
                      c === "#ffffff" ? "border-border" : "border-transparent"
                    } ${
                      color === c
                        ? "ring-2 ring-offset-1 ring-offset-card ring-accent scale-110"
                        : "hover:scale-110"
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Tags */}
          <div className="flex items-start gap-2">
            <label className="text-xs font-medium text-muted-foreground mt-2">Tags:</label>
            <div className="flex-1">
              <TagInput tags={tags} onChange={setTags} />
            </div>
          </div>
        </div>
      )}

      {/* Color accent bar */}
      {hasColor && (
        <div className="h-1 shrink-0" style={{ backgroundColor: color }} />
      )}

      {/* Link popover */}
      {linkPopover.open && (
        <>
          <div className="fixed inset-0 z-40" onClick={closeLinkPopover} />
          <div
            className="absolute z-50 w-80 bg-card border border-border rounded-xl shadow-lg p-3 animate-fade-in"
            style={{ top: linkPopover.position.top, left: Math.max(16, Math.min(linkPopover.position.left, window.innerWidth - 340)) }}
          >
            <div className="flex items-center gap-2 mb-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted-foreground shrink-0">
                <path d="M10 13a5 5 0 0 0 7 0l2-2a5 5 0 0 0-7-7l-1.5 1.5" />
                <path d="M14 11a5 5 0 0 0-7 0l-2 2a5 5 0 1 0 7 7L13.5 18" />
              </svg>
              <span className="text-xs font-medium text-foreground">
                {linkPopover.isEditing ? "Link bewerken" : "Link invoegen"}
              </span>
            </div>
            <input
              ref={linkInputRef}
              type="url"
              value={linkPopover.url}
              onChange={(e) => setLinkPopover(p => ({ ...p, url: e.target.value }))}
              onKeyDown={(e) => {
                if (e.key === "Enter") { e.preventDefault(); applyLink(); }
                if (e.key === "Escape") { e.preventDefault(); closeLinkPopover(); }
              }}
              placeholder="https://..."
              className="w-full px-3 py-1.5 rounded-lg border border-border bg-surface text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 placeholder:text-muted-foreground/40 mb-2"
            />
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={applyLink}
                disabled={!linkPopover.url.trim()}
                className="flex-1 px-3 py-1.5 rounded-lg bg-accent text-white text-xs font-medium hover:bg-accent/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {linkPopover.isEditing ? "Bijwerken" : "Toevoegen"}
              </button>
              {linkPopover.isEditing && (
                <button
                  type="button"
                  onClick={removeLink}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-red-400 hover:bg-red-500/10 border border-border transition-colors"
                >
                  Verwijderen
                </button>
              )}
              <button
                type="button"
                onClick={closeLinkPopover}
                className="px-3 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground border border-border hover:bg-surface-hover transition-colors"
              >
                Annuleer
              </button>
            </div>
          </div>
        </>
      )}

      {/* Main editor area */}
      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-3xl w-full mx-auto px-4 md:px-8 py-6">
            {/* Title */}
            <input
              id="note-title-input"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Titel..."
              className="w-full text-2xl md:text-3xl font-bold bg-transparent text-foreground outline-none placeholder:text-muted-foreground/30 mb-4"
            />

            {/* WYSIWYG content */}
            <div className="relative" style={{ position: "relative" }}>
              {isEditorEmpty && (
                <div className="absolute left-0 top-0 pointer-events-none text-sm text-muted-foreground/30">
                  Begin met schrijven...
                </div>
              )}
              <div
                ref={editorRef}
                contentEditable
                suppressContentEditableWarning
                onInput={syncFromEditor}
                onBlur={syncFromEditor}
                onFocus={updateFormatState}
                onClick={handleEditorClick}
                onKeyDown={handleEditorKeyDown}
                onKeyUp={updateFormatState}
                title="Ctrl/Cmd + klik om link te openen. Gebruik de Link-knop om te bewerken/verwijderen."
                className="min-h-[300px] pb-16 text-sm text-foreground leading-relaxed outline-none
                  [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:mb-2
                  [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:mb-2
                  [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:mb-1.5
                  [&_p]:mb-2
                  [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-2
                  [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:mb-2
                  [&_li]:mb-0.5
                  [&_blockquote]:border-l-3 [&_blockquote]:border-accent/40 [&_blockquote]:pl-3 [&_blockquote]:my-2 [&_blockquote]:text-muted-foreground [&_blockquote]:italic
                  [&_a]:text-accent [&_a]:underline [&_a]:cursor-pointer [&_a:hover]:opacity-90
                  [&_code]:bg-surface [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-xs [&_code]:font-mono
                  [&_.task-list]:list-none [&_.task-list]:pl-0 [&_.task-list]:mb-2
                  [&_.task-item]:flex [&_.task-item]:items-baseline [&_.task-item]:gap-2 [&_.task-item]:mb-1
                  [&_.task-item_input]:w-3.5 [&_.task-item_input]:h-3.5 [&_.task-item_input]:cursor-pointer [&_.task-item_input]:accent-accent [&_.task-item_input]:shrink-0"
              />
            </div>
          </div>
        </div>

        {/* Bottom toolbar */}
        <div className="shrink-0 border-t border-border/70 bg-card/95 backdrop-blur">
          <div className="max-w-6xl w-full mx-auto px-4 md:px-10 py-3">
            <div className="flex flex-wrap lg:flex-nowrap items-center gap-2 rounded-2xl border border-border/60 bg-gradient-to-b from-card/95 to-surface/60 p-2.5 shadow-[0_8px_20px_rgba(0,0,0,0.08)]">
              <div className="flex flex-wrap sm:flex-nowrap items-center gap-1 rounded-xl border border-border/60 bg-card/90 p-1.5">
                <button
                  type="button"
                  onClick={() => runEditorCommand("bold")}
                  className={toolbarButtonClass(formatState.bold)}
                  title="Vet (Cmd/Ctrl+B)"
                >
                  <span className="text-sm font-bold leading-none">B</span>
                </button>
                <button
                  type="button"
                  onClick={() => runEditorCommand("italic")}
                  className={toolbarButtonClass(formatState.italic)}
                  title="Cursief (Cmd/Ctrl+I)"
                >
                  <span className="text-sm italic leading-none">I</span>
                </button>
                <button
                  type="button"
                  onClick={() => runEditorCommand("strikeThrough")}
                  className={toolbarButtonClass(formatState.strike)}
                  title="Doorstrepen"
                >
                  <span className="text-sm line-through leading-none">S</span>
                </button>
                <button
                  type="button"
                  onClick={() => wrapSelectionWithTag("code", "code")}
                  className={toolbarButtonClass(formatState.code)}
                  title="Inline code"
                >
                  <span className="font-mono text-[10px] leading-none">&lt;/&gt;</span>
                </button>
                <button
                  type="button"
                  onClick={openLinkPopover}
                  className={toolbarButtonClass(formatState.link)}
                  title="Link (Cmd/Ctrl+K)"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M10 13a5 5 0 0 0 7 0l2-2a5 5 0 0 0-7-7l-1.5 1.5" />
                    <path d="M14 11a5 5 0 0 0-7 0l-2 2a5 5 0 1 0 7 7L13.5 18" />
                  </svg>
                  <span>Link</span>
                </button>
              </div>

              <div className="flex flex-wrap sm:flex-nowrap items-center gap-1 rounded-xl border border-border/60 bg-card/90 p-1.5">
                <button
                  type="button"
                  onClick={toggleBlockquote}
                  className={toolbarButtonClass(formatState.blockquote)}
                  title="Quote (klik nogmaals om uit te zetten)"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 7H5v5h4V7zM19 7h-4v5h4V7z" />
                  </svg>
                  <span>Quote</span>
                </button>
                <button
                  type="button"
                  onClick={() => runEditorCommand("insertUnorderedList")}
                  className={toolbarButtonClass(formatState.ul)}
                  title="Lijst"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="5" cy="6" r="1.3" fill="currentColor" />
                    <circle cx="5" cy="12" r="1.3" fill="currentColor" />
                    <circle cx="5" cy="18" r="1.3" fill="currentColor" />
                    <line x1="9" y1="6" x2="20" y2="6" />
                    <line x1="9" y1="12" x2="20" y2="12" />
                    <line x1="9" y1="18" x2="20" y2="18" />
                  </svg>
                  <span>Lijst</span>
                </button>
                <button
                  type="button"
                  onClick={() => runEditorCommand("insertOrderedList")}
                  className={toolbarButtonClass(formatState.ol)}
                  title="Genummerde lijst"
                >
                  <span className="font-mono text-[10px]">1.</span>
                  <span>Lijst</span>
                </button>
                <button
                  type="button"
                  onClick={toggleTaskList}
                  className={toolbarButtonClass(formatState.taskList)}
                  title="Takenlijst (checkbox)"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="5" width="6" height="6" rx="1" />
                    <path d="m4.5 8 2 2 3-3" />
                    <rect x="3" y="14" width="6" height="6" rx="1" />
                    <line x1="15" y1="8" x2="21" y2="8" />
                    <line x1="15" y1="17" x2="21" y2="17" />
                  </svg>
                  <span>Taken</span>
                </button>
              </div>

              <div className="flex flex-wrap sm:flex-nowrap items-center gap-1 rounded-xl border border-border/60 bg-card/90 p-1.5">
                <button
                  type="button"
                  onClick={setParagraphBlock}
                  className={toolbarButtonClass(formatState.paragraph)}
                  title="Paragraaf"
                >
                  <span>P</span>
                </button>
                <button
                  type="button"
                  onClick={() => toggleHeadingLevel(1)}
                  className={toolbarButtonClass(formatState.h1)}
                  title="Kop 1"
                >
                  H1
                </button>
                <button
                  type="button"
                  onClick={() => toggleHeadingLevel(2)}
                  className={toolbarButtonClass(formatState.h2)}
                  title="Kop 2"
                >
                  H2
                </button>
                <button
                  type="button"
                  onClick={() => toggleHeadingLevel(3)}
                  className={toolbarButtonClass(formatState.h3)}
                  title="Kop 3"
                >
                  H3
                </button>
                <button
                  type="button"
                  onClick={clearFormatting}
                  className={toolbarButtonClass(false)}
                  title="Opmaak wissen"
                >
                  Reset
                </button>
              </div>

            </div>
          </div>
        </div>
      </div>

      {/* Confirm dialogs */}
      <ConfirmDialog
        open={confirmDialog.open && confirmDialog.type === "delete"}
        title="Notitie verwijderen"
        message={`Weet je zeker dat je "${note?.title ?? ""}" wilt verwijderen? Deze actie kan niet ongedaan worden gemaakt.`}
        confirmLabel="Verwijderen"
        cancelLabel="Annuleren"
        variant="danger"
        onConfirm={() => void confirmDelete()}
        onCancel={() => setConfirmDialog({ open: false, type: "delete" })}
      />
      <ConfirmDialog
        open={confirmDialog.open && confirmDialog.type === "unsaved"}
        title="Niet-opgeslagen wijzigingen"
        message="Je hebt niet-opgeslagen wijzigingen. Weet je zeker dat je terug wilt gaan?"
        confirmLabel="Terug zonder opslaan"
        cancelLabel="Blijven"
        variant="danger"
        onConfirm={confirmBack}
        onCancel={() => setConfirmDialog({ open: false, type: "unsaved" })}
      />
    </div>
  );
}
