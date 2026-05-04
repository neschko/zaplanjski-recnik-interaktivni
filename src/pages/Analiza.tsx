import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Sparkles, FileText, Mic, Loader2, History, Square, Upload, Copy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { dialectLabel } from "@/lib/dialects";
import { cn } from "@/lib/utils";
import { findOsnovniIdByWord, osnovniIdFromWord } from "@/lib/osnovniRecnik";

const MODELS = [
  { value: "google/gemini-2.5-pro", label: "Lovable AI · Gemini 2.5 Pro (детаљније)" },
  { value: "google/gemini-2.5-flash", label: "Lovable AI · Gemini 2.5 Flash (брже)" },
  { value: "google/gemini-3-flash-preview", label: "Lovable AI · Gemini 3 Flash" },
];

const MAX_AUDIO_BYTES = 5 * 1024 * 1024; // ~5MB raw

function fileToBase64(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => {
      const s = r.result as string;
      const i = s.indexOf(",");
      resolve(i >= 0 ? s.slice(i + 1) : s);
    };
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}

export default function Analiza() {
  const [mode, setMode] = useState<"text" | "audio">("text");
  const [text, setText] = useState("");
  const [model, setModel] = useState(MODELS[1].value);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);

  // Audio state
  const [audioFile, setAudioFile] = useState<File | Blob | null>(null);
  const [audioMime, setAudioMime] = useState<string>("");
  const [audioName, setAudioName] = useState<string>("");
  const [audioUrl, setAudioUrl] = useState<string>("");
  const [recording, setRecording] = useState(false);
  const [recordTime, setRecordTime] = useState(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const timerRef = useRef<number | null>(null);

  const loadHistory = () => {
    supabase.from("analyses").select("*").order("created_at", { ascending: false }).limit(8)
      .then(({ data }) => setHistory(data ?? []));
  };

  useEffect(loadHistory, []);

  useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setAudio = (blob: Blob, name: string, mime: string) => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioFile(blob);
    setAudioMime(mime);
    setAudioName(name);
    setAudioUrl(URL.createObjectURL(blob));
  };

  const onPickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > MAX_AUDIO_BYTES) {
      toast({ title: "Превелик фајл", description: "Максимум је ~5MB. Скрати или конвертуј у mp3.", variant: "destructive" });
      return;
    }
    setAudio(f, f.name, f.type || "audio/mpeg");
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream, { mimeType: "audio/webm" });
      chunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setAudio(blob, `снимак-${Date.now()}.webm`, "audio/webm");
        stream.getTracks().forEach(t => t.stop());
      };
      mr.start();
      recorderRef.current = mr;
      setRecording(true);
      setRecordTime(0);
      timerRef.current = window.setInterval(() => setRecordTime(t => t + 1), 1000);
    } catch (err: any) {
      toast({ title: "Микрофон није доступан", description: err?.message ?? "Дозволи приступ микрофону.", variant: "destructive" });
    }
  };

  const stopRecording = () => {
    recorderRef.current?.stop();
    setRecording(false);
    if (timerRef.current) { window.clearInterval(timerRef.current); timerRef.current = null; }
  };

  const analyze = async () => {
    setResult(null);
    let body: any;
    if (mode === "text") {
      if (!text.trim()) {
        toast({ title: "Унеси текст", description: "Текст не може бити празан.", variant: "destructive" });
        return;
      }
      body = { text, model, source_type: "text" };
    } else {
      if (!audioFile) {
        toast({ title: "Нема снимка", description: "Изабери фајл или сними нешто.", variant: "destructive" });
        return;
      }
      setLoading(true);
      const audio_base64 = await fileToBase64(audioFile);
      body = { source_type: "audio", model, audio_base64, audio_mime: audioMime };
    }

    setLoading(true);
    const { data, error } = await supabase.functions.invoke("analyze-speech", { body });
    if (error) {
      setLoading(false);
      toast({ title: "Грешка", description: error.message, variant: "destructive" });
      return;
    }
    if ((data as any)?.error) {
      setLoading(false);
      toast({ title: "Грешка", description: (data as any).error, variant: "destructive" });
      return;
    }

    const recognized: { word: string; note?: string }[] = (data as any).recognized_words ?? [];
    const lowered = recognized.map(r => osnovniIdFromWord(r.word) || r.word.toLowerCase());
    const { data: dbMatches } = lowered.length
      ? await supabase.from("entries").select("id, word_normalized").in("word_normalized", lowered)
      : { data: [] as any[] };

    const hits = recognized.map((r) => {
      const norm = osnovniIdFromWord(r.word) || r.word.toLowerCase();
      const db = (dbMatches ?? []).find((e: any) => e.word_normalized === norm);
      if (db) return { word: r.word, entry_id: db.id as string };
      const oid = findOsnovniIdByWord(r.word);
      return { word: r.word, entry_id: oid ? `osnovni:${oid}` : null };
    });

    if (hits.length > 0 && (data as any).analysis?.id) {
      await supabase.from("analysis_word_hits").insert(
        hits.map(h => ({ analysis_id: (data as any).analysis.id, matched_word: h.word, entry_id: h.entry_id }))
      );
    }

    setLoading(false);
    setResult({ ...(data as any), hits });
    loadHistory();
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <div className="text-center">
        <div className="inline-flex items-center gap-2 rounded-full bg-accent px-3 py-1 text-xs font-medium text-accent-foreground">
          <Sparkles className="h-3.5 w-3.5" /> AI дијалектолошка анализа
        </div>
        <h1 className="font-serif text-3xl md:text-4xl font-bold mt-4">Одакле си, брате?</h1>
        <p className="text-muted-foreground mt-2 max-w-xl mx-auto">
          Унеси текст или директно пошаљи аудио снимак — Lovable AI ће га транскрибовати и одредити дијалекат.
        </p>
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-card p-6 shadow-warm">
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <ModeBtn active={mode === "audio"} onClick={() => setMode("audio")} icon={<Mic className="h-4 w-4" />}>Аудио</ModeBtn>
          <ModeBtn active={mode === "text"} onClick={() => setMode("text")} icon={<FileText className="h-4 w-4" />}>Текст</ModeBtn>

          <div className="ml-auto flex items-center gap-2 text-sm">
            <Label className="text-muted-foreground">AI модел:</Label>
            <select value={model} onChange={(e) => setModel(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-2 text-sm">
              {MODELS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
        </div>

        {mode === "text" ? (
          <Textarea
            rows={8}
            placeholder="Залепи текст или реченицу на дијалекту..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="text-base"
          />
        ) : (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <label className="inline-flex items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm cursor-pointer hover:bg-accent">
                <Upload className="h-4 w-4" /> Изабери фајл
                <input type="file" accept="audio/*" onChange={onPickFile} className="hidden" />
              </label>
              {!recording ? (
                <Button type="button" variant="outline" onClick={startRecording}>
                  <Mic className="h-4 w-4 mr-2" /> Сними
                </Button>
              ) : (
                <Button type="button" variant="destructive" onClick={stopRecording}>
                  <Square className="h-4 w-4 mr-2" /> Заустави · {recordTime}s
                </Button>
              )}
              {audioName && (
                <span className="text-sm text-muted-foreground truncate max-w-[18rem]">{audioName}</span>
              )}
            </div>
            {audioUrl && (
              <audio src={audioUrl} controls className="w-full" />
            )}
            <p className="text-xs text-muted-foreground">
              Подржани формати: mp3, wav, m4a, webm, ogg. Максимум ~5MB (≈ 1–3 минута снимка).
            </p>
          </div>
        )}

        <Button onClick={analyze} disabled={loading} className="w-full mt-4 h-11">
          {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Анализирам...</> : <><Sparkles className="h-4 w-4 mr-2" /> Анализирај</>}
        </Button>
      </div>

      {result && <ResultPanel result={result} />}

      <div className="mt-10">
        <div className="flex items-center gap-2 mb-3">
          <History className="h-4 w-4 text-muted-foreground" />
          <h2 className="font-serif text-lg text-secondary">Скорашње анализе</h2>
        </div>
        <div className="grid gap-2">
          {history.length === 0 && <p className="text-sm text-muted-foreground">Још нема анализа.</p>}
          {history.map(h => (
            <Link key={h.id} to={`/analiza/${h.id}`}
              className="rounded-lg border border-border bg-card p-3 hover:bg-accent transition flex items-center justify-between gap-3">
              <div className="text-sm text-foreground/85 line-clamp-1 flex-1">
                {(h.input_text ?? h.transcript ?? "").slice(0, 100) || "—"}
              </div>
              <div className="text-xs text-muted-foreground shrink-0">
                {dialectLabel(h.detected_dialect)}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

function ModeBtn({ active, onClick, icon, children }: { active: boolean; onClick: () => void; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <button onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm border transition",
        active ? "bg-primary text-primary-foreground border-primary" : "border-border bg-card text-foreground/80 hover:bg-accent"
      )}>
      {icon}{children}
    </button>
  );
}

function ResultPanel({ result }: { result: any }) {
  const a = result.analysis;
  const hits: any[] = result.hits ?? [];
  const transcript: string | null = a?.transcript ?? null;
  return (
    <div className="mt-6 rounded-2xl border border-primary/30 bg-card p-6 shadow-warm">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">Препознат дијалекат</div>
      <div className="mt-1 font-serif text-2xl font-bold text-primary">
        {dialectLabel(a.detected_dialect)}
      </div>
      <div className="mt-1 text-sm text-muted-foreground">
        Поузданост: {Math.round((a.confidence ?? 0) * 100)}%
      </div>
      <p className="mt-4 text-foreground/90 leading-relaxed">{a.reasoning}</p>

      {transcript && (
        <div className="mt-5 rounded-lg border border-border bg-background p-3">
          <div className="flex items-center justify-between mb-1">
            <div className="text-sm font-semibold text-foreground/80">Транскрипт</div>
            <button
              onClick={() => { navigator.clipboard.writeText(transcript); toast({ title: "Копирано" }); }}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
              <Copy className="h-3 w-3" /> Копирај
            </button>
          </div>
          <p className="whitespace-pre-wrap text-foreground/85 text-sm">{transcript}</p>
        </div>
      )}

      {hits.length > 0 && (
        <div className="mt-5">
          <div className="text-sm font-semibold text-foreground/80 mb-2">Препознате речи</div>
          <div className="flex flex-wrap gap-2">
            {hits.map((h, i) =>
              h.entry_id ? (
                <Link key={i} to={`/recnik/${h.entry_id}`}
                  className="rounded-full bg-accent px-3 py-1 text-sm text-accent-foreground hover:bg-primary hover:text-primary-foreground transition">
                  {h.word}
                </Link>
              ) : (
                <Link key={i}
                  to={`/recnik/nova?word=${encodeURIComponent(h.word)}&scope=zajednicki&ai=1&context=${encodeURIComponent((result.analysis?.input_text ?? result.analysis?.transcript ?? "").slice(0, 1500))}`}
                  className="rounded-full border border-dashed border-border px-3 py-1 text-sm text-foreground/70 hover:bg-accent transition"
                  title="Додај у речник (АИ ће попунити)">
                  + {h.word}
                </Link>
              )
            )}
          </div>
        </div>
      )}

      <div className="mt-4 text-xs text-muted-foreground">Модел: {a.model}</div>
    </div>
  );
}
