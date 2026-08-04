import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Copy, Code2, ExternalLink } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/public-api`;

function CodeBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="relative">
      <pre className="overflow-x-auto rounded-lg border bg-muted/60 p-3 text-xs leading-relaxed">
        <code className="whitespace-pre">{code}</code>
      </pre>
      <Button
        type="button"
        size="icon"
        variant="ghost"
        className="absolute right-1 top-1 h-7 w-7"
        aria-label="Копирај"
        onClick={() => {
          navigator.clipboard.writeText(code);
          setCopied(true);
          toast({ title: "Копирано" });
          setTimeout(() => setCopied(false), 1500);
        }}
      >
        {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      </Button>
    </div>
  );
}

interface Ep {
  path: string;
  desc: string;
  params?: [string, string][];
}

const ENDPOINTS: Ep[] = [
  {
    path: "/entries",
    desc: "Листа одредница са претрагом, филтерима и пагинацијом.",
    params: [
      ["q", "текст за претрагу (одредница + дефиниција), max 100 знакова"],
      ["letter", "почетно слово, нпр. „А“"],
      ["category", "тематска категорија, нпр. „Кућа и домаћинство“"],
      ["scope", "all (подразумевано) | osnovni | zajednicki"],
      ["limit", "1–200, подразумевано 50"],
      ["offset", "померај за пагинацију, подразумевано 0"],
    ],
  },
  { path: "/entries/{id}", desc: "Једна одредница по идентификатору." },
  { path: "/random", desc: "Случајна одредница — идеално за „реч дана“." },
  { path: "/categories", desc: "Све тематске категорије са бројем одредница." },
  { path: "/letters", desc: "Сва слова азбуке са бројем одредница." },
  { path: "/stats", desc: "Укупан број одредница по опсегу." },
  { path: "/", desc: "Мета-подаци API-ја и списак путања." },
];

export default function Api() {
  const [tryPath, setTryPath] = useState("/entries?q=леб&limit=3");
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const curl = useMemo(() => `curl "${BASE}/entries?q=леб&limit=3"`, []);
  const jsSample = useMemo(
    () =>
      `const res = await fetch("${BASE}/entries?letter=А&limit=10");\nconst { total, items } = await res.json();\nconsole.log(total, items[0]);`,
    [],
  );

  async function run() {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch(BASE + tryPath);
      const text = await res.text();
      setResult(text.slice(0, 6000));
    } catch (e) {
      setResult(String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 px-4 py-8">
      <header className="space-y-2">
        <Badge variant="secondary" className="gap-1">
          <Code2 className="h-3.5 w-3.5" /> Јавни API
        </Badge>
        <h1 className="text-3xl font-bold tracking-tight">API Заплањског речника</h1>
        <p className="text-muted-foreground">
          Отворен, read-only REST API над речником. Без кључа, без пријаве — само GET захтеви,
          JSON у UTF-8, CORS отворен за све домене. Одговори се кеширају 5 минута.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Основна адреса</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <CodeBlock code={BASE} />
          <p className="text-sm text-muted-foreground">
            Сви endpoint-и се додају на ову адресу, нпр.{" "}
            <code className="rounded bg-muted px-1">/entries?q=леб</code>.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Endpoint-и</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {ENDPOINTS.map((ep) => (
            <div key={ep.path} className="space-y-2 border-b pb-4 last:border-0 last:pb-0">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="font-mono">GET</Badge>
                <code className="break-all font-mono text-sm font-semibold">{ep.path}</code>
              </div>
              <p className="text-sm text-muted-foreground">{ep.desc}</p>
              {ep.params && (
                <ul className="space-y-1 text-sm">
                  {ep.params.map(([name, desc]) => (
                    <li key={name} className="flex flex-wrap gap-2">
                      <code className="rounded bg-muted px-1 font-mono text-xs text-accent-foreground">
                        {name}
                      </code>
                      <span className="text-muted-foreground">{desc}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Пример одговора</CardTitle>
        </CardHeader>
        <CardContent>
          <CodeBlock
            code={`{
  "total": 12,
  "limit": 3,
  "offset": 0,
  "items": [
    {
      "id": "леб",
      "word": "леб",
      "pos": "м.",
      "definition": "хлеб. — Умеси леб за вечеру.",
      "letter": "Л",
      "category": "Храна и пиће",
      "scope": "osnovni"
    }
  ]
}`}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Примери позива</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <p className="text-sm font-medium">curl</p>
            <CodeBlock code={curl} />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium">JavaScript (fetch)</p>
            <CodeBlock code={jsSample} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Испробај одмах</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              value={tryPath}
              onChange={(e) => setTryPath(e.target.value)}
              className="flex-1 rounded-md border bg-background px-3 py-2 font-mono text-sm"
              placeholder="/entries?q=леб&limit=3"
              aria-label="Путања API захтева"
            />
            <Button onClick={run} disabled={loading} className="sm:w-auto">
              {loading ? "Учитавам…" : "Пошаљи GET"}
            </Button>
          </div>
          {result && (
            <pre className="max-h-80 overflow-auto rounded-lg border bg-muted/60 p-3 text-xs">
              <code>{result}</code>
            </pre>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Услови коришћења</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            Подаци су доступни под лиценцом CC BY 4.0 — слободно их користи, уз обавезно навођење
            извора „Заплањски речник“ и линка на сајт.
          </p>
          <p>
            API је намењен разумној употреби. Молимо кеширај одговоре на својој страни и избегавај
            масовне узастопне захтеве. Пиши нам ако ти треба већи обим.
          </p>
          <a
            href="/uputstvo"
            className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
          >
            Упутство за коришћење апликације <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </CardContent>
      </Card>
    </div>
  );
}
