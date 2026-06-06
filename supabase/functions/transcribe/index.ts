// ============================================================================
//  transcribe — Transcribe audio del alumno a texto (proxy a OpenAI Whisper)
//  El alumno graba un audio en el chat; acá se convierte a texto y el frontend
//  lo manda como pregunta al tutor. Requiere sesión (verify_jwt = true) para no
//  quemar créditos con anónimos. La OPENAI_API_KEY vive como secreto en Supabase.
// ============================================================================

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
const MODEL = "whisper-1";
const MAX_BYTES = 20 * 1024 * 1024; // 20 MB (Whisper admite hasta 25)

const ALLOWED_ORIGINS = [
  "https://progra-uai.pages.dev",
  "https://progra-uai.techforce.cl",
  "http://127.0.0.1:8000",
  "http://localhost:8000",
];

function corsHeaders(origin: string | null): Record<string, string> {
  const allow = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin");
  const cors = corsHeaders(origin);

  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Método no permitido" }), {
      status: 405,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
  if (!OPENAI_API_KEY) {
    return new Response(JSON.stringify({ error: "Falta configurar OPENAI_API_KEY" }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return new Response(JSON.stringify({ error: "No se recibió audio" }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }
    if (file.size === 0) {
      return new Response(JSON.stringify({ error: "El audio está vacío" }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }
    if (file.size > MAX_BYTES) {
      return new Response(JSON.stringify({ error: "El audio es muy largo. Probá uno más corto." }), {
        status: 413,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // Reenvía el audio a OpenAI Whisper.
    const oa = new FormData();
    oa.append("file", file, file.name || "audio.webm");
    oa.append("model", MODEL);
    oa.append("language", "es");

    const resp = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${OPENAI_API_KEY}` },
      body: oa,
    });

    if (!resp.ok) {
      const errText = await resp.text();
      console.error("OpenAI transcribe error:", resp.status, errText);
      const amistoso = resp.status === 429
        ? "El transcriptor está saturado o sin créditos. Probá más tarde."
        : "No se pudo transcribir el audio. Probá de nuevo.";
      return new Response(JSON.stringify({ error: amistoso }), {
        status: 502,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const data = await resp.json();
    const text = (data.text || "").toString().trim();

    return new Response(JSON.stringify({ text }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("transcribe error:", e);
    return new Response(JSON.stringify({ error: "Error procesando el audio" }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
