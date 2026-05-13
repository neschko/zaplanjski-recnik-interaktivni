import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM = `Ти си коректор српског OCR текста из дијалекатског речника југоисточне Србије (заплањско-сврљишки говор).
За сваку одредницу анализирај поље „word" (одредница) и „definition" (дефиниција, која може садржати и пример после цртице „—").
Тражи **вероватне OCR грешке**:
- замене визуелно сличних знакова (л↔љ, н↔њ, ћ/ч, ш/ш, и/й, ј/ј, г/т, 0/О, 1/I/л, рн/м),
- спојене или раздвојене речи (нпр. „гласв" уместо „глас, в…", „на путу" уместо „напуту"),
- недостајуће дијакритике (нпр. ћ/ђ/ж/ш) и очигледно изостављене акценте,
- погрешан размак око зареза/тачке и нелогичну интерпункцију,
- латинично слово усред ћириличне речи (или обрнуто).
Никад не „поправљај" дијалекатске облике у стандардни српски — облик мора остати дијалекатски.
Ако ниси сигуран — НЕ предлажи. Радије преко главе пропусти грешку него да измислиш исправку.
Сваки предлог мора имати кратко образложење (1 реченица) и поузданост 0–1.
Ако нема грешке у одредници, врати празан низ предлога за њу.`;

interface InEntry { id: string; word: string; definition: string; }

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const body = await req.json();
    const entries: InEntry[] = Array.isArray(body?.entries) ? body.entries : [];
    if (entries.length === 0 || entries.length > 25) {
      return json({ error: "Очекивано 1–25 одредница." }, 400);
    }
    for (const e of entries) {
      if (typeof e?.id !== "string" || typeof e?.word !== "string" || typeof e?.definition !== "string") {
        return json({ error: "Свака одредница мора имати id, word, definition." }, 400);
      }
    }

    const KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!KEY) return json({ error: "AI није конфигурисан." }, 500);

    const userMsg = "Одреднице за преглед (JSON):\n" + JSON.stringify(entries);

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: userMsg },
        ],
        tools: [{
          type: "function",
          function: {
            name: "report_ocr_issues",
            description: "Пријава вероватних OCR грешака у одредницама",
            parameters: {
              type: "object",
              properties: {
                results: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      entry_id: { type: "string" },
                      suggestions: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            field: { type: "string", enum: ["word", "definition"] },
                            original: { type: "string", description: "Тачно онај текст који се исправља (целокупна вредност поља)." },
                            corrected: { type: "string", description: "Исправљена вредност целог поља." },
                            reason: { type: "string", description: "Кратко образложење (1 реченица)." },
                            confidence: { type: "number", description: "0–1." },
                          },
                          required: ["field", "original", "corrected", "reason", "confidence"],
                        },
                      },
                    },
                    required: ["entry_id", "suggestions"],
                  },
                },
              },
              required: ["results"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "report_ocr_issues" } },
      }),
    });

    if (aiResp.status === 429) return json({ error: "Превише захтева, пробај касније." }, 429);
    if (aiResp.status === 402) return json({ error: "AI кредити су исцрпљени." }, 402);
    if (!aiResp.ok) {
      const t = await aiResp.text();
      console.error("AI gateway error:", aiResp.status, t);
      return json({ error: "Грешка AI сервиса." }, 500);
    }

    const data = await aiResp.json();
    const call = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!call) return json({ error: "AI није вратио структурирани одговор." }, 500);
    const args = JSON.parse(call.function.arguments);
    return json({ results: args.results ?? [] });
  } catch (e: any) {
    console.error("ocr-review-batch error:", e);
    return json({ error: e?.message ?? "Непозната грешка" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
