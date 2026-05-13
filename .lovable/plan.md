## Циљ

Админ страница на којој АИ скенира одреднице **Основног речника** у малим батчевима, проналази вероватне OCR грешке (у речи, дефиницији, примерима), и приказује их као предлоге које админ ручно одобрава или одбацује. Прихваћене исправке се памте у бази и примењују као оверлеј преко статичног JSON-а.

---

## Архитектура

Основни речник је статичан JSON (`src/data/osnovni-recnik.json`) и не може се мењати из рантајма. Зато уводимо **табелу исправки као оверлеј**:

- Табела `osnovni_corrections` чува одобрене исправке по `entry_id` и `field` (`word` | `definition` | `examples[i]`).
- `src/lib/osnovniRecnik.ts` при учитавању меша JSON са исправкама из базе (једнократан фетч + кеш) тако да Речник, претрага и категорије одмах виде исправљене вредности.
- Касније, ако желиш, исправке се могу „спустити" у JSON фајл једним скриптом — али није обавезно.

---

## База

Миграција креира:

```text
osnovni_corrections
  id              uuid pk
  entry_id        text not null         -- id из osnovni-recnik.json (нпр. "abc-123" или slug)
  field           text not null         -- 'word' | 'definition' | 'example'
  example_index   int  null             -- само за field='example'
  original        text not null         -- шта је било пре исправке (за audit)
  corrected       text not null         -- финална вредност
  reason          text null             -- кратко образложење АИ-ја
  confidence      numeric null          -- 0..1
  approved_by     uuid not null         -- admin user id
  approved_at     timestamptz default now()
  unique(entry_id, field, example_index)

osnovni_review_progress
  id              uuid pk
  entry_id        text unique not null
  scanned_at      timestamptz default now()
  suggestions_count int default 0
```

RLS:
- `osnovni_corrections`: SELECT јаван (јер се мешају у приказ речника); INSERT/UPDATE/DELETE само `has_role(auth.uid(),'admin')`.
- `osnovni_review_progress`: све операције само админ.

---

## Edge функција `ocr-review-batch`

Улаз: `{ entry_ids: string[] }` (макс 25).

За сваки entry повлачи `word`, `definition`, `examples` из JSON-а на серверу (фајл се чита из деноа преко `import osnovni from "../../../src/data/osnovni-recnik.json" with { type: "json" }` или копија у `supabase/functions/_shared/`).

Шаље једним позивом ка Lovable AI Gateway (`google/gemini-2.5-flash`) са `tool_choice` функцијом `report_ocr_issues`:

```text
parameters: {
  results: [{
    entry_id: string,
    suggestions: [{
      field: 'word' | 'definition' | 'example',
      example_index?: number,
      original: string,
      corrected: string,
      reason: string,           // 1 реченица, шта је сумњиво
      confidence: number        // 0..1
    }]
  }]
}
```

System prompt (срж, на ћирилици): „Ти си коректор српског OCR текста из дијалекатског речника југоисточне Србије (заплањско-сврљишки). Анализирај реч, дефиницију и примере. Тражи **вероватне OCR грешке**: замене сличних знакова (л↔љ, н↔њ, ћ/ч, ш/ш, и/й, 0/О, 1/I/л), погрешно прелепљене или раздвојене речи, недостајуће дијакритике и акценте, нелогичне знакове интерпункције, погрешан размак око зареза/тачке. Не „поправљај" дијалекатске облике у стандардни српски — облик мора остати дијалекатски. Ако ниси сигуран — не предлажи. Сваки предлог мора имати кратко образложење и поузданост."

Грешке: 429/402 проследи као у `suggest-entry`. Резултат за сваки entry се уписује у `osnovni_review_progress` (upsert), сами предлози се **не уписују у базу** — живе само у одговору и приказују се у UI-ју; базу мења тек админ одобравањем.

---

## Админ страница `/upravljanje/ocr-pregled`

Видљива само ако `useAuth().isAdmin`. Линк додати у `Upravljanje.tsx`.

Структура:

```text
[ Скенирај следећих 20 ]   Прегледано: 1.240 / 5.765
[ Филтер по слову ▾ ] [ Само високе поузданости ☐ ]

— одредница: „абер"
   field: definition
   било:    „гласв, вест"
   предлог: „глас, вест"
   разлог:  замена 'в' уместо размака после 'с' (OCR)
   поузданост: 0.92
   [ Прихвати ] [ Одбаци ] [ Уреди ручно ]
   ─────────────────────────────
— одредница: „авлија"
   field: example[1]
   било:    „Иди у авлију. И затвори капију"
   предлог: „Иди у авлију и затвори капију."
   разлог:  погрешна тачка/велико слово у средини реченице
   поузданост: 0.78
   [ Прихвати ] [ Одбаци ] [ Уреди ручно ]
```

Понашање:
- Дугме „Скенирај следећих 20" узима следећих 20 одредница које **још нису у `osnovni_review_progress`** (азбучним редом, или по филтеру слова), позива edge функцију, приказује предлоге.
- „Прихвати" → INSERT у `osnovni_corrections` + локално освежи листу (предлог нестаје).
- „Одбаци" → ништа се не пише у `osnovni_corrections` (одредница је и даље `scanned_at`, неће се поново скенирати; сем ако кликнеш „Скенирај поново ову").
- „Уреди ручно" → инлајн textarea пре „Прихвати", па снима измењено `corrected`.
- Прогрес-бар на врху: `count(osnovni_review_progress) / OSNOVNI_TOTAL`.
- Опционо филтер „Прикажи већ исправљене" → листа из `osnovni_corrections` са дугметом „Поништи исправку" (DELETE).

Стил: семантички токени (`bg-card`, `border-border`, `text-primary`, `bg-accent`), badge за поузданост (зелена ≥0.9, жута 0.7–0.9, црвена <0.7).

---

## Примена исправки у апликацији

`src/lib/osnovniRecnik.ts`:
- Додати `loadOsnovniCorrections()` који једном повуче све редове из `osnovni_corrections` и врати `Map<entry_id, { word?, definition?, examples: Map<index,string> }>`.
- Постојеће `getOsnovniById`, `searchOsnovni`, `OSNOVNI_BY_CATEGORY` мешају исправке преко изворног JSON-а пре него што врате податке.
- Кеш у меморији + invalidate након admin акција (једноставан event/refetch у админ страници).

Корисник у Речнику и на детаљу види **исправљене** текстове без иједне промене у JSON фајлу.

---

## Технички фајлови

Ново:
- `supabase/functions/ocr-review-batch/index.ts`
- `src/pages/UpravljanjeOcr.tsx`
- migration: табеле `osnovni_corrections`, `osnovni_review_progress` + RLS

Измењено:
- `src/lib/osnovniRecnik.ts` — учитавање и мешање исправки
- `src/App.tsx` — рута `/upravljanje/ocr-pregled` (admin guard)
- `src/pages/Upravljanje.tsx` — линк ка новој страници
- `supabase/functions/_shared/osnovni.json` (или директан import из `src/data/`) — да edge функција има приступ изворним текстовима

Без нових секрета (`LOVABLE_API_KEY` већ постоји).

---

## Цена и брзина

- Gemini 2.5 Flash, ~25 одредница по позиву, кратки текстови → ~1–2 секунде по батчу, веома мала цена.
- Цео речник (5.765) ≈ 230 батчева. Може се пролазити постепено, прогрес се памти, увек се може наставити.

---

## Шта остаје непромењено

- Изворни `src/data/osnovni-recnik.json` се не дира.
- Заједнички и Лични речник, анализе, коментари, AI превод реченица, тематске категорије — без промена.
