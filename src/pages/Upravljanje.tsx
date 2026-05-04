import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { dialectLabel, scopeLabel } from "@/lib/dialects";

export default function Upravljanje() {
  const { user, isAdmin, signOut } = useAuth();
  const [mine, setMine] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase.from("entries").select("*").eq("owner_id", user.id).order("created_at", { ascending: false })
      .then(({ data }) => setMine(data ?? []));
  }, [user]);

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
    <div className="container mx-auto px-4 py-8 max-w-3xl">
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
    </div>
  );
}