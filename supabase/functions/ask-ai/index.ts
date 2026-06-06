// ============================================================================
//  ask-ai — Tutor de Python para principiantes (proxy a OpenAI)
//  La OPENAI_API_KEY vive como secreto en Supabase; el frontend nunca la ve.
//  Requiere sesión iniciada (verify_jwt = true) para evitar abuso de créditos.
// ============================================================================

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
const MODEL = "gpt-4o-mini";

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

const SYSTEM_PROMPT = `Eres un tutor de programación Python para estudiantes principiantes del curso de la UAI (en español, tono cercano y motivador, tuteo rioplatense suave).

Tu objetivo es que el alumno APRENDA, no resolverle todo. Reglas:
- Explicá conceptos con ejemplos simples y cortos.
- Si te piden ayuda con un ejercicio, dá PISTAS y guía paso a paso. NO entregues la solución completa de una; primero orientá. Solo mostrá código completo si el alumno lo pide explícitamente o si ya intentó y sigue trabado.
- Cuando muestres código, usá bloques markdown con \`\`\`python.
- Si el alumno comparte su código con un error, señalá DÓNDE está el problema y por qué, y dejá que lo corrija.
- Respuestas breves y claras (máximo ~150 palabras salvo que pidan más detalle).
- Si preguntan algo no relacionado con programar/Python, redirigí amablemente al tema del curso.`;

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin");
  const cors = corsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: cors });
  }
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
    const body = await req.json();
    const pregunta: string = (body.question || "").toString().slice(0, 4000);
    const contexto = body.context || {};
    const historial = Array.isArray(body.history) ? body.history.slice(-6) : [];

    if (!pregunta.trim()) {
      return new Response(JSON.stringify({ error: "Pregunta vacía" }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // Arma el contexto del ejercicio actual (si lo hay) para una mejor ayuda.
    let contextoTexto = "";
    if (contexto.titulo) {
      contextoTexto =
        `\n\n[Contexto del ejercicio actual del alumno]\n` +
        `Título: ${contexto.titulo}\n` +
        (contexto.enunciado ? `Enunciado: ${String(contexto.enunciado).slice(0, 1200)}\n` : "") +
        (contexto.codigo ? `Código que escribió hasta ahora:\n${String(contexto.codigo).slice(0, 2000)}\n` : "");
    }

    const messages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...historial.map((m: { role: string; content: string }) => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: String(m.content).slice(0, 2000),
      })),
      { role: "user", content: pregunta + contextoTexto },
    ];

    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ model: MODEL, messages, max_tokens: 500, temperature: 0.4 }),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      const amistoso = resp.status === 429
        ? "El asistente está sin créditos o saturado por ahora. Probá más tarde."
        : "El asistente tuvo un problema. Probá de nuevo.";
      console.error("OpenAI error:", resp.status, errText);
      return new Response(JSON.stringify({ error: amistoso }), {
        status: 502,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const data = await resp.json();
    const answer = data.choices?.[0]?.message?.content ?? "(sin respuesta)";

    return new Response(JSON.stringify({ answer }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ask-ai error:", e);
    return new Response(JSON.stringify({ error: "Error procesando la solicitud" }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
