import { Link } from "react-router-dom";
import { useState } from "react";
import {
  BookOpen, Sparkles, ArrowRight, MessageCircle, Search, Loader2, Languages, ArrowLeftRight, Copy,
  Heart, Sprout, Shirt, Home as HomeIcon, Beef, Hammer, Cloud, PawPrint, Users, Mountain, Activity, Leaf,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { OSNOVNI_BY_CATEGORY } from "@/lib/osnovniRecnik";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const CATEGORY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  "Тело и здравље": Heart,
  "Животиње": PawPrint,
  "Природа и биљке": Leaf,
  "Радње и понашање": Activity,
  "Људи и родбина": Users,
  "Храна и пиће": Beef,
  "Овчарство и сточарство": Mountain,
  "Грађевина и дунђерлук": Hammer,
  "Особине": Sparkles,
  "Време и празници": Cloud,
  "Пољопривреда": Sprout,
  "Кућа и покућство": HomeIcon,
  "Одећа и обућа": Shirt,
};

const CATEGORY_ORDER = [
  "Тело и здравље",
  "Животиње",
  "Природа и биљке",
  "Радње и понашање",
  "Људи и родбина",
  "Храна и пиће",
  "Овчарство и сточарство",
  "Грађевина и дунђерлук",
  "Особине",
  "Време и празници",
  "Пољопривреда",
  "Кућа и покућство",
  "Одећа и обућа",
];

