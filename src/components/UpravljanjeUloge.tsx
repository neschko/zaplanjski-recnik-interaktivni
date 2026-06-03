import { useEffect, useState } from "react";
import { Shield, ShieldCheck, Pencil, Search, UserCog, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

type Role = "admin" | "lektor" | "user";

type Profile = {
  id: string;
  display_name: string | null;
};

type UserRow = Profile & { roles: Role[] };

const ROLE_LABEL: Record<Role, string> = {
  admin: "админ",
  lektor: "лектор",
  user: "корисник",
};

export default function UpravljanjeUloge() {
  const { user } = useAuth();
  const [rows, setRows] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const [{ data: profiles, error: pErr }, { data: roles, error: rErr }] = await Promise.all([
      supabase.from("profiles").select("id, display_name").order("display_name", { ascending: true }).limit(1000),
      supabase.from("user_roles").select("user_id, role").limit(2000),
    ]);
    if (pErr || rErr) {
      toast({ title: "Грешка", description: (pErr ?? rErr)!.message, variant: "destructive" });
      setLoading(false);
      return;
    }
    const byUser = new Map<string, Role[]>();
    (roles ?? []).forEach((r: any) => {
      const arr = byUser.get(r.user_id) ?? [];
      arr.push(r.role);
      byUser.set(r.user_id, arr);
    });
    setRows((profiles ?? []).map((p) => ({ ...p, roles: byUser.get(p.id) ?? [] })));
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const toggle = async (row: UserRow, role: Role) => {
    if (row.id === user?.id && role === "admin" && row.roles.includes("admin")) {
      if (!confirm("Сигурно желиш да уклониш СВОЈ админ налог? Изгубићеш приступ.")) return;
    }
    setBusyId(row.id + role);
    const has = row.roles.includes(role);
    if (has) {
      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", row.id)
        .eq("role", role);
      if (error) toast({ title: "Грешка", description: error.message, variant: "destructive" });
      else {
        setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, roles: r.roles.filter((x) => x !== role) } : r)));
        toast({ title: `Уклоњена улога: ${ROLE_LABEL[role]}` });
      }
    } else {
      const { error } = await supabase.from("user_roles").insert({ user_id: row.id, role });
      if (error) toast({ title: "Грешка", description: error.message, variant: "destructive" });
      else {
        setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, roles: [...r.roles, role] } : r)));
        toast({ title: `Додељена улога: ${ROLE_LABEL[role]}` });
      }
    }
    setBusyId(null);
  };

  const filtered = rows.filter((r) => {
    if (!q.trim()) return true;
    const s = q.trim().toLowerCase();
    return (r.display_name ?? "").toLowerCase().includes(s) || r.id.toLowerCase().includes(s);
  });

  return (
    <section className="mt-8">
      <div className="flex items-baseline justify-between gap-3 flex-wrap">
        <h2 className="font-serif text-xl text-secondary flex items-center gap-2">
          <UserCog className="h-5 w-5" /> Управљање улогама ({rows.length})
        </h2>
        <Button variant="ghost" size="sm" onClick={load} disabled={loading}>
          {loading ? "Учитавање..." : "Освежи"}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground mt-1">
        Додели или уклони улогу <b>админ</b> или <b>лектор</b> другим корисницима. Корисник без улога је обичан корисник.
      </p>

      <div className="relative mt-3 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Претрага по имену..."
          className="pl-9 h-9"
        />
      </div>

      <div className="mt-4 rounded-xl border border-border bg-card overflow-hidden">
        <div className="grid grid-cols-[1fr_auto] gap-2 px-4 py-2 text-xs font-medium text-muted-foreground border-b border-border bg-muted/30">
          <div>Корисник</div>
          <div className="text-right">Улоге</div>
        </div>
        {loading ? (
          <div className="p-6 text-center text-sm text-muted-foreground">Учитавање...</div>
        ) : filtered.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">Нема корисника.</div>
        ) : (
          filtered.map((r) => (
            <div
              key={r.id}
              className="grid grid-cols-[1fr_auto] gap-2 px-4 py-2 items-center border-b border-border last:border-0 text-sm"
            >
              <div className="min-w-0">
                <div className="font-medium truncate">
                  {r.display_name || <span className="italic text-muted-foreground">без имена</span>}
                  {r.id === user?.id && <span className="ml-2 text-xs text-muted-foreground">(ти)</span>}
                </div>
                <div className="text-[10px] text-muted-foreground truncate font-mono">{r.id}</div>
                <div className="flex flex-wrap gap-1 mt-1">
                  {r.roles.length === 0 && (
                    <span className="text-xs text-muted-foreground">корисник</span>
                  )}
                  {r.roles.map((role) => (
                    <span
                      key={role}
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[10px] font-medium",
                        role === "admin" && "bg-secondary text-secondary-foreground",
                        role === "lektor" && "bg-primary/15 text-primary",
                        role === "user" && "bg-muted text-muted-foreground"
                      )}
                    >
                      {ROLE_LABEL[role]}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex gap-1 justify-end">
                {(["admin", "lektor"] as Role[]).map((role) => {
                  const has = r.roles.includes(role);
                  const isBusy = busyId === r.id + role;
                  return (
                    <Button
                      key={role}
                      size="sm"
                      variant={has ? "default" : "outline"}
                      disabled={isBusy}
                      onClick={() => toggle(r, role)}
                      className="h-8 text-xs gap-1"
                      title={has ? `Уклони ${ROLE_LABEL[role]}` : `Додели ${ROLE_LABEL[role]}`}
                    >
                      {role === "admin" ? <ShieldCheck className="h-3.5 w-3.5" /> : <Pencil className="h-3.5 w-3.5" />}
                      {has ? (
                        <>
                          <X className="h-3 w-3" /> {ROLE_LABEL[role]}
                        </>
                      ) : (
                        <>+ {ROLE_LABEL[role]}</>
                      )}
                    </Button>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
