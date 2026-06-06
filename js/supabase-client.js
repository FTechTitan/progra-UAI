// ============================================================================
//  supabase-client.js — Cliente Supabase + auth + sincronización de progreso
//
//  La PUBLISHABLE KEY es pública por diseño: va en el frontend y está protegida
//  por Row Level Security (cada usuario solo accede a sus propias filas). NO es
//  un secreto — no confundir con la service_role/secret key, que jamás va acá.
// ============================================================================

const SUPABASE_URL = "https://bipsvhxsvfzfwzufucfg.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_nsfpKRfcdisP31bYOAumeg_DimCZ5tC";

// `supabase` es el global que expone el UMD de @supabase/supabase-js (CDN).
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true },
});

// ---------------------------------------------------------------------------
//  Auth
// ---------------------------------------------------------------------------
const Auth = {
  cliente: sb,

  async usuarioActual() {
    const { data } = await sb.auth.getUser();
    return data?.user || null;
  },

  async registrar(email, password) {
    const { data, error } = await sb.auth.signUp({ email, password });
    if (error) throw error;
    // Con auto-confirm activado, signUp ya deja sesión iniciada.
    return data.user;
  },

  async entrar(email, password) {
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data.user;
  },

  async salir() {
    await sb.auth.signOut();
  },

  // Notifica cambios de sesión (login / logout / refresh).
  onCambio(callback) {
    sb.auth.onAuthStateChange((_event, session) => callback(session?.user || null));
  },
};

// ---------------------------------------------------------------------------
//  Progreso remoto (tabla public.progress)
// ---------------------------------------------------------------------------
const ProgresoRemoto = {
  // Trae todo el progreso del usuario logueado.
  // Devuelve { completados: {id:true}, codigo: {id:"..."} }.
  async cargar() {
    const { data, error } = await sb.from("progress").select("exercise_id, completed, code");
    if (error) throw error;
    const completados = {};
    const codigo = {};
    (data || []).forEach((row) => {
      if (row.completed) completados[row.exercise_id] = true;
      if (row.code != null) codigo[row.exercise_id] = row.code;
    });
    return { completados, codigo };
  },

  // Guarda (upsert) una fila de progreso de un ejercicio.
  async guardar(userId, exerciseId, { completed, code }) {
    const fila = { user_id: userId, exercise_id: exerciseId };
    if (completed !== undefined) fila.completed = completed;
    if (code !== undefined) fila.code = code;
    const { error } = await sb.from("progress").upsert(fila, { onConflict: "user_id,exercise_id" });
    if (error) throw error;
  },

  // Suma segundos de tiempo activo al ejercicio (vía RPC; el server usa auth.uid()).
  async sumarTiempo(exerciseId, segundos) {
    const { error } = await sb.rpc("add_time_spent", {
      p_exercise_id: exerciseId,
      p_seconds: Math.round(segundos),
    });
    if (error) throw error;
  },
};

window.Auth = Auth;
window.ProgresoRemoto = ProgresoRemoto;
