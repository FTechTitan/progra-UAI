// ============================================================================
//  admin — Panel de superadmin (acceso total, server-side)
//  Usa la service_role (inyectada por Supabase, jamás llega al frontend) para
//  leer todo, PERO primero verifica que quien llama sea admin
//  (app_metadata.role === "admin"). Un alumno normal recibe 403.
// ============================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const ALLOWED_ORIGINS = [
  "https://progra-uai.pages.dev",
  "https://progra-uai.techforce.cl",
  "http://127.0.0.1:8000",
  "http://localhost:8000",
];

function cors(origin: string | null): Record<string, string> {
  const allow = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

function json(body: unknown, status: number, headers: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  const headers = cors(req.headers.get("origin"));
  if (req.method === "OPTIONS") return new Response("ok", { headers });
  if (req.method !== "POST") return json({ error: "Método no permitido" }, 405, headers);

  // --- 1) Identifica al que llama con su propio JWT -----------------------
  const authHeader = req.headers.get("Authorization") || "";
  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userErr } = await userClient.auth.getUser();
  const caller = userData?.user;
  if (userErr || !caller) return json({ error: "No autenticado" }, 401, headers);

  // --- 2) Verifica que sea admin (app_metadata, no user_metadata) ---------
  const rol = (caller.app_metadata as Record<string, unknown> | null)?.role;
  if (rol !== "admin") {
    return json({ error: "No autorizado: se requiere rol admin." }, 403, headers);
  }

  // --- 3) Cliente con service_role (bypassa RLS) --------------------------
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { /* sin body */ }
  const action = (body.action as string) || "overview";

  try {
    // ----------------------------------------------------------------------
    if (action === "overview") {
      // Todos los usuarios (paginado simple hasta 1000).
      const { data: lista, error: e1 } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
      if (e1) throw e1;
      const usuarios = lista.users.map((u) => ({
        id: u.id,
        email: u.email,
        creado: u.created_at,
        ultimo_login: u.last_sign_in_at,
        es_admin: (u.app_metadata as Record<string, unknown> | null)?.role === "admin",
      }));

      // Todo el progreso.
      const { data: prog, error: e2 } = await admin
        .from("progress")
        .select("user_id, exercise_id, completed, updated_at");
      if (e2) throw e2;

      // Conteo de preguntas al tutor por usuario.
      const { data: preguntas } = await admin
        .from("ai_questions")
        .select("user_id, created_at");
      const preguntasPorUsuario: Record<string, number> = {};
      (preguntas || []).forEach((q) => {
        preguntasPorUsuario[q.user_id] = (preguntasPorUsuario[q.user_id] || 0) + 1;
      });

      // Resultados de pruebas: última nota, mejor nota e intentos por usuario.
      const { data: examenes } = await admin
        .from("exam_results")
        .select("user_id, nota, created_at")
        .order("created_at", { ascending: false });
      const ultimaNota: Record<string, number> = {};
      const mejorNota: Record<string, number> = {};
      const intentos: Record<string, number> = {};
      (examenes || []).forEach((e) => {
        const n = Number(e.nota);
        if (ultimaNota[e.user_id] === undefined) ultimaNota[e.user_id] = n; // primero = más reciente
        mejorNota[e.user_id] = Math.max(mejorNota[e.user_id] ?? 0, n);
        intentos[e.user_id] = (intentos[e.user_id] || 0) + 1;
      });

      // Agregados por usuario y por ejercicio.
      const completadosPorUsuario: Record<string, number> = {};
      const ultimaActividad: Record<string, string> = {};
      const porEjercicio: Record<string, number> = {};
      (prog || []).forEach((r) => {
        if (r.completed) {
          completadosPorUsuario[r.user_id] = (completadosPorUsuario[r.user_id] || 0) + 1;
          porEjercicio[r.exercise_id] = (porEjercicio[r.exercise_id] || 0) + 1;
        }
        const prev = ultimaActividad[r.user_id];
        if (!prev || (r.updated_at && r.updated_at > prev)) ultimaActividad[r.user_id] = r.updated_at;
      });

      const usuariosEnriquecidos = usuarios.map((u) => ({
        ...u,
        completados: completadosPorUsuario[u.id] || 0,
        preguntas: preguntasPorUsuario[u.id] || 0,
        nota_ultima: ultimaNota[u.id] ?? null,
        nota_mejor: mejorNota[u.id] ?? null,
        intentos_prueba: intentos[u.id] || 0,
        ultima_actividad: ultimaActividad[u.id] || null,
      }));

      // Promedio de la última nota de cada alumno que rindió.
      const notas = Object.values(ultimaNota);
      const promedioNotas = notas.length
        ? Math.round((notas.reduce((a, b) => a + b, 0) / notas.length) * 10) / 10
        : null;

      return json({
        totales: {
          alumnos: usuarios.length,
          ejercicios_completados: (prog || []).filter((r) => r.completed).length,
          preguntas: (preguntas || []).length,
          pruebas_rendidas: (examenes || []).length,
          promedio_notas: promedioNotas,
        },
        usuarios: usuariosEnriquecidos,
        por_ejercicio: porEjercicio,
      }, 200, headers);
    }

    // ----------------------------------------------------------------------
    if (action === "user_detail") {
      const userId = body.user_id as string;
      if (!userId) return json({ error: "Falta user_id" }, 400, headers);
      const { data, error } = await admin
        .from("progress")
        .select("exercise_id, completed, code, updated_at")
        .eq("user_id", userId)
        .order("updated_at", { ascending: false });
      if (error) throw error;

      // Preguntas que hizo este alumno al tutor.
      const { data: preguntas } = await admin
        .from("ai_questions")
        .select("exercise_id, question, answer, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(200);

      // Resultados de pruebas de este alumno.
      const { data: examenes } = await admin
        .from("exam_results")
        .select("exam_id, version, logro, nota, detalle, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(50);

      return json({ progreso: data || [], preguntas: preguntas || [], examenes: examenes || [] }, 200, headers);
    }

    // ----------------------------------------------------------------------
    if (action === "reset_user") {
      const userId = body.user_id as string;
      if (!userId) return json({ error: "Falta user_id" }, 400, headers);
      const { error } = await admin.from("progress").delete().eq("user_id", userId);
      if (error) throw error;
      return json({ ok: true }, 200, headers);
    }

    // ----------------------------------------------------------------------
    if (action === "delete_user") {
      const userId = body.user_id as string;
      if (!userId) return json({ error: "Falta user_id" }, 400, headers);
      if (userId === caller.id) return json({ error: "No podés borrarte a vos mismo." }, 400, headers);
      const { error } = await admin.auth.admin.deleteUser(userId);
      if (error) throw error;
      return json({ ok: true }, 200, headers);
    }

    return json({ error: "Acción desconocida: " + action }, 400, headers);
  } catch (e) {
    console.error("admin error:", e);
    return json({ error: "Error en el panel admin: " + (e?.message || String(e)) }, 500, headers);
  }
});
