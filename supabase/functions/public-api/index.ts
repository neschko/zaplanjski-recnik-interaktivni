// Јавни read-only API Заплањског речника.
// Нема ауторизације — само читање јавних података.
import { createClient } from "npm:@supabase/supabase-js@2";
import OSNOVNI from "./osnovni-recnik.json" with { type: "json" };

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

interface OsnovniEntry {
  id: string;
  word: string;
  pos: string;
  definition: string;
  letter: string;
  category: string;
}

const RAW = OSNOVNI as OsnovniEntry[];

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
const db = createClient(SUPABASE_URL, ANON, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const norm = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

// ---- корекције (OCR overlay) са кешом ----
let overlay: Map<string, { word?: string; definition?: string }> | null = null;
let overlayAt = 0;
async function getOverlay() {
  if (overlay && Date.now() - overlayAt < 5 * 60_000) return overlay;
  const m = new Map<string, { word?: string; definition?: string }>();
  const { data, error } = await db
    .from("osnovni_corrections")
    .select("entry_id, field, corrected");
  if (!error) {
    for (const r of data ?? []) {
      const cur = m.get(r.entry_id) ?? {};
      if (r.field === "word") cur.word = r.corrected;
      else if (r.field === "definition") cur.definition = r.corrected;
      m.set(r.entry_id, cur);
    }
    overlay = m;
    overlayAt = Date.now();
  }
  return overlay ?? m;
}

type ApiEntry = {
  id: string;
  word: string;
  pos: string | null;
  definition: string;
  letter: string;
  category: string | null;
  scope: string;
  examples?: string[];
  synonyms?: string[];
  dialect?: string;
};

function osnovniToApi(
  e: OsnovniEntry,
  ov: Map<string, { word?: string; definition?: string }>,
): ApiEntry {
  const c = ov.get(e.id);
  return {
    id: e.id,
    word: c?.word ?? e.word,
    pos: e.pos || null,
    definition: c?.definition ?? e.definition,
    letter: e.letter,
    category: e.category || null,
    scope: "osnovni",
  };
}

async function zajednickiEntries(): Promise<ApiEntry[]> {
  const { data, error } = await db
    .from("entries")
    .select("id, word, definition, examples, synonyms, dialect, scope, categories(name)")
    .eq("scope", "zajednicki")
    .order("word", { ascending: true })
    .limit(5000);
  if (error || !data) return [];
  return data.map((r: Record<string, unknown>) => ({
    id: String(r.id),
    word: String(r.word),
    pos: null,
    definition: String(r.definition ?? ""),
    letter: norm(String(r.word).charAt(0)).toUpperCase(),
    category: (r.categories as { name?: string } | null)?.name ?? null,
    scope: "zajednicki",
    examples: (r.examples as string[]) ?? [],
    synonyms: (r.synonyms as string[]) ?? [],
    dialect: (r.dialect as string) ?? undefined,
  }));
}

function json(body: unknown, status = 200, cache = "public, max-age=300") {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8", "Cache-Control": cache },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "GET") return json({ error: "Дозвољен је само GET." }, 405, "no-store");

  try {
    const url = new URL(req.url);
    // Путања после /functions/v1/public-api
    const parts = url.pathname.split("/").filter(Boolean);
    const i = parts.indexOf("public-api");
    const route = i >= 0 ? parts.slice(i + 1) : parts;
    const p = url.searchParams;

    // ---- /  (мета) ----
    if (route.length === 0) {
      return json({
        name: "Заплањски речник — јавни API",
        version: "1.0",
        docs: "https://zaplanjski-recnik-interaktivni.lovable.app/api",
        license: "CC BY 4.0 — обавезно навођење извора",
        endpoints: [
          "GET /entries?q=&letter=&category=&scope=&limit=&offset=",
          "GET /entries/{id}",
          "GET /random",
          "GET /categories",
          "GET /letters",
          "GET /stats",
        ],
      });
    }

    if (route[0] === "categories") {
      const ov = await getOverlay();
      const m: Record<string, number> = {};
      for (const e of RAW) {
        const c = osnovniToApi(e, ov).category ?? "Остало";
        m[c] = (m[c] ?? 0) + 1;
      }
      const items = Object.entries(m)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count);
      return json({ count: items.length, items });
    }

    if (route[0] === "letters") {
      const ov = await getOverlay();
      const m: Record<string, number> = {};
      for (const e of RAW) {
        const w = osnovniToApi(e, ov).word;
        const ch = norm(w.charAt(0)).toUpperCase();
        m[ch] = (m[ch] ?? 0) + 1;
      }
      const items = Object.entries(m)
        .map(([letter, count]) => ({ letter, count }))
        .sort((a, b) => a.letter.localeCompare(b.letter, "sr"));
      return json({ count: items.length, items });
    }

    if (route[0] === "stats") {
      const zaj = await zajednickiEntries();
      return json({
        osnovni: RAW.length,
        zajednicki: zaj.length,
        total: RAW.length + zaj.length,
      });
    }

    if (route[0] === "random") {
      const ov = await getOverlay();
      const e = RAW[Math.floor(Math.random() * RAW.length)];
      return json({ entry: osnovniToApi(e, ov) }, 200, "no-store");
    }

    if (route[0] === "entries") {
      const ov = await getOverlay();

      // ---- /entries/{id} ----
      if (route[1]) {
        const id = decodeURIComponent(route[1]);
        const found = RAW.find((e) => e.id === id);
        if (found) return json({ entry: osnovniToApi(found, ov) });
        const zaj = await zajednickiEntries();
        const z = zaj.find((e) => e.id === id);
        if (z) return json({ entry: z });
        return json({ error: "Одредница није нађена." }, 404, "no-store");
      }

      // ---- /entries (листа) ----
      const q = p.get("q")?.trim() ?? "";
      const letter = p.get("letter")?.trim() ?? "";
      const category = p.get("category")?.trim() ?? "";
      const scope = (p.get("scope") ?? "all").trim();
      if (!["all", "osnovni", "zajednicki"].includes(scope)) {
        return json({ error: "scope мора бити all, osnovni или zajednicki." }, 400, "no-store");
      }
      const limit = Math.min(Math.max(parseInt(p.get("limit") ?? "50", 10) || 50, 1), 200);
      const offset = Math.max(parseInt(p.get("offset") ?? "0", 10) || 0, 0);
      if (q.length > 100) return json({ error: "q је предугачак (max 100)." }, 400, "no-store");

      let pool: ApiEntry[] = [];
      if (scope !== "zajednicki") pool = pool.concat(RAW.map((e) => osnovniToApi(e, ov)));
      if (scope !== "osnovni") pool = pool.concat(await zajednickiEntries());

      const nq = norm(q);
      const filtered = pool.filter((e) => {
        if (letter && norm(e.word.charAt(0)).toUpperCase() !== letter.toUpperCase()) return false;
        if (category && e.category !== category) return false;
        if (nq && !(norm(e.word) + " " + norm(e.definition)).includes(nq)) return false;
        return true;
      });

      return json({
        total: filtered.length,
        limit,
        offset,
        items: filtered.slice(offset, offset + limit),
      });
    }

    return json({ error: "Непозната путања." }, 404, "no-store");
  } catch (e) {
    console.error("public-api error:", e);
    return json({ error: "Интерна грешка." }, 500, "no-store");
  }
});
