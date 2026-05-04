import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const DIALECT_VALUES = [
  "prizrensko_juznomoravski",
  "svrljisko_zaplanjski",
  "timocko_luznicki",
  "kosovsko_resavski",
  "sumadijsko_vojvodjanski",
  "ostalo",
  "nepoznato",
];

const SYSTEM_PROMPT = `Ти си стручни српски дијалектолог специјализован за говоре југоисточне Србије.
Анализирај дати унос (текст или аудио снимак говора) и одреди којем српском дијалекту највероватније припада.
Ако је дат аудио снимак — прво га тачно транскрибуј на ћирилицу (поље transcript), задржавајући оригиналне дијалекатске облике.
Обрати пажњу на: акценат, рефлекс јата, употребу падежних облика (или њиховог изостанка),
карактеристичне лексеме, аналитичку компарацију, енклитичке облике, итд.
Препознај и наброј речи које су карактеристично заплањске/призренско-јужноморавске.`;

const MIME_TO_FORMAT: Record<string, string> = {
  "audio/mpeg": "mp3",
  "audio/mp3": "mp3",
  "audio/wav": "wav",
  "audio/wave": "wav",
  "audio/x-wav": "wav",
  "audio/webm": "webm",
  "audio/ogg": "ogg",
  "audio/mp4": "mp4",
  "audio/x-m4a": "m4a",
  "audio/m4a": "m4a",
  "audio/aac": "aac",
  "audio/flac": "flac",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { text, model, source_type, audio_base64, audio_mime } = await req.json();
    const isAudio = source_type === "audio";

    if (!isAudio) {
      if (!text || typeof text !== "string" || text.trim().length < 5) {
        return json({ error: "Текст је превише кратак за анализу." }, 400);
      }
    } else {
      if (!audio_base64 || typeof audio_base64 !== "string") {
        return json({ error: "Недостаје аудио." }, 400);
      }
      if (!audio_mime || !MIME_TO_FORMAT[audio_mime]) {
        return json({ error: `Неподржан формат: ${audio_mime}. Користи mp3, wav, m4a, webm или ogg.` }, 400);
      }
      // ~5MB raw → ~6.7MB base64
      if (audio_base64.length > 7_500_000) {
        return json({ error: "Снимак је превелик (макс. ~5MB). Скрати га или конвертуј у mp3 ниже резолуције." }, 413);
      }
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return json({ error: "AI није конфигурисан." }, 500);

    const chosenModel = (typeof model === "string" && model) || "google/gemini-2.5-flash";

    const userContent: any = isAudio
      ? [
          {
            type: "input_audio",
            input_audio: { data: audio_base64, format: MIME_TO_FORMAT[audio_mime] },
          },
          {
            type: "text",
            text: "Транскрибуј овај снимак на ћирилицу, потом анализирај дијалекат и наброј карактеристичне речи.",
          },
        ]
      : text;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: chosenModel,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userContent },
        ],
        tools: [{
          type: "function",
          function: {
            name: "report_dialect",
            description: "Извештај о препознатом дијалекту",
            parameters: {
              type: "object",
              properties: {
                transcript: {
                  type: "string",
                  description: "Тачан транскрипт аудиа на ћирилици. За текстуални унос остави празно.",
                },
                dialect: { type: "string", enum: DIALECT_VALUES },
                confidence: { type: "number", minimum: 0, maximum: 1 },
                reasoning: { type: "string", description: "Кратко објашњење на српском (ћирилица), 2-5 реченица." },
                recognized_words: {
                  type: "array",
                  description: "Карактеристичне дијалекатске речи из текста",
                  items: {
                    type: "object",
                    properties: {
                      word: { type: "string" },
                      note: { type: "string", description: "Кратко објашњење зашто" },
                    },
                    required: ["word"],
                  },
                },
              },
              required: ["dialect", "confidence", "reasoning", "recognized_words"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "report_dialect" } },
      }),
    });

    if (aiResp.status === 429) return json({ error: "Превише захтева, пробај касније." }, 429);
    if (aiResp.status === 402) return json({ error: "AI кредити исцрпљени. Допуни у Lovable Cloud." }, 402);
    if (!aiResp.ok) {
      const t = await aiResp.text();
      console.error("AI gateway error:", aiResp.status, t);
      return json({ error: "Грешка AI сервиса." }, 500);
    }

    const data = await aiResp.json();
    const call = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!call) return json({ error: "AI није вратио структурирани одговор." }, 500);
    const args = JSON.parse(call.function.arguments);

    const supa = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const authHeader = req.headers.get("Authorization");
    let owner_id: string | null = null;
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: ud } = await supa.auth.getUser(token);
      owner_id = ud.user?.id ?? null;
    }

    const transcript = isAudio ? (args.transcript ?? "") : null;

    const { data: analysis, error: insErr } = await supa.from("analyses").insert({
      owner_id,
      source_type: isAudio ? "audio" : "text",
      input_text: isAudio ? null : text,
      transcript,
      detected_dialect: args.dialect,
      confidence: args.confidence,
      reasoning: args.reasoning,
      model: chosenModel,
    }).select().single();

    if (insErr) {
      console.error("Insert analysis err:", insErr);
      return json({ error: insErr.message }, 500);
    }

    const recognized: { word: string; note?: string }[] = args.recognized_words ?? [];

    return json({
      analysis,
      recognized_words: recognized,
    });
  } catch (e: any) {
    console.error("analyze-speech error:", e);
    return json({ error: e?.message ?? "Непозната грешка" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
