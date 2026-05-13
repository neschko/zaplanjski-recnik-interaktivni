import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM = `Ти си стручњак за заплањски говор (сврљишко-заплањски дијалекат југоисточне Србије).
Преведи реченицу у назначеном смеру, чувај смисао и регистар.
Користи карактеристичну лексику и облике заплањског говора када је циљни језик заплањски
(нпр. енклитике, изостављање помоћних глагола „је/ће", типичне речи као „што", „куде", „гу", „не'е", „си", акцентоване речи).
Када је циљни језик стандардни српски, дај природан књижевни облик.
Не додавај објашњења ван поља notes. Сав текст пиши на ћирилици.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const body = await req.json();
    const sentence = typeof body?.sentence === "string" ? body.sentence.trim() : "";
    const direction = body?.direction;
    if (!sentence || sentence.length > 500) return json({ error: "Реченица мора имати 1–500 знакова." }, 400);
    if (direction !== "std_to_zap" && direction !== "zap_to_std") {
      return json({ error: "Неисправан смер превода." }, 400);
    }

    const KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!KEY) return json({ error: "AI није конфигурисан." }, 500);

    const dirLabel = direction === "std_to_zap"
      ? "СТАНДАРДНИ СРПСКИ → ЗАПЛАЊСКИ"
      : "ЗАПЛАЊСКИ → СТАНДАРДНИ СРПСКИ";

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: `Смер: ${dirLabel}\nРеченица: """${sentence}"""` },
        ],
        tools: [{
          type: "function",
          function: {
            name: "translate_sentence",
            description: "Превод реченице у задатом смеру",
            parameters: {
              type: "object",
              properties: {
                translation: { type: "string", description: "Преведена реченица на циљном језику (ћирилица)." },
                notes: { type: "string", description: "Опционо: 1–2 кратке напомене о лексици/облицима." },
              },
              required: ["translation"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "translate_sentence" } },
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
    return json({ translation: args.translation, notes: args.notes ?? null });
  } catch (e: any) {
    console.error("translate-sentence error:", e);
    return json({ error: e?.message ?? "Непозната грешка" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
