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
  "juzna_srbija",
  "ostalo",
  "nepoznato",
];

const SYSTEM_PROMPT = `Ти си стручни српски дијалектолог специјализован за говоре југоисточне Србије.
Анализирај дати унос (текст или аудио снимак говора) и одреди којем српском дијалекту највероватније припада.
Ако је дат аудио снимак — прво га тачно транскрибуј на ћирилицу (поље transcript), задржавајући оригиналне дијалекатске облике.
Обрати пажњу на: акценат, рефлекс јата, употребу падежних облика (или њиховог изостанка),
карактеристичне лексеме, аналитичку компарацију, енклитичке облике, итд.
Препознај и наброј речи које су карактеристично заплањске/призренско-јужноморавске.

СМЕРНИЦЕ ЗА ПРЕПОЗНАВАЊЕ СВРЉИШКО-ЗАПЛАЊСКОГ ДИЈАЛЕКТА
(према Јордана Марковић, „Говор Заплања", СДЗб XLVII, 2000)

Сврљишко-заплањски припада призренско-тимочкој области. Две зоне: Зона I (Горње Заплање, типично заплањско) и Зона II (Доње Заплање, јаче јужноморавске црте).

1) АКЦЕНАТ (прозодија) — најважније:
• Једноставан експираторни (динамички) акценат; НЕМА квантитативних ни квалитативних опозиција.
• НЕМА дужина — сви вокали су кратки (изузетак: контракције, нпр. дóде < дођеде, сáт < заједан сат).
• Акценат може стајати на БИЛО КОМ слогу, укључујући ултиму: онá, онò, они, оне (стд. òна, òни).
• Стд. узлазни → померен за један слог ка крају (стд. вода̀ → зап. водá); стд. силазни → на истом слогу.
• Проклитике преузимају акценат: нàреку; енклитике могу постати носиоци акцента (штатије, дàли осетиш).
• Уз бројеве акценат се помера ка почетку именице: чéтири кáнте, шéс недéље.
• У синтагмама с личним именима прва именица губи акценат: чика Вéлко, баба Вáска, поп Крста.

2) ВОКАЛИ:
• Полугласник ъ/ь ЖИВ и чест (дън, бъш, свъг, тръг, кœд, жœлац); не стоји на апсолутном почетку/крају; може бити под акцентом.
• Јат → e доследно (најдоследнија екавица): неје/несам/несмо (није/нисам/нисмо), куде (где), овдека (овде), зиме/лете (зими/лети), стареј/малеј (старији/млађи), живел/живела.
• Вокално л → у, ОСИМ иза с, д, к у Зони I: Зона I сланце/сленце, слаза, слаба; Зона II слунце, слузе, слуба.
• Вокалске контракције: -ао- → -а-/-о- (навам, дошо); -оо- → -о- (поноси).

3) КОНСОНАНТИ:
• Х редовно испада или замењује: хлеб → леб, хтети → тела/тео, сиромах → сирома.
• Финално -л у радном придеву ЧУВА СЕ: радел/радил, отишњл/отишел, умрел (за разлику од тимочког где је рада/отишња/умра — то НИЈЕ заплањско).
• Сонант ј: иницијално ј испада испред е (једен → еден); метатеза зј: грозје → гројзе, лозје → лојзе.
• Јотовање групе јд: Зона I НЕ јотује (пројдем, дојдем); Зона II јотује (пађем, дађем).

4) МОРФОЛОГИЈА:
• Аналитичка деклинација: општи падеж (= акузатив) замењује све зависне падеже уз предлоге; посесив се гради предлогом од: „кућа од мој комшија".
• Стари датив очуван за жива бића („даде брату").
• Множина именица: -и/-ови/-еви (мужи, путови/путеви); ср. род: пилићи, сирочићи, унучики (Зона II), момчета, пилетија.
• Партикуле -зи/-зе (Зона II): овизи, тизе, онизи.
• ОП облик „њума" за 3. л. јд. м. — само Зона II (видо њума).
• ИНФИНИТИВ НЕ ПОСТОЈИ — замена конструкцијом „да + презент" (оћу да видим, не могу да работим).
• Аорист продуктиван, 1. мн. на -(х)мо: идомо, рекомо, дојдомо, отидомо.
• Имперфекат жив, 3. мн. Зона II на -ав/-ив: идешев, вечерав.
• Компаратив аналитички: по- + позитив (побоје, помало, поголемо); суперлатив нај- (најбоје, најстар).

5) СИНТАКСА:
• Постпозитивни члан: децата, човекът/човеко, женете, кућата (типична заплањска црта, види пример „Децата сва у школу").
• Удвајање предлога: „из от Ниш", „крез кроз поље".
• Поређење: ко (< као): „бели ко снег".

6) КАРАКТЕРИСТИЧНА ЛЕКСИКА:
вреви/вревимо (говори), поје (пева), работи (ради), кво/квó (шта), дека (да, везник), тике (тек), туј/тујка (ту), бљш (баш), одма (одмах), прикај (преко пута — Зона I), млого/гоџа (много), голем (велик).

7) РАЗЛИКА ОД СУСЕДНИХ ПТ ГОВОРА:
• Тимочко-лужнички: губи финално -л у радном придеву (рада, отишња, умра) → ако видиш ове облике, НИЈЕ сврљишко-заплањски.
• Призренско-јужноморавски: типично нема тако жив полугласник ъ и ређе чува стари датив; има слабију постпозицију члана.
• Ако говор има: жив полугласник + очувано финално -л у радном придеву + постпозитивни члан + доследну екавицу + аналитичку деклинацију → врло вероватно svrljisko_zaplanjski.

Пример (Зона I): „Идем кућу. Оћу да видим кво е мој брат работел јуче. Он е отишњл у град и купел леб и малко воду. Децата сва у школу."
Пример (Зона II): „…мој брат работаја јуче. Он е отишња у град…"

У пољу reasoning наведи КОНКРЕТНЕ индикаторе које си пронашао (акценат на ултими, полугласник, -л у прид., постпоз. члан, аналитички падеж, лексика ко „вреви/работи/кво/дека") и, ако је могуће, процени зону (I или II).`;

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
