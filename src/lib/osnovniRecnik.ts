import data from "@/data/osnovni-recnik.json";
import { supabase } from "@/integrations/supabase/client";

export interface OsnovniEntry {
  id: string;
  word: string;
  pos: string;
  definition: string;
  letter: string;
  category: string;
}

const RAW_ENTRIES = data as OsnovniEntry[];

// Overlay map: entry_id -> { word?, definition? } applied from osnovni_corrections.
let CORRECTIONS: Map<string, { word?: string; definition?: string }> = new Map();
let correctionsLoaded = false;
let correctionsPromise: Promise<void> | null = null;

function applyOverlay(e: OsnovniEntry): OsnovniEntry {
  const c = CORRECTIONS.get(e.id);
  if (!c) return e;
  return { ...e, word: c.word ?? e.word, definition: c.definition ?? e.definition };
}

export const OSNOVNI_ENTRIES: OsnovniEntry[] = new Proxy(RAW_ENTRIES, {
  get(target, prop) {
    if (prop === "length") return target.length;
    if (typeof prop === "string" && /^\d+$/.test(prop)) {
      const e = target[Number(prop)];
      return e ? applyOverlay(e) : e;
    }
    if (prop === Symbol.iterator) {
      return function* () { for (const e of target) yield applyOverlay(e); };
    }
    // Fallback to raw array methods (filter/map etc) using overlay-applied snapshot.
    const v = (target as any)[prop];
    if (typeof v === "function") {
      const snap = target.map(applyOverlay);
      return (snap as any)[prop].bind(snap);
    }
    return v;
  },
}) as OsnovniEntry[];

const BY_ID = new Map(RAW_ENTRIES.map((e) => [e.id, e]));
export const getOsnovniById = (id: string) => {
  const e = BY_ID.get(id);
  return e ? applyOverlay(e) : undefined;
};

/** Load corrections from DB once and cache. Safe to call repeatedly. */
export function loadOsnovniCorrections(): Promise<void> {
  if (correctionsLoaded) return Promise.resolve();
  if (correctionsPromise) return correctionsPromise;
  correctionsPromise = (async () => {
    const { data, error } = await supabase
      .from("osnovni_corrections")
      .select("entry_id, field, corrected");
    if (error) {
      console.warn("osnovni_corrections load failed:", error.message);
      return;
    }
    const m = new Map<string, { word?: string; definition?: string }>();
    for (const r of (data ?? []) as Array<{ entry_id: string; field: string; corrected: string }>) {
      const cur = m.get(r.entry_id) ?? {};
      if (r.field === "word") cur.word = r.corrected;
      else if (r.field === "definition") cur.definition = r.corrected;
      m.set(r.entry_id, cur);
    }
    CORRECTIONS = m;
    correctionsLoaded = true;
  })();
  return correctionsPromise;
}

export function invalidateOsnovniCorrections() {
  correctionsLoaded = false;
  correctionsPromise = null;
}

// Kick off background load on module import.
if (typeof window !== "undefined") void loadOsnovniCorrections();

/** Normalize a headword to the same ID format used in osnovni-recnik.json.
 *  Use this when checking for duplicates before adding a new entry. */
export function osnovniIdFromWord(headword: string): string {
  let s = headword.toLowerCase();
  s = s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  s = s.replace(/[^а-шђјљњћџ]/gi, "");
  return s;
}

export function isDuplicateInOsnovni(headword: string): boolean {
  const base = osnovniIdFromWord(headword);
  if (!base) return false;
  return BY_ID.has(base);
}

/** Counts per first letter (uppercase). */
export const OSNOVNI_TOTALS_BY_LETTER: Record<string, number> = (() => {
  const m: Record<string, number> = {};
  for (const e of OSNOVNI_ENTRIES) {
    const ch = e.word.charAt(0).toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    m[ch] = (m[ch] ?? 0) + 1;
  }
  return m;
})();

/** Counts per category. */
export const OSNOVNI_BY_CATEGORY: Record<string, number> = (() => {
  const m: Record<string, number> = {};
  for (const e of OSNOVNI_ENTRIES) {
    const c = e.category || "Остало";
    m[c] = (m[c] ?? 0) + 1;
  }
  return m;
})();

export function searchOsnovni(opts: { letter?: string | null; q?: string | null; category?: string | null }): OsnovniEntry[] {
  const { letter, q, category } = opts;
  const ql = q?.trim().toLowerCase() ?? "";
  const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return OSNOVNI_ENTRIES.filter((e) => {
    if (letter) {
      const first = norm(e.word.charAt(0)).toUpperCase();
      if (first !== letter.toUpperCase()) return false;
    }
    if (category && e.category !== category) return false;
    if (ql) {
      const hay = norm(e.word) + " " + norm(e.definition);
      if (!hay.includes(norm(ql))) return false;
    }
    return true;
  });
}

/** Lookup map: normalized headword -> osnovni entry id (e.g. "аба" -> "аба"). */
const BY_NORMALIZED_WORD = (() => {
  const m = new Map<string, string>();
  for (const e of OSNOVNI_ENTRIES) {
    const key = osnovniIdFromWord(e.word);
    if (key && !m.has(key)) m.set(key, e.id);
  }
  return m;
})();

/** Find an osnovni entry id for a given recognized word, or null. */
export function findOsnovniIdByWord(word: string): string | null {
  const k = osnovniIdFromWord(word);
  if (!k) return null;
  return BY_NORMALIZED_WORD.get(k) ?? null;
}
