import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, MessageCircle, Trash2, Pencil } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { dialectLabel, scopeLabel } from "@/lib/dialects";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { getOsnovniById } from "@/lib/osnovniRecnik";

interface Entry {
  id: string; word: string; definition: string; dialect: string; scope: string;
  examples: string[]; synonyms: string[]; owner_id: string | null; created_at: string;
  pos?: string;
}
interface Comment { id: string; body: string; author_id: string | null; guest_name: string | null; created_at: string; }

export default function RecnikDetalj() {
  const { id: rawId } = useParams();
  const id = rawId ? decodeURIComponent(rawId) : "";
  const isOsnovni = id.startsWith("osnovni:");
  const nav = useNavigate();
  const { user, isAdmin } = useAuth();
  const [entry, setEntry] = useState<Entry | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [guestName, setGuestName] = useState("");
  const [analyses, setAnalyses] = useState<{ id: string; created_at: string }[]>([]);

  const load = async () => {
    if (isOsnovni) {
      const o = getOsnovniById(id.slice("osnovni:".length));
      if (o) {
        setEntry({
          id, word: o.word, definition: o.definition,
          dialect: "svrljisko_zaplanjski", scope: "osnovni",
          examples: [], synonyms: [], owner_id: null,
          created_at: "", pos: o.pos,
        });
      } else {
        setEntry(null);
      }
      const [{ data: c }, { data: hits }] = await Promise.all([
        supabase.from("comments").select("*").eq("entry_id", id).order("created_at", { ascending: false }),
        supabase.from("analysis_word_hits").select("analysis_id, analyses!inner(id, created_at)").eq("entry_id", id).limit(10),
      ]);
      setComments((c ?? []) as Comment[]);
      setAnalyses(((hits ?? []) as any[]).map(h => h.analyses).filter(Boolean));
      return;
    }
    const [{ data: e }, { data: c }, { data: hits }] = await Promise.all([
      supabase.from("entries").select("*").eq("id", id).maybeSingle(),
      supabase.from("comments").select("*").eq("entry_id", id).order("created_at", { ascending: false }),
      supabase.from("analysis_word_hits").select("analysis_id, analyses!inner(id, created_at)").eq("entry_id", id).limit(10),
    ]);
    setEntry(e as Entry | null);
    setComments((c ?? []) as Comment[]);
    setAnalyses(((hits ?? []) as any[]).map(h => h.analyses).filter(Boolean));
  };

  useEffect(() => { load(); }, [id]);

  const canEdit = entry && !isOsnovni && (isAdmin || (user && entry.owner_id === user.id));
  const canEditOsnovni = !!(entry && isOsnovni && isAdmin);

  const remove = async () => {
    if (!entry || !confirm("Брисати ову одредницу?")) return;
    const { error } = await supabase.from("entries").delete().eq("id", entry.id);
    if (error) toast({ title: "Грешка", description: error.message, variant: "destructive" });
    else { toast({ title: "Обрисано" }); nav("/recnik"); }
  };

  const editOsnovniHref = entry && isOsnovni
    ? `/recnik/nova?scope=zajednicki&word=${encodeURIComponent(entry.word)}&def=${encodeURIComponent(entry.definition)}`
    : "#";

  const addComment = async () => {
    if (!newComment.trim() || !entry) return;
    const payload: any = {
      entry_id: entry.id,
      body: newComment.trim(),
      author_id: user?.id ?? null,
    };
    if (!user) payload.guest_name = guestName.trim() || "Анонимни гост";
    const { error } = await supabase.from("comments").insert(payload);
    if (error) toast({ title: "Грешка", description: error.message, variant: "destructive" });
    else { setNewComment(""); load(); }
  };

  if (!entry) return <div className="container mx-auto py-12 text-center text-muted-foreground">Учитавање...</div>;

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <Link to="/recnik" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Назад на речник
      </Link>

      <div className="mt-4 rounded-2xl border border-border bg-card p-6 shadow-warm">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="font-serif text-3xl font-bold text-secondary">{entry.word}</h1>
            <div className="text-sm text-muted-foreground mt-1">
              {scopeLabel(entry.scope)}{entry.pos ? ` · ${entry.pos}` : ` · ${dialectLabel(entry.dialect)}`}
            </div>
          </div>
          {canEdit && (
            <div className="flex gap-2">
              <Link to={`/recnik/${entry.id}/uredi`}>
                <Button variant="outline" size="sm"><Pencil className="h-4 w-4 mr-1" />Уреди</Button>
              </Link>
              <Button variant="destructive" size="sm" onClick={remove}>
                <Trash2 className="h-4 w-4 mr-1" />Обриши
              </Button>
            </div>
          )}
          {canEditOsnovni && (
            <Link to={editOsnovniHref}>
              <Button variant="outline" size="sm"><Pencil className="h-4 w-4 mr-1" />Допуни у Заједнички (admin)</Button>
            </Link>
          )}
        </div>

        <p className="mt-5 text-foreground leading-relaxed whitespace-pre-wrap">{entry.definition}</p>

        {entry.examples.length > 0 && (
          <div className="mt-5">
            <div className="text-sm font-semibold text-foreground/70 mb-2">Примери</div>
            <ul className="space-y-1 list-disc list-inside text-foreground/80">
              {entry.examples.map((ex, i) => <li key={i} className="italic">{ex}</li>)}
            </ul>
          </div>
        )}

        {entry.synonyms.length > 0 && (
          <div className="mt-5 text-sm">
            <span className="font-semibold text-foreground/70">Синоними: </span>
            <span className="text-foreground/80">{entry.synonyms.join(", ")}</span>
          </div>
        )}
      </div>

      {analyses.length > 0 && (
        <div className="mt-6 rounded-xl border border-border bg-card p-5">
          <div className="font-serif text-lg text-secondary mb-2">Препозната у анализама</div>
          <ul className="space-y-1 text-sm">
            {analyses.map((a) => (
              <li key={a.id}>
                <Link to={`/analiza/${a.id}`} className="text-primary hover:underline">
                  Анализа од {new Date(a.created_at).toLocaleString("sr-RS")}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {(
        <div className="mt-6 rounded-xl border border-border bg-card p-5">
          <div className="font-serif text-lg text-secondary mb-3 flex items-center gap-2">
            <MessageCircle className="h-4 w-4" /> Коментари ({comments.length})
          </div>
          {user ? (
            <div className="flex gap-2 mb-4">
              <Textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Допринеси својим тумачењем или примером..."
                rows={2}
              />
              <Button onClick={addComment}>Пошаљи</Button>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground mb-4">
              <Link to="/auth" className="text-primary hover:underline">Пријави се</Link> да коментаришеш.
            </div>
          )}
          <div className="space-y-3">
            {comments.map((c) => (
              <div key={c.id} className="text-sm border-l-2 border-border pl-3">
                <p className="text-foreground/85 whitespace-pre-wrap">{c.body}</p>
                <div className="text-xs text-muted-foreground mt-1">
                  {new Date(c.created_at).toLocaleString("sr-RS")}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}