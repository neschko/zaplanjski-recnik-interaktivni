import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams, Link, Navigate } from "react-router-dom";
import { ArrowLeft, Sparkles, Loader2, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { DIALECTS, SCOPES } from "@/lib/dialects";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { isDuplicateInOsnovni, osnovniIdFromWord, getOsnovniById } from "@/lib/osnovniRecnik";

export default function RecnikForma() {
  const { id } = useParams();
  const isEdit = !!id;
  const [params] = useSearchParams();
  const nav = useNavigate();
  const { user, isAdmin, loading: authLoading } = useAuth();

  const [word, setWord] = useState(params.get("word") ?? "");
  const [definition, setDefinition] = useState(params.get("def") ?? "");
  const [examples, setExamples] = useState(params.get("examples") ?? "");
  const [synonyms, setSynonyms] = useState(params.get("synonyms") ?? "");
  const [dialect, setDialect] = useState<string>("svrljisko_zaplanjski");
  const initialScope = params.get("scope") === "osnovni" ? "zajednicki" : (params.get("scope") ?? "licni");
  const [scope, setScope] = useState<string>(initialScope);
  const fromOsnovni = params.get("scope") === "osnovni";
  const [saving, setSaving] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const autoTriedRef = useRef(false);

  const suggest = async () => {
    if (!word.trim()) {
      toast({ title: "Унеси реч", description: "Реч је обавезна за предлог.", variant: "destructive" });
      return;
    }
    setSuggesting(true);
    const { data, error } = await supabase.functions.invoke("suggest-entry", {
      body: { word: word.trim(), context: params.get("context") ?? undefined },
    });
    setSuggesting(false);
    if (error || (data as any)?.error) {
      toast({ title: "Грешка", description: error?.message ?? (data as any).error, variant: "destructive" });
      return;
    }
    const s = (data as any).suggestion;
    if (s) {
      if (s.word) setWord(s.word);
      setDefinition(s.definition ?? "");
      setExamples((s.examples ?? []).join("\n"));
      setSynonyms((s.synonyms ?? []).join(", "));
      if (s.dialect) setDialect(s.dialect);
      toast({ title: "Предлог попуњен", description: "Прегледај и допуни пре чувања." });
    }
  };

  useEffect(() => {
    if (isEdit) return;
    if (autoTriedRef.current) return;
    if (params.get("ai") === "1" && word.trim() && !definition) {
      autoTriedRef.current = true;
      suggest();
    }
  }, [isEdit, params, word]);


  useEffect(() => {
    if (!isEdit) return;
    supabase.from("entries").select("*").eq("id", id!).maybeSingle().then(({ data }) => {
      if (!data) return;
      setWord(data.word);
      setDefinition(data.definition);
      setExamples(data.examples.join("\n"));
      setSynonyms(data.synonyms.join(", "));
      setDialect(data.dialect);
      setScope(data.scope);
    });
  }, [id]);

  if (authLoading) return null;
  if (!user) return <Navigate to="/auth" replace />;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const payload = {
      word: word.trim(),
      definition: definition.trim(),
      examples: examples.split("\n").map(s => s.trim()).filter(Boolean),
      synonyms: synonyms.split(",").map(s => s.trim()).filter(Boolean),
      dialect: dialect as any,
      scope: scope as any,
      owner_id: user.id,
    };
    const res = isEdit
      ? await supabase.from("entries").update(payload).eq("id", id!).select().maybeSingle()
      : await supabase.from("entries").insert(payload).select().maybeSingle();
    setSaving(false);
    if (res.error) {
      toast({ title: "Грешка", description: res.error.message, variant: "destructive" });
      return;
    }
    toast({ title: isEdit ? "Сачувано" : "Додато у речник", description: isEdit ? undefined : `Реч „${payload.word}" је у ${scope === "zajednicki" ? "Заједнички" : scope === "licni" ? "Лични" : "Основни"} речник.` });
    nav(isEdit ? `/recnik/${res.data!.id}` : `/recnik?scope=${scope}&q=${encodeURIComponent(payload.word)}`);
  };

  const allowedScopes = SCOPES.filter(s => s.value !== "osnovni");

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <Link to="/recnik" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Назад
      </Link>
      <div className="mt-4 rounded-2xl border border-border bg-card p-6">
        <h1 className="font-serif text-2xl font-bold text-secondary mb-2">
          {isEdit ? "Уреди одредницу" : "Нова одредница"}
        </h1>
        {!isEdit && fromOsnovni && (
          <p className="text-xs text-amber-600 dark:text-amber-400 mb-4">
            Основни речник је непроменљив — измена ће бити сачувана као нова одредница у <strong>Заједнички</strong> речник.
          </p>
        )}
        {!isEdit && !fromOsnovni && (
          <p className="text-xs text-muted-foreground mb-4">
            Биће сачувано у <strong>{scope === "zajednicki" ? "Заједнички" : "Лични"}</strong> речник. Можеш променити доле под „Опсег".
          </p>
        )}
        {!isEdit && (
          <Button type="button" variant="outline" onClick={suggest} disabled={suggesting || !word.trim()} className="w-full mb-4">
            {suggesting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Попуњавам АИ-јем...</> : <><Sparkles className="h-4 w-4 mr-2" /> Попуни помоћу АИ (САНУ стил)</>}
          </Button>
        )}
        <form onSubmit={submit} className="space-y-4">
          <div>
            <Label htmlFor="word">Реч *</Label>
            <Input id="word" required value={word} onChange={(e) => setWord(e.target.value)} />
            {!isEdit && word.trim() && isDuplicateInOsnovni(word) && (() => {
              const dup = getOsnovniById(osnovniIdFromWord(word))!;
              return (
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-1.5">
                  ⚠ Већ постоји у Основном речнику као <Link to={`/recnik/osnovni:${dup.id}`} className="underline font-medium">{dup.word}</Link> — {dup.definition.slice(0, 80)}{dup.definition.length > 80 ? "…" : ""}
                </p>
              );
            })()}
          </div>
          <div>
            <Label htmlFor="def">Дефиниција *</Label>
            <Textarea id="def" required rows={4} value={definition} onChange={(e) => setDefinition(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="ex">Примери (по један у линији)</Label>
            <Textarea id="ex" rows={3} value={examples} onChange={(e) => setExamples(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="syn">Синоними (одвојени зарезом)</Label>
            <Input id="syn" value={synonyms} onChange={(e) => setSynonyms(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Дијалекат</Label>
              <select value={dialect} onChange={(e) => setDialect(e.target.value)}
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
                {DIALECTS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
              </select>
            </div>
            <div>
              <Label>Опсег</Label>
              <select value={scope} onChange={(e) => setScope(e.target.value)}
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
                {allowedScopes.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={saving} className="flex-1">
              {saving ? "Чувам..." : isEdit ? "Сачувај измене" : "Додај у речник"}
            </Button>
            {isEdit && (isAdmin || true) && (
              <Button
                type="button"
                variant="destructive"
                disabled={saving}
                onClick={async () => {
                  if (!confirm(`Обрисати „${word}"?`)) return;
                  setSaving(true);
                  const { error } = await supabase.from("entries").delete().eq("id", id!);
                  setSaving(false);
                  if (error) {
                    toast({ title: "Грешка", description: error.message, variant: "destructive" });
                    return;
                  }
                  toast({ title: "Обрисано" });
                  nav("/recnik");
                }}
              >
                <Trash2 className="h-4 w-4 mr-1" /> Обриши
              </Button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}