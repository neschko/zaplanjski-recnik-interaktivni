import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DIALECTS = [
  "prizrensko_juznomoravski",
  "svrljisko_zaplanjski",
  "timocko_luznicki",
  "kosovsko_resavski",
  "sumadijsko_vojvodjanski",
  "ostalo",
  "nepoznato",
];

const SYSTEM = `Ти си стручни српски лексикограф у духу Речника САНУ и Речника српскохрватског књижевног и народног језика.
За дату реч (обично из дијалеката југоисточне Србије) попуни одредницу: дефиницију у САНУ маниру (концизно, лексикографски, без личних коментара),
2–4 примера употребе (по могућству у духу истог дијалекта), синониме (стандардни српски еквиваленти),
и одреди најверованији дијалекат. Сав текст пиши на ћирилици.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { word, context, model } = await req.json();
    if (!word || typeof word !== "string") return json({ error: "word је обавезан" }, 400);

    const KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!KEY) return json({ error: "AI није конфигурисан." }, 500);

    const chosen = (typeof model === "string" && model) || "google/gemini-2.5-flash";

    const userMsg = `Реч: ${word}\n${context ? `Контекст (исказ из којег је извучена):\n"""${context.slice(0, 2000)}"""` : ""}`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: chosen,
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: userMsg },
        ],
        tools: [{
          type: "function",
          function: {
            name: "fill_entry",
            description: "Попуњена САНУ одредница",
            parameters: {
              type: "object",
              properties: {
                word: { type: "string", description: "Нормализован облик одреднице (ћирилица)" },
                definition: { type: "string", description: "Лексикографска дефиниција у САНУ маниру" },
                examples: { type: "array", items: { type: "string" }, description: "2-4 примера употребе" },
                synonyms: { type: "array", items: { type: "string" }, description: "Стандардни српски синоними" },
                dialect: { type: "string", enum: DIALECTS },
              },
              required: ["word", "definition", "examples", "synonyms", "dialect"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "fill_entry" } },
      }),
    });

    if (aiResp.status === 429) return json({ error: "Превише захтева, пробај касније." }, 429);
    if (aiResp.status === 402) return json({ error: "AI кредити исцрпљени." }, 402);
    if (!aiResp.ok) {
      const t = await aiResp.text();
      console.error("AI gateway error:", aiResp.status, t);
      return json({ error: "Грешка AI сервиса." }, 500);
    }

    const data = await aiResp.json();
    const call = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!call) return json({ error: "AI није вратио структурирани одговор." }, 500);
    const args = JSON.parse(call.function.arguments);
    return json({ suggestion: args });
  } catch (e: any) {
    console.error("suggest-entry error:", e);
    return json({ error: e?.message ?? "Непозната грешка" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
