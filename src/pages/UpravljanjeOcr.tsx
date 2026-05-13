import { useEffect, useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { ArrowLeft, Loader2, Check, X, Pencil, Sparkles, RotateCcw } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  invalidateOsnovniCorrections,
  loadOsnovniCorrections,
} from "@/lib/osnovniRecnik";
import rawData from "@/data/osnovni-recnik.json";

type RawEntry = { id: string; word: string; definition: string; letter: string };
const ALL_RAW = rawData as RawEntry[];
const TOTAL = ALL_RAW.length;

type Suggestion = {
  field: "word" | "definition";
  original: string;
  corrected: string;
  reason: string;
  confidence: number;
};
type ReviewItem = {
  entry: RawEntry;
  suggestions: Suggestion[];
};

const BATCH_SIZE = 20;

function confColor(c: number) {
  if (c >= 0.9) return "bg-[hsl(var(--primary)/0.15)] text-primary border-primary/30";
  if (c >= 0.7) return "bg-[hsl(var(--accent))] text-foreground border-border";
  return "bg-destructive/10 text-destructive border-destructive/30";
}

export default function UpravljanjeOcr() {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const [scannedIds, setScannedIds] = useState<Set<string>>(new Set());
  const [progressLoading, setProgressLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [editIdx, setEditIdx] = useState<Record<string, string>>({}); // key = entry_id::field

  useEffect(() => {
    if (!isAdmin) return;
    (async () => {
      setProgressLoading(true);
      const { data, error } = await supabase
        .from("osnovni_review_progress")
        .select("entry_id");
      if (error) {
        toast({ title: "Грешка", description: error.message, variant: "destructive" });
      } else {
        setScannedIds(new Set((data ?? []).map((r: any) => r.entry_id)));
      }
      setProgressLoading(false);
    })();
  }, [isAdmin]);

  const nextBatch = useMemo(() => {
    return ALL_RAW.filter((e) => !scannedIds.has(e.id)).slice(0, BATCH_SIZE);
  }, [scannedIds]);

  if (authLoading) return null;
  if (!user) return <Navigate to="/auth" replace />;
  if (!isAdmin) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <p className="text-muted-foreground">Само админ има приступ овој страници.</p>
      </div>
    );
  }

  const runScan = async () => {
    if (nextBatch.length === 0) {
      toast({ title: "Готово", description: "Сви уноси су већ скенирани." });
      return;
    }
    setRunning(true);
    const payload = nextBatch.map((e) => ({ id: e.id, word: e.word, definition: e.definition }));
    const { data, error } = await supabase.functions.invoke("ocr-review-batch", {
      body: { entries: payload },
    });
    setRunning(false);

    if (error || (data as any)?.error) {
      toast({ title: "Грешка", description: error?.message ?? (data as any).error, variant: "destructive" });
      return;
    }

    const results: Array<{ entry_id: string; suggestions: Suggestion[] }> = (data as any).results ?? [];
    const byId = new Map(results.map((r) => [r.entry_id, r.suggestions ?? []]));

    const newItems: ReviewItem[] = nextBatch
      .map((e) => ({ entry: e, suggestions: byId.get(e.id) ?? [] }))
      .filter((it) => it.suggestions.length > 0);

    setItems((prev) => [...prev, ...newItems]);

    // Mark all scanned
    const progressRows = nextBatch.map((e) => ({
      entry_id: e.id,
      suggestions_count: (byId.get(e.id) ?? []).length,
    }));
    const { error: progErr } = await supabase
      .from("osnovni_review_progress")
      .upsert(progressRows, { onConflict: "entry_id" });
    if (progErr) {
      console.warn("progress upsert error:", progErr.message);
    } else {
      setScannedIds((prev) => {
        const n = new Set(prev);
        for (const e of nextBatch) n.add(e.id);
        return n;
      });
    }

    toast({
      title: `Скенирано ${nextBatch.length}`,
      description: `Пронађено ${newItems.reduce((a, it) => a + it.suggestions.length, 0)} предлога.`,
    });
  };

  const accept = async (entryId: string, s: Suggestion, overrideText?: string) => {
    const corrected = overrideText ?? s.corrected;
    const { error } = await supabase.from("osnovni_corrections").insert({
      entry_id: entryId,
      field: s.field,
      original: s.original,
      corrected,
      reason: s.reason,
      confidence: s.confidence,
      approved_by: user.id,
    });
    if (error) {
      toast({ title: "Грешка", description: error.message, variant: "destructive" });
      return;
    }
    invalidateOsnovniCorrections();
    void loadOsnovniCorrections();
    setItems((prev) =>
      prev
        .map((it) =>
          it.entry.id === entryId
            ? { ...it, suggestions: it.suggestions.filter((x) => x !== s) }
            : it,
        )
        .filter((it) => it.suggestions.length > 0),
    );
    toast({ title: "Прихваћено" });
  };

  const reject = (entryId: string, s: Suggestion) => {
    setItems((prev) =>
      prev
        .map((it) =>
          it.entry.id === entryId
            ? { ...it, suggestions: it.suggestions.filter((x) => x !== s) }
            : it,
        )
        .filter((it) => it.suggestions.length > 0),
    );
  };

  const totalScanned = scannedIds.size;
  const pct = Math.round((totalScanned / TOTAL) * 100);

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Link to="/upravljanje" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Назад на управљање
      </Link>

      <div className="mt-4 rounded-2xl border border-border bg-card p-6">
        <h1 className="font-serif text-2xl font-bold text-secondary mb-1">
          АИ преглед OCR грешака
        </h1>
        <p className="text-sm text-muted-foreground mb-4">
          АИ скенира одреднице Основног речника и предлаже исправке вероватних OCR грешака. Свака исправка се ручно одобрава.
        </p>

        <div className="flex items-center gap-3 mb-3">
          <div className="flex-1">
            <div className="text-xs text-muted-foreground mb-1">
              Прегледано: <strong>{progressLoading ? "…" : totalScanned.toLocaleString("sr-RS")}</strong> / {TOTAL.toLocaleString("sr-RS")} ({pct}%)
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
            </div>
          </div>
          <Button onClick={runScan} disabled={running || progressLoading || nextBatch.length === 0}>
            {running ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Скенирам…</>
            ) : (
              <><Sparkles className="h-4 w-4 mr-2" /> Скенирај следећих {Math.min(BATCH_SIZE, nextBatch.length)}</>
            )}
          </Button>
        </div>

        {items.length === 0 && !running && (
          <p className="text-sm text-muted-foreground italic mt-6">
            {totalScanned === 0
              ? 'Још нема скенираних одредница. Кликни „Скенирај“ да почнеш.'
              : 'Нема активних предлога. Скенирај следећи батч.'}
          </p>
        )}
      </div>

      <div className="mt-6 space-y-4">
        {items.map((it) => (
          <div key={it.entry.id} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-baseline justify-between mb-3">
              <h3 className="font-serif text-lg text-secondary">„{it.entry.word}"</h3>
              <span className="text-xs text-muted-foreground">id: {it.entry.id}</span>
            </div>
            <div className="space-y-3">
              {it.suggestions.map((s, i) => {
                const editKey = `${it.entry.id}::${s.field}::${i}`;
                const isEditing = editKey in editIdx;
                return (
                  <div key={i} className="rounded-lg border border-border p-3 bg-background/50">
                    <div className="flex items-center gap-2 mb-2 text-xs">
                      <span className="rounded-full border border-border bg-muted px-2 py-0.5 font-medium">
                        {s.field === "word" ? "реч" : "дефиниција"}
                      </span>
                      <span className={cn("rounded-full border px-2 py-0.5", confColor(s.confidence))}>
                        поузданост {Math.round(s.confidence * 100)}%
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground mb-1">било:</div>
                    <div className="text-sm mb-2 whitespace-pre-wrap text-foreground/70 line-through decoration-destructive/50">
                      {s.original}
                    </div>
                    <div className="text-xs text-muted-foreground mb-1">предлог:</div>
                    {isEditing ? (
                      <Textarea
                        value={editIdx[editKey]}
                        onChange={(e) => setEditIdx({ ...editIdx, [editKey]: e.target.value })}
                        rows={3}
                        className="mb-2"
                      />
                    ) : (
                      <div className="text-sm mb-2 whitespace-pre-wrap text-primary font-medium">
                        {s.corrected}
                      </div>
                    )}
                    <div className="text-xs text-muted-foreground italic mb-3">{s.reason}</div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => accept(it.entry.id, s, isEditing ? editIdx[editKey] : undefined)}
                      >
                        <Check className="h-4 w-4 mr-1" /> Прихвати
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => reject(it.entry.id, s)}>
                        <X className="h-4 w-4 mr-1" /> Одбаци
                      </Button>
                      {isEditing ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            const { [editKey]: _, ...rest } = editIdx;
                            setEditIdx(rest);
                          }}
                        >
                          <RotateCcw className="h-4 w-4 mr-1" /> Поништи измену
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setEditIdx({ ...editIdx, [editKey]: s.corrected })}
                        >
                          <Pencil className="h-4 w-4 mr-1" /> Уреди ручно
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
