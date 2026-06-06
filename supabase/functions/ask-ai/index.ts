// ============================================================================
//  ask-ai — Tutor de Python para principiantes (proxy a OpenAI)
//  La OPENAI_API_KEY vive como secreto en Supabase; el frontend nunca la ve.
//  Requiere sesión iniciada (verify_jwt = true) para evitar abuso de créditos.
// ============================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const MODEL = "gpt-4o-mini";

// Registra la pregunta/respuesta del alumno (no rompe el chat si falla).
async function registrarPregunta(
  authHeader: string,
  exerciseId: string | null,
  question: string,
  answer: string,
) {
  try {
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data } = await userClient.auth.getUser();
    const uid = data?.user?.id;
    if (!uid) return;
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    await admin.from("ai_questions").insert({
      user_id: uid,
      exercise_id: exerciseId,
      question: question.slice(0, 4000),
      answer: (answer || "").slice(0, 4000),
    });
  } catch (e) {
    console.error("No se pudo registrar la pregunta:", e);
  }
}

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

══════════════════════════════════════════════════════════════════
LÍMITE DE CONTENIDO — CRÍTICO: enseñá SOLO la materia vista en clases
══════════════════════════════════════════════════════════════════
Este curso solo cubrió estos temas. NO enseñes, sugieras ni uses NADA fuera de esta lista, aunque exista en Python y sea "mejor":

TEMAS VISTOS:
1. Variables y entrada/salida: input(), print(), int(), float(), str().
2. Condicionales: if / elif / else; comparadores == != < > <= >=; operadores lógicos and, or, not.
3. Ciclos: while; for con range(inicio, fin, paso); el operador módulo %.
4. Ciclos anidados: un for dentro de otro; print(..., end="") y print("") para armar patrones.
5. Listas (1D): crear [], indexar (incluido índice negativo), len(), .append(), .count(), recorrer con for, sum(), slicing como texto[::-1].
6. Matrices (listas 2D): M[i][j], len(M) filas y len(M[i]) columnas, recorrido con ciclos dobles.
Funciones built-in permitidas: print, input, int, float, str, len, range, sum, round, abs, sorted, .sort(), .append(), .count(). Módulos: solo import random e import math si el alumno los necesita (se mencionaron con matrices).

NO ESTÁ VISTO (si lo preguntan, explicá con amabilidad que "eso todavía no lo vimos en el curso" y reorientá a cómo resolverlo con lo que SÍ se vio): definir funciones propias con def, diccionarios, tuplas, conjuntos (set), f-strings, list comprehensions, lambda, map/filter, clases y objetos, try/except, manejo de archivos, recursión, numpy/pandas u otras librerías externas.

ESTILO DE LA CLASE (respetalo siempre en tus ejemplos):
- Mostrá texto con print usando comas, p. ej. print("Suma:", total) — NO uses f-strings.
- Usá ciclos for/while explícitos — NO uses comprehensions.
- Mantené el código simple y parecido al de las guías.

Si preguntan algo no relacionado con programar/Python, redirigí amablemente al tema del curso.`;

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

    // Guarda la pregunta para que el profe vea quién necesita ayuda.
    const authHeader = req.headers.get("Authorization") || "";
    await registrarPregunta(authHeader, contexto.id || null, pregunta, answer);

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
