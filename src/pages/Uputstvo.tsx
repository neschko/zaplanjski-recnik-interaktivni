import { Download, FileText } from "lucide-react";

const REBUILD_PROMPT = `# Мастер-промпт: Заплањски Речник (комплетна репликација)

Изгради потпуно функционалну веб-апликацију названу „Заплањски Речник" — дигитални речник и AI алат за препознавање и очување дијалеката југоисточне Србије, са акцентом на заплањски (сврљишко-заплањски) говор.

## 1. Технолошки стек
- React 18 + Vite 5 + TypeScript 5
- Tailwind CSS v3 + shadcn/ui компоненте
- React Router (BrowserRouter)
- TanStack Query за кеширање
- Backend: Supabase (Postgres + Auth + Edge Functions + Storage)
- AI: Lovable AI Gateway (google/gemini-2.5-flash) — транскрипција, класификација дијалекта, превод, OCR-ревизија
- Извоз: jsPDF (са уграђеним Noto Serif ћириличним фонтом) и ручно паковање EPUB-а (JSZip)

## 2. Визуелни идентитет (обавезно копирати)
### Палета боја (HSL, у index.css као семантички токени)
- background: 40 35% 96%  (крем)
- foreground: 20 30% 18%  (тамно браон текст)
- primary: 22 28% 26%  (тамно браон — озбиљан, за наслове и главна дугмад)
- primary-foreground: 40 35% 96%
- primary-glow: 8 68% 55%  (теракота-црвена)
- secondary: 188 55% 48%  (бирузна — линкови, акценти)
- accent: 40 65% 88%  (мустар/окер — светла позадина картица)
- destructive: 8 72% 52%  (теракота)
- radius: 0.75rem
Инспирација: геометријски мозаик од испреплетених „X" облика у бирузној, браон, мустар жутој и корално-црвеној.

### Типографија
- Наслови и .font-serif: **Lora** (Google Fonts), fallback Georgia, Times New Roman
- Тело: sans-serif системски (Tailwind default)
- font-feature-settings: "kern","liga"

### Хедер (кључно)
- Лого: раскошна ћирилична ознака „**З.Речник**" — стилизовано „З" у кругу са мозаичким градијентом (bg-gradient-mosaic из tailwind.config), декоративне тачкице/линије око логоа
- Навигација: Почетна, Речник, Анализа, Коментари, Упутство, Управљање (admin), Пријава/Одјава
- На мобилном: hamburger drawer, натпис „Жива реч и AI анализа дијалеката југоисточне Србије" се лепо прелама (break-words)

### Опште
- Заобљене картице, border-border, суптилне сенке (shadow-warm)
- Никад hardcoded боје у компонентама — само семантички токени

## 3. Странице и руте
- \`/\` **Почетна**: Хиро секција са ћириличним насловом, два CTA дугмета (Истражи речник / Анализирај говор), инлајн AI преводилац реченица (стандардни ↔ заплањски), решетка тематских категорија (Тело и здравље, Животиње, Природа и биљке, Радње и понашање, Људи и родбина, Храна и пиће, Овчарство и сточарство, Грађевина и дунђерлук, Особине, Време и празници, Пољопривреда, Кућа и покућство, Одећа и обућа), 3 картице са особинама
- \`/recnik\` **Речник**: азбучник (30 слова), филтер по scope-у (Основни/Лични/Заједнички), филтер по дијалекту, филтер по категорији (?cat=), пуна претрага, дугме „Додај нову реч"
- \`/recnik/nova\` и \`/recnik/:id/uredi\` **Форма**: реч, дефиниција, примери, дијалекат, scope, категорија, AI-контекст поље, „AI попуни", „Врати AI" (revert), Брзи Ћирилични Акцентатор (Alt+1..5 пречице за 5 акцената + дужина), admin brisanje
- \`/recnik/:id\` **Детаљ речи**: дефиниција, примери, дијалекат, коментари (свако сме коментарисати, чак и без пријаве, уз опционо име госта); на мобилном auto-focus поља и blur после слања
- \`/analiza\` **Анализа**: upload аудио фајла или снимање микрофоном (mp3/wav/m4a/webm/ogg до ~5MB) или унос текста; шаље у edge функцију \`analyze-speech\`; повратно транскрипт, процењени дијалекат, образложење, повезивање препознатих речи са одредницама у речнику
- \`/analiza/:id\` **Детаљ анализе**
- \`/komentari\` **Коментари** — глобални преглед
- \`/upravljanje\` **Управљање (admin)**: додела admin/lektor улога, admin панел свих одредница са брзим уређивањем/брисањем по свим scope-овима
- \`/upravljanje/ocr-pregled\` **OCR ревизија** (admin): AI пролази кроз батчеве основног речника и предлаже исправке OCR грешака (нпр. л↔љ, пунктуација); admin прихвата/одбија; исправке се чувају као overlay у бази, статички JSON остаје нетакнут (Proxy систем)
- \`/uputstvo\` **Упутство** + овај мастер-промпт са дугметом за извоз у .txt
- \`/auth\` **Пријава/регистрација** (email + Google OAuth)

## 4. Дијалекти (enum)
prizrensko_juznomoravski, svrljisko_zaplanjski, timocko_luznicki, kosovsko_resavski, sumadijsko_vojvodjanski, juzna_srbija, ostalo, nepoznato

## 5. Три опсега речника (scope)
- **osnovni**: 5.700+ статичких одредница из JSON фајла (\`src/lib/osnovniRecnik.ts\`) — read-only, admin уређивања се чувају као нове ставке у „заједнички" (never mutate JSON)
- **licni**: лични нацрти корисника
- **zajednicki**: online дељени речник свих корисника

## 6. База података (Supabase)
Табеле у public шеми (свака са GRANT-овима и RLS):
- \`profiles\` (id=auth.uid, email, display_name)
- \`user_roles\` (user_id, role app_role enum: admin|lektor|user) — читање само власник или admin (спречи енумерацију улога)
- \`entries\` (word, definition, examples[], dialect, scope, category, author_id, ...)
- \`analyses\` (audio_url, transcript, predicted_dialect, reasoning, author_id nullable) — анонимне јавне, ауторске приватне
- \`comments\` (entry_id, author_id nullable, guest_name nullable, body) — анонимно допуштено
- \`ocr_corrections\` (original_key, corrected fields, status, approved_by)
- Триггер \`on_auth_user_created\` попуњава profiles + подразумевану \`user\` улогу
- SECURITY DEFINER функција \`has_role(_user_id, _role)\` за не-рекурзивне RLS провере

## 7. Edge функције
- \`analyze-speech\`: прима аудио base64 или текст; ако је аудио прво тражи транскрипт од Gemini; затим класификује дијалекат. Системски промпт садржи детаљне смернице из монографије Марковића о заплањском (динамички акценат, чување финалног -л у радном придеву — леб, отишел; полугласник ъ; екавизам; вокално л→у; аналитичка деклинација; постпозитивни члан; аорист/имперфекат; разграничење од тимочко-лужничког). AI враћа Зону I или II и наводи конкретне индикаторе.
- \`translate-sentence\`: превод стандардни↔заплањски са напоменама; rate-limit и 402 handling
- \`suggest-entry\`: AI попуњавање форме нове речи из корисничког AI-контекста
- \`ocr-review-batch\`: батч AI ревизија основног речника

## 8. Кључне UX особине
- Брзи Ћирилични Акцентатор (\`AccentToolbar\`): дугмад и Alt+1..5 пречице за краткосилазни, дугоузлазни, дугосилазни, краткоузлазни и дужину; уметање на позицији курсора
- Извоз речника: PDF (jsPDF + уграђен Noto Serif ћирилични фонт), EPUB (ручно паковање са TOC NCX, nav у spine-у, коректним метаподацима), DOCX, JSON — дугмад за извоз задржавају оригиналне живе боје (PDF црвено, DOCX плаво, EPUB зелено, JSON тиркизно)
- Anonymous комeнтари уз опционо име
- Мобилна оптимизација: full-width dugmad на маленим екранима, auto-focus/blur, break-words у хедеру
- SEO: sitemap.xml, robots.txt са Sitemap: директивом, семантички HTML, meta title/description на српском

## 9. Безбедност
- Улоге у одвојеној \`user_roles\` табели (никад на profiles)
- Server-side провера admin статуса преко \`has_role\`
- RLS на свим table-овима; expliciran GRANT за authenticated/anon/service_role сходно потреби
- Никада не изложити service_role кључ на клијенту

## 10. Тон и језик
Целокупан UI на српској ћирилици. Топао, поштовања пун однос према говорницима и очувању дијалекта. Наслови у Lora сериф фонту делују као књижни, али јасни.

## 11. Испорука
Апликација треба да буде responsive (мобилни ≥ 360px до десктоп), да ради без иностраних API кључева (Lovable AI Gateway је уграђен), и да сваки нови unos буде одмах доступан свима у Заједничком речнику. Admin панел омогућава брзу модерацију, доделу улога и OCR ревизију основног корпуса.
`;

