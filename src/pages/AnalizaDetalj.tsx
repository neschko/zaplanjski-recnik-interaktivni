import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { dialectLabel } from "@/lib/dialects";

export default function AnalizaDetalj() {
  const { id } = useParams();
  const [a, setA] = useState<any>(null);
  const [hits, setHits] = useState<any[]>([]);
  useEffect(() => {
    supabase.from("analyses").select("*").eq("id", id!).maybeSingle().then(({ data }) => setA(data));
    supabase.from("analysis_word_hits").select("*").eq("analysis_id", id!).then(({ data }) => setHits(data ?? []));
  }, [id]);
  if (!a) return <div className="container mx-auto py-12 text-center text-muted-foreground">Учитавање...</div>;
  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <Link to="/analiza" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Назад
      </Link>
      <div className="mt-4 rounded-2xl border border-border bg-card p-6">
        <div className="text-xs uppercase tracking-wide text-muted-foreground">Препознат дијалекат</div>
        <div className="font-serif text-2xl font-bold text-primary">{dialectLabel(a.detected_dialect)}</div>
        <div className="text-sm text-muted-foreground">Поузданост: {Math.round((a.confidence ?? 0) * 100)}%</div>
        <p className="mt-4 leading-relaxed">{a.reasoning}</p>
        {a.input_text && (
          <div className="mt-5">
            <div className="text-sm font-semibold mb-1">Текст</div>
            <p className="whitespace-pre-wrap text-foreground/85">{a.input_text}</p>
          </div>
        )}
        {a.transcript && (
          <div className="mt-5">
            <div className="text-sm font-semibold mb-1">Транскрипт</div>
            <p className="whitespace-pre-wrap text-foreground/85">{a.transcript}</p>
          </div>
        )}
        {hits.length > 0 && (
          <div className="mt-5">
            <div className="text-sm font-semibold mb-2">Препознате речи</div>
            <div className="flex flex-wrap gap-2">
              {hits.map((h) => h.entry_id ? (
                <Link key={h.id} to={`/recnik/${h.entry_id}`} className="rounded-full bg-accent px-3 py-1 text-sm hover:bg-primary hover:text-primary-foreground transition">{h.matched_word}</Link>
              ) : (
                <Link key={h.id}
                  to={`/recnik/nova?word=${encodeURIComponent(h.matched_word)}&scope=zajednicki&ai=1&context=${encodeURIComponent((a.input_text ?? a.transcript ?? "").slice(0, 1500))}`}
                  className="rounded-full border border-dashed border-border px-3 py-1 text-sm text-muted-foreground hover:bg-accent transition"
                  title="Додај у речник (АИ ће попунити)">+ {h.matched_word}</Link>
              ))}
            </div>
          </div>
        )}
        <div className="mt-4 text-xs text-muted-foreground">Модел: {a.model} · {new Date(a.created_at).toLocaleString("sr-RS")}</div>
      </div>
    </div>
  );
}