export default function Index() {
  return (
    <div className="container mx-auto px-4 py-12">
      <section className="text-center max-w-3xl mx-auto">
        <h1 className="font-serif text-5xl md:text-6xl font-bold text-primary tracking-tight">
          Заплањски Речник
        </h1>
        <p className="mt-5 text-base md:text-lg text-foreground/80 leading-relaxed">
          Чувамо језик предака. Уплоадуј снимак говора и сазнај из ког дела
          југоисточне Србије долази — или истражи богат речник, додај своје речи,
          коментаре и чуј како звуче речи које нестају.
        </p>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            to="/recnik"
            className="inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground px-6 py-3 font-medium shadow-warm hover:opacity-90 transition"
          >
            <Search className="h-4 w-4" />
            Истражи речник
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            to="/analiza"
            className="inline-flex items-center gap-2 rounded-full border border-border bg-card text-foreground px-6 py-3 font-medium hover:bg-accent transition"
          >
            <Sparkles className="h-4 w-4" />
            Анализирај говор
          </Link>
        </div>

        <SentenceTranslator />
      </section>

      <section className="mt-16 max-w-5xl mx-auto">
        <div className="text-center mb-6">
          <h2 className="font-serif text-2xl md:text-3xl font-semibold text-primary">
            Тематске категорије
          </h2>
          <p className="text-sm text-muted-foreground mt-2">
            Прегледај речник тематски — не само азбучно.
          </p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {CATEGORY_ORDER.map((name) => {
            const Icon = CATEGORY_ICONS[name] ?? BookOpen;
            const count = OSNOVNI_BY_CATEGORY[name] ?? 0;
            return (
              <Link
                key={name}
                to={`/recnik?cat=${encodeURIComponent(name)}`}
                className="group rounded-xl border border-border bg-card p-4 hover:bg-accent hover:shadow-warm transition flex items-start gap-3"
              >
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-accent-foreground group-hover:bg-background shrink-0">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div className="font-serif text-base font-semibold text-foreground leading-tight">
                    {name}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {count.toLocaleString("sr-RS")} одредница
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
        <FeatureCard
          icon={<Sparkles className="h-5 w-5" />}
          title="Препознавање дијалекта"
          text="AI слуша снимак (или чита текст) и одређује да ли је говор призренско-јужноморавски, сврљишко-заплањски, тимочко-лужнички или други српски дијалекат."
        />
        <FeatureCard
          icon={<BookOpen className="h-5 w-5" />}
          title="Заплањски речник"
          text="Преко 30 слова азбуке, основни и заједнички речник, лични радни простор, категорије и претрага по дефиницији и синонимима."
        />
        <FeatureCard
          icon={<MessageCircle className="h-5 w-5" />}
          title="Дубока интеграција"
          text="Препознате заплањске речи из снимка постају линкови у речник; нову непознату реч можеш одмах додати у Лични или Заједнички речник."
        />
      </section>
    </div>
  );
}

function SentenceTranslator() {
  const [sentence, setSentence] = useState("");
  const [direction, setDirection] = useState<"std_to_zap" | "zap_to_std">("std_to_zap");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ translation: string; notes?: string | null } | null>(null);

  const translate = async () => {
    const s = sentence.trim();
    if (!s) return;
    setLoading(true);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("translate-sentence", {
        body: { sentence: s, direction },
      });
      if (error) {
        const status = (error as any).context?.status;
        if (status === 429) {
          toast({ title: "Превише захтева", description: "Пробај поново за минут.", variant: "destructive" });
        } else if (status === 402) {
          toast({ title: "AI кредити су исцрпљени", description: "Допуни кредите у подешавањима.", variant: "destructive" });
        } else {
          toast({ title: "Грешка превода", description: error.message, variant: "destructive" });
        }
        return;
      }
      if (data?.error) {
        toast({ title: "Грешка", description: data.error, variant: "destructive" });
        return;
      }
      setResult({ translation: data.translation, notes: data.notes });
    } catch (e: any) {
      toast({ title: "Грешка", description: e?.message ?? String(e), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    translate();
  };

  return (
    <div className="mt-8 mx-auto max-w-2xl rounded-2xl border border-border bg-card p-4 sm:p-5 text-left shadow-warm">
      <div className="flex items-center gap-2 mb-3">
        <Languages className="h-5 w-5 text-secondary" />
        <h3 className="font-serif text-lg font-semibold text-foreground">AI превод реченице</h3>
      </div>

      <div className="flex items-center justify-center gap-2 mb-3">
        <SegBtn
          active={direction === "std_to_zap"}
          onClick={() => setDirection("std_to_zap")}
          label="Стандардни"
        />
        <button
          type="button"
          onClick={() => setDirection(direction === "std_to_zap" ? "zap_to_std" : "std_to_zap")}
          aria-label="Промени смер"
          className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border bg-background text-foreground/70 hover:bg-accent"
        >
          <ArrowLeftRight className="h-4 w-4" />
        </button>
        <SegBtn
          active={direction === "zap_to_std"}
          onClick={() => setDirection("zap_to_std")}
          label="Заплањски"
        />
      </div>

      <form onSubmit={onSubmit} className="flex flex-col sm:flex-row gap-2">
        <Input
          value={sentence}
          onChange={(e) => setSentence(e.target.value)}
          placeholder={direction === "std_to_zap" ? "Унеси реченицу на стандардном српском…" : "Унеси реченицу на заплањском…"}
          maxLength={500}
          className="h-11"
        />
        <button
          type="submit"
          disabled={loading || !sentence.trim()}
          className="inline-flex items-center justify-center gap-2 rounded-md bg-primary text-primary-foreground px-5 h-11 font-medium hover:opacity-90 transition disabled:opacity-60 shrink-0"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          Преведи
        </button>
      </form>

      {result && (
        <div className="mt-4 rounded-xl border border-border bg-background p-3">
          <div className="flex items-start justify-between gap-2">
            <p className="text-base font-serif text-foreground leading-relaxed">{result.translation}</p>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(result.translation);
                toast({ title: "Копирано" });
              }}
              className="shrink-0 inline-flex items-center gap-1 rounded-md border border-border bg-card px-2 py-1 text-xs text-foreground/80 hover:bg-accent"
            >
              <Copy className="h-3 w-3" /> Копирај
            </button>
          </div>
          {result.notes && (
            <p className="mt-2 text-xs text-muted-foreground italic">{result.notes}</p>
          )}
        </div>
      )}
    </div>
  );
}

function SegBtn({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full px-3 py-1.5 text-sm border transition-colors",
        active
          ? "bg-secondary text-secondary-foreground border-secondary"
          : "border-border bg-background text-foreground/70 hover:bg-accent"
      )}
    >
      {label}
    </button>
  );
}

function FeatureCard({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-accent-foreground">
        {icon}
      </div>
      <h3 className="font-serif text-xl font-semibold mt-4 text-foreground">{title}</h3>
      <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{text}</p>
    </div>
  );
}
