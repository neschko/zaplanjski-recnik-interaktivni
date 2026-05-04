import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { BookOpen, Sparkles, ArrowRight, MessageCircle, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

import { OSNOVNI_ENTRIES } from "@/lib/osnovniRecnik";

export default function Index() {
  const [stats, setStats] = useState({ entries: 0, analyses: 0, comments: 0 });

  useEffect(() => {
    (async () => {
      const [{ count: entries }, { count: analyses }, { count: comments }] = await Promise.all([
        supabase.from("entries").select("*", { count: "exact", head: true }),
        supabase.from("analyses").select("*", { count: "exact", head: true }),
        supabase.from("comments").select("*", { count: "exact", head: true }),
      ]);
      setStats({
        entries: (entries ?? 0) + OSNOVNI_ENTRIES.length,
        analyses: analyses ?? 0,
        comments: comments ?? 0,
      });
    })();
  }, []);

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
      </section>

      <section className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto">
        <StatCard label="Одредница у речнику" value={stats.entries} />
        <StatCard label="Урађених анализа" value={stats.analyses} />
        <StatCard label="Коментара" value={stats.comments} />
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

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 text-center">
      <div className="font-serif text-3xl font-bold text-primary">{value.toLocaleString("sr-RS")}</div>
      <div className="text-sm text-muted-foreground mt-1">{label}</div>
    </div>
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
