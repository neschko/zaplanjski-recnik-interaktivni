export const DIALECTS = [
  { value: "prizrensko_juznomoravski", label: "Призренско-јужноморавски" },
  { value: "svrljisko_zaplanjski", label: "Сврљишко-заплањски" },
  { value: "timocko_luznicki", label: "Тимочко-лужнички" },
  { value: "kosovsko_resavski", label: "Косовско-ресавски" },
  { value: "sumadijsko_vojvodjanski", label: "Шумадијско-војвођански" },
  { value: "ostalo", label: "Остало" },
  { value: "nepoznato", label: "Непознато" },
] as const;

export type DialectValue = typeof DIALECTS[number]["value"];

export function dialectLabel(value?: string | null): string {
  if (!value) return "—";
  return DIALECTS.find(d => d.value === value)?.label ?? value;
}

export const SCOPES = [
  { value: "osnovni", label: "Основни" },
  { value: "licni", label: "Лични" },
  { value: "zajednicki", label: "Заједнички" },
] as const;

export type ScopeValue = typeof SCOPES[number]["value"];

export function scopeLabel(value?: string | null): string {
  if (!value) return "—";
  return SCOPES.find(s => s.value === value)?.label ?? value;
}

export const SR_ALPHABET = [
  "А","Б","В","Г","Д","Ђ","Е","Ж","З","И","Ј","К","Л","Љ","М","Н","Њ","О","П","Р","С","Т","Ћ","У","Ф","Х","Ц","Ч","Џ","Ш",
];