export default function Uputstvo() {
  const downloadPrompt = () => {
    const blob = new Blob([REBUILD_PROMPT], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "zaplanjski-recnik-prompt.txt";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <h1 className="font-serif text-3xl font-bold text-secondary">Упутство</h1>
      <p className="text-muted-foreground mt-1">Како користити Заплањски Речник — жива реч и AI анализа дијалеката југоисточне Србије.</p>

      <h2 className="font-serif text-xl text-secondary mt-6">Анализа говора</h2>
      <p className="mt-2 text-foreground/85">
        На страници <strong>Анализа</strong> можеш послати <strong>аудио снимак</strong> (фајл или снимљено са микрофона)
        или унети текст. Lovable AI самостално транскрибује снимак и одређује дијалекат — без додатних кључева ни подешавања.
        Подржани формати: mp3, wav, m4a, webm, ogg (до ~5MB по снимку).
      </p>
      <p className="mt-2 text-foreground/85">
        Подржани дијалекти: Призренско-јужноморавски, Сврљишко-заплањски, Тимочко-лужнички, Косовско-ресавски,
        Шумадијско-војвођански, <strong>Јужна Србија</strong>, Остало и Непознато.
      </p>

      <h2 className="font-serif text-xl text-secondary mt-6">Речник</h2>
      <ul className="list-disc list-inside space-y-1 mt-2 text-foreground/85">
        <li><strong>Основни</strong> — званичне одреднице које додају искључиво администратори.</li>
        <li><strong>Лични</strong> — твој приватни радни простор за нацрте и сопствене речи.</li>
        <li><strong>Заједнички</strong> — дељени online речник свих корисника.</li>
      </ul>
      <p className="mt-2 text-foreground/85">
        Речи можеш претраживати по слову српске азбуке, по дијалекту или слободним уносом текста. Свака реч има
        своју страницу са дефиницијом, примерима, дијалектом и коментарима.
      </p>

      <h2 className="font-serif text-xl text-secondary mt-6">Додавање нове речи</h2>
      <p className="mt-2 text-foreground/85">
        Кликом на <strong>„Додај нову реч“</strong> отвара се форма у којој уносиш реч, дефиницију, примере и дијалекат.
        Уз поља за унос налази се <strong>Брзи акценатор</strong> — алат за уметање ћириличних акценатских знакова
        (краткосилазни, дугоузлазни, дугосилазни, краткоузлазни и дужина). Знакове умећеш кликом на дугмад
        или пречицама <kbd>Alt+1</kbd> до <kbd>Alt+5</kbd> на месту курсора.
      </p>

      <h2 className="font-serif text-xl text-secondary mt-6">Коментари</h2>
      <p className="mt-2 text-foreground/85">
        Коментаре на свакој речи може да оставља <strong>свако</strong> — и без пријаве — како би се подстакао
        живи разговор о значењима, изговору и употреби.
      </p>

      <h2 className="font-serif text-xl text-secondary mt-6">Извоз речника</h2>
      <p className="mt-2 text-foreground/85">
        Речник можеш да преузмеш у <strong>PDF</strong> или <strong>EPUB</strong> формату, ради штампе или читања
        ван мреже на читачима електронских књига.
      </p>

      <h2 className="font-serif text-xl text-secondary mt-6">Дубока интеграција</h2>
      <p className="mt-2 text-foreground/85">
        После анализе говора, препознате речи које постоје у речнику постају линкови ка својим страницама;
        непознате можеш одмах додати у Лични или Заједнички речник једним кликом.
      </p>

      <h2 className="font-serif text-xl text-secondary mt-6">Налог</h2>
      <p className="mt-2 text-foreground/85">
        За додавање одредница потребна је пријава. Без налога можеш претраживати речник, правити анонимне анализе
        и остављати коментаре.
      </p>

      <section className="mt-10 rounded-xl border border-border bg-card p-5 shadow-warm">
        <div className="flex items-start gap-3">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-accent-foreground shrink-0">
            <FileText className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="font-serif text-xl text-secondary">Мастер-промпт за поновну изградњу</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Комплетан детаљан промпт који описује визуелни идентитет, палету, типографију, руте,
              базу података, edge функције и све могућности апликације — довољан за верно
              поновно креирање овог сајта.
            </p>
            <div className="mt-3">
              <button
                type="button"
                onClick={downloadPrompt}
                className="inline-flex items-center gap-2 rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:opacity-90 transition"
              >
                <Download className="h-4 w-4" />
                Преузми .txt
              </button>
            </div>
          </div>
        </div>

        <pre className="mt-4 max-h-[520px] overflow-auto whitespace-pre-wrap break-words rounded-lg border border-border bg-background p-4 text-xs leading-relaxed text-foreground/90 font-mono">
{REBUILD_PROMPT}
        </pre>
      </section>
    </div>
  );
}
