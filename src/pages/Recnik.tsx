import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Search, Plus, BookOpen, User, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { SR_ALPHABET, SCOPES, dialectLabel } from "@/lib/dialects";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import {
  OSNOVNI_TOTALS_BY_LETTER,
  searchOsnovni,
  type OsnovniEntry,
} from "@/lib/osnovniRecnik";

interface DbEntry {
  id: string;
  word: string;
  definition: string;
  dialect: string;
  scope: string;
  category_id: string | null;
  owner_id: string | null;
  examples: string[];
  synonyms: string[];
}

interface ListItem {
  id: string; // for osnovni: "osnovni:<id>"
  word: string;
  definition: string;
  meta: string; // dialect or pos
  synonyms?: string[];
}

export default function Recnik() {
  const [params, setParams] = useSearchParams();
  const scope = (params.get("scope") ?? "osnovni") as "osnovni" | "licni" | "zajednicki";
  const letter = params.get("slovo");
  const q = params.get("q") ?? "";
  const [search, setSearch] = useState(q);
  const [items, setItems] = useState<ListItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const { user, isAdmin } = useAuth();

  const setParam = (k: string, v: string | null) => {
    const np = new URLSearchParams(params);
    if (v === null || v === "") np.delete(k);
    else np.set(k, v);
    setParams(np);
  };

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    if (scope === "osnovni") {
      (async () => {
        const results = searchOsnovni({ letter, q });
        const mapped: ListItem[] = results.slice(0, 500).map((e: OsnovniEntry) => ({
          id: `osnovni:${e.id}`,
          word: e.word,
          definition: e.definition,
          meta: e.pos || e.category,
        }));
        // Also include admin-added/edited osnovni entries from DB
        let dbq = supabase.from("entries").select("*").eq("scope", "osnovni").limit(500);
        if (letter) dbq = dbq.ilike("word", `${letter}%`);
        if (q) dbq = dbq.or(`word.ilike.%${q}%,definition.ilike.%${q}%`);
        const { data } = await dbq;
        const dbItems: ListItem[] = ((data ?? []) as DbEntry[]).map((e) => ({
          id: e.id,
          word: e.word,
          definition: e.definition,
          meta: dialectLabel(e.dialect),
          synonyms: e.synonyms,
        }));
        if (cancelled) return;
        const merged = [...dbItems, ...mapped].sort((a, b) => a.word.localeCompare(b.word, "sr"));
        setItems(merged);
        setTotalCount(merged.length);
        setLoading(false);
      })();
      return () => { cancelled = true; };
    }

    let query = supabase
      .from("entries")
      .select("*")
      .eq("scope", scope)
      .order("word", { ascending: true })
      .limit(500);
    if (letter) query = query.ilike("word", `${letter}%`);
    if (q) query = query.or(`word.ilike.%${q}%,definition.ilike.%${q}%`);
    query.then(({ data, error }) => {
      if (cancelled) return;
      if (!error) {
        const rows = (data ?? []) as DbEntry[];
        setItems(rows.map((e) => ({
          id: e.id,
          word: e.word,
          definition: e.definition,
          meta: dialectLabel(e.dialect),
          synonyms: e.synonyms,
        })));
        setTotalCount(rows.length);
      }
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [scope, letter, q]);

  const totalsByLetter = useMemo(() => {
    if (scope === "osnovni") return OSNOVNI_TOTALS_BY_LETTER;
    const m: Record<string, number> = {};
    for (const e of items) {
      const ch = e.word.charAt(0).toUpperCase();
      m[ch] = (m[ch] ?? 0) + 1;
    }
    return m;
  }, [items, scope]);

  const onSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setParam("q", search);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="text-center max-w-2xl mx-auto">
        <h1 className="font-serif text-3xl md:text-4xl font-bold text-secondary">Заплањски Речник</h1>
        <p className="text-muted-foreground mt-2">
          Жива реч заплањског говора · {totalCount} одредница{letter ? ` (на „${letter}")` : ""}
        </p>
      </div>

      <form onSubmit={onSearchSubmit} className="max-w-2xl mx-auto mt-6 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Претражи реч, дефиницију, синоним..."
          className="pl-10 h-12 text-base"
        />
      </form>

      <div className="flex flex-wrap items-center justify-center gap-2 mt-6">
        {SCOPES.map((s) => {
          const Icon = s.value === "osnovni" ? BookOpen : s.value === "licni" ? User : Users;
          return (
            <button
              key={s.value}
              onClick={() => { setParam("scope", s.value); setParam("slovo", null); }}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm border transition-colors",
                scope === s.value
                  ? "bg-secondary text-secondary-foreground border-secondary"
                  : "border-border bg-card text-foreground/80 hover:bg-accent"
              )}
            >
              <Icon className="h-4 w-4" />
              {s.label} речник
            </button>
          );
        })}
        {user && (scope !== "osnovni" || isAdmin) && (
          <Link
            to={`/recnik/nova?scope=${scope}`}
            className="inline-flex items-center gap-1.5 rounded-full bg-primary text-primary-foreground px-4 py-1.5 text-sm hover:opacity-90"
          >
            <Plus className="h-4 w-4" /> {scope === "osnovni" ? "Додај у основни (admin)" : "Твоја нова реч"}
          </Link>
        )}
      </div>

      <div className="max-w-4xl mx-auto mt-8">
        <h2 className="font-serif text-secondary mb-3">Азбука</h2>
        <div className="grid grid-cols-6 sm:grid-cols-10 gap-2">
          {SR_ALPHABET.map((ch) => {
            const active = letter === ch;
            return (
              <button
                key={ch}
                onClick={() => setParam("slovo", active ? null : ch)}
                className={cn(
                  "aspect-square rounded-lg border font-serif text-lg transition",
                  active
                    ? "bg-secondary text-secondary-foreground border-secondary"
                    : "bg-card border-border text-foreground/80 hover:bg-accent"
                )}
              >
                {ch}
                {totalsByLetter[ch] && (
                  <span className="block text-[10px] text-muted-foreground -mt-1">{totalsByLetter[ch]}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="max-w-4xl mx-auto mt-10">
        {loading ? (
          <div className="text-center text-muted-foreground py-12">Учитавање...</div>
        ) : items.length === 0 ? (
          <EmptyState scope={scope} />
        ) : (
          <div className="grid gap-3">
            {items.map((e) => (
              <Link
                key={e.id}
                to={`/recnik/${encodeURIComponent(e.id)}`}
                className="rounded-xl border border-border bg-card p-4 hover:shadow-warm transition"
              >
                <div className="flex items-baseline justify-between gap-3 flex-wrap">
                  <div className="font-serif text-xl font-semibold text-secondary">{e.word}</div>
                  <div className="text-xs text-muted-foreground">{e.meta}</div>
                </div>
                <p className="text-sm text-foreground/80 mt-1 line-clamp-2">{e.definition}</p>
                {e.synonyms && e.synonyms.length > 0 && (
                  <div className="text-xs text-muted-foreground mt-2">
                    Синоними: {e.synonyms.join(", ")}
                  </div>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyState({ scope }: { scope: string }) {
  return (
    <div className="text-center py-16 rounded-2xl border border-dashed border-border bg-card/40">
      <div className="font-serif text-xl text-foreground">Нема одредница</div>
      <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
        {scope === "osnovni"
          ? "Нема резултата за изабране филтере."
          : 'Овде ће се појавити твоје нове речи. Додај прву преко „Твоја нова реч".'}
      </p>
    </div>
  );
}
