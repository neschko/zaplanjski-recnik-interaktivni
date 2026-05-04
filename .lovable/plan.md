## Циљ
Уклонити обавезу за `ELEVENLABS_API_KEY`. Аудио се шаље директно Lovable AI Gateway-у (Gemini), који у једном позиву враћа транскрипт + дијалекат + препознате речи.

## Промене

### 1. `supabase/functions/analyze-speech/index.ts`
- Прихватити нови облик тела:
  ```ts
  { source_type: "audio" | "text",
    text?: string,
    audio_base64?: string,
    audio_mime?: string,   // "audio/mpeg" | "audio/wav" | "audio/webm" | ...
    model?: string }
  ```
- За `source_type === "audio"`:
  - Валидација: postoji `audio_base64`, mime почиње са `audio/`, величина ≤ ~15MB декодирано.
  - Преводимо mime → Gemini `format` (`mp3`, `wav`, `webm`, `ogg`, `m4a`).
  - Поруку шаљемо као мулти-парт content:
    ```ts
    { role: "user", content: [
      { type: "input_audio", input_audio: { data: audio_base64, format } },
      { type: "text", text: "Транскрибуј снимак на ћирилицу, па анализирај дијалекат." }
    ]}
    ```
- Tool `report_dialect` — додати обавезно поље `transcript: string`.
- Сачувати `transcript` у колону `analyses.transcript`, `input_text` остаје `null`.
- Враћати исти облик одговора као сада (`{ analysis, recognized_words }`) + `analysis.transcript` доступан клијенту.
- Задржати све постојеће руковање грешкама (402, 429).

### 2. `src/pages/Analiza.tsx`
- Аудио мод: уклонити textarea за паste-овани транскрипт; додати:
  - `<input type="file" accept="audio/*">` (drag&drop опционо).
  - Дугме „Сними" преко `MediaRecorder` (webm/opus) — toggle Снимам/Заустави, мали тајмер.
  - Приказ изабраног фајла + дужине (ако је доступно преко `Audio` елемента).
- На „Анализирај":
  - Прочитати фајл као base64 (`FileReader.readAsDataURL` → стрипати prefix).
  - Провера величине (≤15MB) са toast грешком ако је прекорачено.
  - `supabase.functions.invoke("analyze-speech", { body: { source_type: "audio", audio_base64, audio_mime, model } })`.
- Резултат: ако је дошао `analysis.transcript`, приказати га изнад „Препознатих речи" у малом боксу „Транскрипт" (read-only, copy дугме).
- Текстуални мод остаје непромењен.

### 3. `AnalizaDetalj.tsx` (мала допуна)
- Ако постоји `transcript`, приказати га у засебном делу странице.

### 4. README / `Uputstvo.tsx`
- Додати кратку напомену: „Аудио анализа ради директно преко Lovable AI (Gemini) — без додатних кључева. Подржани формати: mp3, wav, m4a, webm, ogg. Препоручено до ~5 минута и 15 MB."

## Технички детаљи / ограничења
- Gemini multimodal `input_audio` део званичног OpenAI-compat schema-a који Lovable AI Gateway прослеђује.
- Без word-level timestamp-а и без diarization-а (то нуди ElevenLabs Scribe — задржавамо као будућу опцију).
- Edge function payload лимит ~6MB JSON; због base64 (≈+33%) практичан лимит сировог аудиа је ~4–5MB. За дуже снимке у каснијој фази уводимо upload у Storage па path → функција. Засад приказујемо упозорење у UI-у.
- Без миграција базе.
- Без нових секрета — користи се постојећи `LOVABLE_API_KEY`.
