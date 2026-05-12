import { NavLink, Outlet, Link } from "react-router-dom";
import { BookOpen, Sparkles, MessageCircle, Settings as SettingsIcon, BookMarked, Home, Moon, Sun, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { downloadPDF, downloadDOCX, downloadEPUB, downloadJSON } from "@/lib/recnikExport";
import { toast } from "@/hooks/use-toast";

const navItems = [
  { to: "/", label: "Почетна", icon: Home, end: true },
  { to: "/recnik", label: "Речник", icon: BookOpen },
  { to: "/analiza", label: "Анализа", icon: Sparkles },
  { to: "/komentari", label: "Коментари", icon: MessageCircle },
  { to: "/uputstvo", label: "Упутство", icon: BookMarked },
  { to: "/upravljanje", label: "Управљање", icon: SettingsIcon },
];

function ThemeToggle() {
  const [dark, setDark] = useState(() =>
    typeof window !== "undefined" && document.documentElement.classList.contains("dark")
  );
  useEffect(() => {
    const saved = localStorage.getItem("theme");
    if (saved === "dark") {
      document.documentElement.classList.add("dark");
      setDark(true);
    }
  }, []);
  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  };
  return (
    <button
      onClick={toggle}
      aria-label="Промени тему"
      className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-foreground/80 hover:bg-accent transition-colors"
    >
      {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}

function DownloadButton({ label, onClick, gradient }: { label: string; onClick: () => Promise<void>; gradient: string }) {
  const [busy, setBusy] = useState(false);
  return (
    <button
      onClick={async () => {
        if (busy) return;
        setBusy(true);
        try { await onClick(); }
        catch (e: any) { toast({ title: "Грешка при преузимању", description: e?.message ?? String(e), variant: "destructive" }); }
        finally { setBusy(false); }
      }}
      className={cn(
        "inline-flex items-center gap-2 rounded-lg bg-gradient-to-r text-primary-foreground px-5 py-2.5 font-medium shadow-warm hover:opacity-90 transition disabled:opacity-60",
        gradient
      )}
      disabled={busy}
    >
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "⬇"} {label}
    </button>
  );
}

export default function Layout() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur">
        <div className="container mx-auto flex flex-wrap items-center gap-x-6 gap-y-3 py-3">
          <Link to="/" className="flex items-center gap-3 min-w-0 flex-1 sm:flex-initial">
            <div className="relative h-11 px-3 shrink-0 rounded-xl bg-gradient-mosaic shadow-warm flex items-center justify-center font-serif text-base font-semibold tracking-wide text-white ring-1 ring-white/30 ring-offset-2 ring-offset-background overflow-hidden">
              <span className="absolute inset-0 opacity-30 mix-blend-overlay" style={{backgroundImage:'radial-gradient(circle at 20% 30%, white 0 2px, transparent 3px), radial-gradient(circle at 70% 70%, white 0 2px, transparent 3px)', backgroundSize:'14px 14px'}} />
              <span className="relative drop-shadow-[0_1px_1px_rgba(0,0,0,0.35)]">З.Речник</span>
            </div>
            <div className="leading-tight min-w-0">
              <div className="font-serif text-base sm:text-lg font-semibold text-foreground">
                Заплањски Речник
              </div>
              <div className="text-[11px] sm:text-xs text-muted-foreground break-words whitespace-normal">
                Жива реч и AI анализа дијалеката југоисточне Србије
              </div>
            </div>
          </Link>

          <nav className="ml-auto flex items-center gap-1 flex-wrap">
            {navItems.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  cn(
                    "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-warm"
                      : "text-foreground/75 hover:bg-accent hover:text-accent-foreground"
                  )
                }
              >
                <Icon className="h-4 w-4" />
                <span>{label}</span>
              </NavLink>
            ))}
            <ThemeToggle />
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-border py-10 mt-12 bg-card/40">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="font-serif text-2xl font-semibold text-primary">Преузми речник</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Увек најновија верзија — генерише се у тренутку преузимања са свим админ изменама.
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-3">
              <DownloadButton label="Преузми PDF" onClick={downloadPDF} gradient="from-[hsl(0_60%_45%)] to-[hsl(20_75%_55%)]" />
              <DownloadButton label="Преузми DOCX" onClick={downloadDOCX} gradient="from-[hsl(210_70%_45%)] to-[hsl(220_75%_55%)]" />
              <DownloadButton label="Преузми EPUB" onClick={downloadEPUB} gradient="from-[hsl(165_55%_40%)] to-[hsl(175_60%_45%)]" />
              <DownloadButton label="Преузми JSON" onClick={downloadJSON} gradient="from-[hsl(35_80%_50%)] to-[hsl(45_85%_55%)]" />
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              Један клик · без регистрације · спремно за штампу
            </p>
          </div>
          <div className="mt-8 text-center text-xs text-muted-foreground">
            Жива реч заплањског говора · AI анализа је оријентациона и може погрешити на кратким или шумним снимцима.
          </div>
        </div>
      </footer>
    </div>
  );
}