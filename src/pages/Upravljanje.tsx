import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Pencil, Trash2, Search } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { dialectLabel, scopeLabel } from "@/lib/dialects";
import { SCOPES } from "@/lib/dialects";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import UpravljanjeUloge from "@/components/UpravljanjeUloge";

type Entry = {
  id: string;
  word: string;
  definition: string;
  scope: string;
  dialect: string;
  owner_id: string | null;
  created_at: string;
};

export default function Upravljanje() {
  const { user, isAdmin, signOut } = useAuth();
  const [mine, setMine] = useState<Entry[]>([]);
  const [all, setAll] = useState<Entry[]>([]);
  const [scope, setScope] = useState<"all" | "osnovni" | "licni" | "zajednicki">("all");
  const [q, setQ] = useState("");
  const [loadingAll, setLoadingAll] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("entries").select("*").eq("owner_id", user.id).order("created_at", { ascending: false })
      .then(({ data }) => setMine((data ?? []) as Entry[]));
  }, [user]);

  const loadAll = async () => {
    setLoadingAll(true);
    let query = supabase.from("entries").select("*").order("created_at", { ascending: false }).limit(1000);
    if (scope !== "all") query = query.eq("scope", scope as any);
    if (q.trim()) query = query.or(`word.ilike.%${q.trim()}%,definition.ilike.%${q.trim()}%`);
    const { data, error } = await query;
    if (error) toast({ title: "Грешка", description: error.message, variant: "destructive" });
    else setAll((data ?? []) as Entry[]);
    setLoadingAll(false);
  };

  useEffect(() => {
    if (isAdmin) loadAll();
  }, [isAdmin, scope]);

  const remove = async (id: string, word: string) => {
    if (!confirm(`Обрисати „${word}"?`)) return;
    const { error } = await supabase.from("entries").delete().eq("id", id);
    if (error) toast({ title: "Грешка", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Обрисано" });
      setAll((prev) => prev.filter((e) => e.id !== id));
      setMine((prev) => prev.filter((e) => e.id !== id));
    }
  };

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <h1 className="font-serif text-2xl font-bold">Управљање</h1>
        <p className="text-muted-foreground mt-2">Пријави се да видиш своје одреднице и анализе.</p>
        <Link to="/auth" className="inline-block mt-4 rounded-full bg-primary text-primary-foreground px-4 py-2">Пријави се</Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-serif text-3xl font-bold text-secondary">Управљање</h1>
          <p className="text-muted-foreground text-sm">
            Налог: {user.email} {isAdmin && <span className="ml-2 rounded-full bg-secondary text-secondary-foreground px-2 py-0.5 text-xs">админ</span>}
          </p>
        </div>
        <Button variant="outline" onClick={signOut}>Одјави се</Button>
      </div>

      <h2 className="font-serif text-xl text-secondary mt-8 mb-3">Моје одреднице ({mine.length})</h2>
      {mine.length === 0 && <p className="text-sm text-muted-foreground">Још ниси додао одреднице.</p>}
      <div className="grid gap-2">
        {mine.map((e) => (
          <Link key={e.id} to={`/recnik/${e.id}`}
            className="rounded-lg border border-border bg-card p-3 hover:bg-accent transition flex items-center justify-between">
            <div>
              <div className="font-serif text-secondary">{e.word}</div>
              <div className="text-xs text-muted-foreground">{scopeLabel(e.scope)} · {dialectLabel(e.dialect)}</div>
            </div>
          </Link>
        ))}
      </div>

      {isAdmin && (
        <section className="mt-8">
          <Link
            to="/upravljanje/ocr-pregled"
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-card hover:bg-accent transition px-4 py-3"
          >
            <Search className="h-4 w-4 text-primary" />
            <span className="font-medium">АИ преглед OCR грешака</span>
            <span className="text-xs text-muted-foreground ml-1">— скенирај Основни речник и одобравај исправке</span>
          </Link>
        </section>
      )}

      {isAdmin && <UpravljanjeUloge />}

      {isAdmin && (
        <section className="mt-12">
          <div className="flex items-baseline justify-between gap-3 flex-wrap">
            <h2 className="font-serif text-xl text-secondary">Админ панел — све одреднице ({all.length})</h2>
            <Button variant="ghost" size="sm" onClick={loadAll} disabled={loadingAll}>
              {loadingAll ? "Учитавање..." : "Освежи"}
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-2 mt-3">
            {(["all", ...SCOPES.map((s) => s.value)] as const).map((s) => (
              <button
                key={s}
                onClick={() => setScope(s as any)}
                className={cn(
                  "rounded-full px-3 py-1 text-xs border transition",
                  scope === s
                    ? "bg-secondary text-secondary-foreground border-secondary"
                    : "border-border bg-card text-foreground/80 hover:bg-accent"
                )}
              >
                {s === "all" ? "Све" : SCOPES.find((x) => x.value === s)?.label}
              </button>
            ))}
            <form
              onSubmit={(e) => { e.preventDefault(); loadAll(); }}
              className="relative ml-auto flex-1 min-w-[200px] max-w-sm"
            >
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Претрага реч/дефиниција..."
                className="pl-9 h-9"
              />
            </form>
          </div>

          <div className="mt-4 rounded-xl border border-border bg-card overflow-hidden">
            <div className="grid grid-cols-[1fr_auto_auto] sm:grid-cols-[1.2fr_2fr_auto_auto] gap-2 px-4 py-2 text-xs font-medium text-muted-foreground border-b border-border bg-muted/30">
              <div>Реч</div>
              <div className="hidden sm:block">Дефиниција</div>
              <div>Опсег</div>
              <div className="text-right">Акције</div>
            </div>
            {loadingAll ? (
              <div className="p-6 text-center text-sm text-muted-foreground">Учитавање...</div>
            ) : all.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">Нема одредница.</div>
            ) : (
              all.map((e) => (
                <div
                  key={e.id}
                  className="grid grid-cols-[1fr_auto_auto] sm:grid-cols-[1.2fr_2fr_auto_auto] gap-2 px-4 py-2 items-center border-b border-border last:border-0 text-sm"
                >
                  <Link to={`/recnik/${e.id}`} className="font-serif text-secondary hover:underline truncate">
                    {e.word}
                  </Link>
                  <div className="hidden sm:block text-foreground/70 line-clamp-1">{e.definition}</div>
                  <div className="text-xs text-muted-foreground">{scopeLabel(e.scope)}</div>
                  <div className="flex justify-end gap-1">
                    <Link to={`/recnik/${e.id}/uredi`}>
                      <Button variant="ghost" size="icon" className="h-8 w-8" title="Уреди">
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </Link>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      title="Обриши"
                      onClick={() => remove(e.id, e.word)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      )}
    </div>
  );
}
