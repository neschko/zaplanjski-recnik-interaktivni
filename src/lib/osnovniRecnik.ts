import data from "@/data/osnovni-recnik.json";

export interface OsnovniEntry {
  id: string;
  word: string;
  pos: string;
  definition: string;
  letter: string;
  category: string;
}

export const OSNOVNI_ENTRIES = data as OsnovniEntry[];

const BY_ID = new Map(OSNOVNI_ENTRIES.map((e) => [e.id, e]));
export const getOsnovniById = (id: string) => BY_ID.get(id);

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
