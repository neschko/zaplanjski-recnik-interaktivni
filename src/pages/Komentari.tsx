import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getOsnovniById } from "@/lib/osnovniRecnik";

interface Row { id: string; body: string; created_at: string; entry_id: string; word: string; }

export default function Komentari() {
  const [items, setItems] = useState<Row[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("comments")
        .select("id, body, created_at, entry_id")
        .order("created_at", { ascending: false })
        .limit(50);
      const rows = (data ?? []) as any[];

      const dbIds = rows.filter(r => !r.entry_id.startsWith("osnovni:")).map(r => r.entry_id);
      let wordMap = new Map<string, string>();
      if (dbIds.length > 0) {
        const { data: ents } = await supabase.from("entries").select("id, word").in("id", dbIds);
        wordMap = new Map((ents ?? []).map((e: any) => [e.id, e.word]));
      }

      setItems(rows.map(r => {
        let word = "";
        if (r.entry_id.startsWith("osnovni:")) {
          word = getOsnovniById(r.entry_id.slice("osnovni:".length))?.word ?? r.entry_id;
        } else {
          word = wordMap.get(r.entry_id) ?? "(одредница)";
        }
        return { ...r, word };
      }));
    })();
  }, []);

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <h1 className="font-serif text-3xl font-bold text-secondary text-center">Коментари</h1>
      <p className="text-center text-muted-foreground mt-1">Скорашњи коментари на одредницама</p>
      <div className="mt-6 space-y-3">
        {items.length === 0 && <p className="text-center text-muted-foreground">Још нема коментара.</p>}
        {items.map((c) => (
          <div key={c.id} className="rounded-xl border border-border bg-card p-4">
            <Link to={`/recnik/${c.entry_id}`} className="font-serif text-secondary hover:underline">
              {c.word}
            </Link>
            <p className="mt-1 text-sm text-foreground/85 whitespace-pre-wrap">{c.body}</p>
            <div className="mt-1 text-xs text-muted-foreground">{new Date(c.created_at).toLocaleString("sr-RS")}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
