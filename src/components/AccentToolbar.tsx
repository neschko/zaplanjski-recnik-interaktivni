import { useEffect } from "react";
import { toast } from "@/hooks/use-toast";

const ACCENTS = [
  { char: "\u0300", label: "Краткосилазни", key: "1", symbol: "◌̀" },
  { char: "\u0301", label: "Дугоузлазни",   key: "2", symbol: "◌́" },
  { char: "\u0302", label: "Дугосилазни",   key: "3", symbol: "◌̂" },
  { char: "\u030F", label: "Краткоузлазни", key: "4", symbol: "◌̏" },
  { char: "\u0304", label: "Дужина",        key: "5", symbol: "◌̄" },
];

type AnyTextEl = HTMLInputElement | HTMLTextAreaElement;

function insertAt(el: AnyTextEl, ch: string) {
  const start = el.selectionStart ?? el.value.length;
  const end = el.selectionEnd ?? start;
  const v = el.value;
  const newVal = v.slice(0, start) + ch + v.slice(end);
  const proto = el.tagName === "TEXTAREA" ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
  setter?.call(el, newVal);
  el.dispatchEvent(new Event("input", { bubbles: true }));
  requestAnimationFrame(() => {
    const pos = start + ch.length;
    el.setSelectionRange(pos, pos);
    el.focus();
  });
}

export function AccentToolbar({
  targetRef,
  label = "Брзи акценатор",
}: {
  targetRef: React.RefObject<AnyTextEl>;
  label?: string;
}) {
  useEffect(() => {
    const el = targetRef.current;
    if (!el) return;
    const handler = (e: KeyboardEvent) => {
      if (!e.altKey || e.ctrlKey || e.metaKey) return;
      const a = ACCENTS.find(x => x.key === e.key);
      if (!a) return;
      e.preventDefault();
      insertAt(el, a.char);
    };
    el.addEventListener("keydown", handler);
    return () => el.removeEventListener("keydown", handler);
  }, [targetRef]);

  const insert = (ch: string) => {
    const el = targetRef.current;
    if (!el) {
      toast({ title: "Поље није активно", variant: "destructive" });
      return;
    }
    insertAt(el, ch);
  };

  return (
    <div className="flex flex-wrap items-center gap-1 mt-1.5">
      <span className="text-[11px] text-muted-foreground mr-1">{label}:</span>
      {ACCENTS.map(a => (
        <button
          key={a.key}
          type="button"
          onClick={() => insert(a.char)}
          title={`${a.label} (Alt+${a.key}) — куцај слово па одмах притисни`}
          className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/40 hover:bg-accent px-2 py-1 text-xs leading-none"
        >
          <span className="font-serif text-base">{a.symbol}</span>
          <span className="text-muted-foreground hidden sm:inline">Alt+{a.key}</span>
        </button>
      ))}
    </div>
  );
}
