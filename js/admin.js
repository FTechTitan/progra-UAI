// ============================================================================
//  admin.js — Menú de superadmin (frontend)
//  Solo se muestra si el usuario logueado tiene rol "admin" (verificado contra
//  el servidor). Toda la data viene de la Edge Function `admin`, que re-verifica
//  el rol server-side. El frontend nunca toca la service_role.
// ============================================================================

(function () {
  "use strict";

  const sb = window.Auth.cliente;
  let esAdmin = false;
  let titulosEjercicios = {}; // id -> título legible

  // Mapa id->título desde el currículo, para mostrar nombres lindos.
  function indexarTitulos() {
    (window.CURRICULUM || []).forEach((m) =>
      (m.ejercicios || []).forEach((e) => (titulosEjercicios[e.id] = e.titulo))
    );
  }

  // Llama a la Edge Function admin.
  async function llamar(action, extra) {
    const { data, error } = await sb.functions.invoke("admin", {
      body: { action, ...(extra || {}) },
    });
    if (error) {
      let msg = "Error en el panel admin.";
      try { const c = await error.context?.json?.(); if (c?.error) msg = c.error; } catch (_) {}
      throw new Error(msg);
    }
    return data;
  }

  // --- Detección de rol (consulta fresca al servidor) ----------------------
  async function chequearAdmin() {
    try {
      const { data } = await sb.auth.getUser();
      const rol = data?.user?.app_metadata?.role;
      esAdmin = rol === "admin";
    } catch {
      esAdmin = false;
    }
    pintarBoton();
  }

  function pintarBoton() {
    let btn = document.getElementById("btnAdmin");
    if (esAdmin && !btn) {
      btn = document.createElement("button");
      btn.id = "btnAdmin";
      btn.className = "btn-admin";
      btn.textContent = "🛠 Admin";
      btn.addEventListener("click", abrirPanel);
      const area = document.getElementById("authArea");
      area.parentNode.insertBefore(btn, area);
    } else if (!esAdmin && btn) {
      btn.remove();
    }
  }

  // --- Render del panel ----------------------------------------------------
  function fmtFecha(iso) {
    if (!iso) return "—";
    return iso.slice(0, 10);
  }

  function abrirPanel() {
    let ov = document.getElementById("adminOverlay");
    if (!ov) {
      ov = document.createElement("div");
      ov.id = "adminOverlay";
      ov.className = "admin-overlay";
      ov.innerHTML = `
        <div class="admin-top">
          <h2>🛠 Panel de superadmin</h2>
          <div>
            <button class="btn-row" id="adminRefresh">↻ Actualizar</button>
            <button class="btn btn-ghost btn-sm" id="adminCerrar">✕ Cerrar</button>
          </div>
        </div>
        <div class="admin-body" id="adminBody">
          <div class="admin-loading">Cargando…</div>
        </div>`;
      document.body.appendChild(ov);
      document.getElementById("adminCerrar").addEventListener("click", () => ov.remove());
      document.getElementById("adminRefresh").addEventListener("click", cargarOverview);
    }
    cargarOverview();
  }

  async function cargarOverview() {
    const body = document.getElementById("adminBody");
    body.innerHTML = '<div class="admin-loading">Cargando datos…</div>';
    let data;
    try {
      data = await llamar("overview");
    } catch (e) {
      body.innerHTML = `<div class="admin-loading">⚠️ ${e.message}</div>`;
      return;
    }

    const t = data.totales || {};
    const usuarios = data.usuarios || [];
    const porEj = data.por_ejercicio || {};
    const maxEj = Math.max(1, ...Object.values(porEj));

    // Barras por ejercicio (ordenadas por cantidad desc).
    const barras = Object.entries(porEj)
      .sort((a, b) => b[1] - a[1])
      .map(([id, n]) => `
        <div class="ex-bar-row">
          <span>${titulosEjercicios[id] || id}</span>
          <span class="ex-bar-track"><span class="ex-bar-fill" style="width:${(n / maxEj) * 100}%"></span></span>
          <span>${n}</span>
        </div>`).join("") || '<p class="admin-loading">Nadie completó ejercicios todavía.</p>';

    // Filas de usuarios.
    const filas = usuarios
      .sort((a, b) => (b.completados || 0) - (a.completados || 0))
      .map((u) => `
        <tr>
          <td>${u.email || "—"} ${u.es_admin ? '<span class="tag-admin">admin</span>' : ""}</td>
          <td>${u.completados || 0}</td>
          <td>${u.preguntas || 0}</td>
          <td>${fmtFecha(u.ultima_actividad)}</td>
          <td>${fmtFecha(u.creado)}</td>
          <td class="acciones">
            <button class="btn-row" data-ver="${u.id}">Ver</button>
            <button class="btn-row danger" data-reset="${u.id}" data-email="${u.email}">Reset</button>
            <button class="btn-row danger" data-del="${u.id}" data-email="${u.email}">Borrar</button>
          </td>
        </tr>`).join("");

    body.innerHTML = `
      <div class="admin-cards">
        <div class="admin-card"><div class="num">${t.alumnos ?? 0}</div><div class="lbl">Alumnos registrados</div></div>
        <div class="admin-card"><div class="num">${t.ejercicios_completados ?? 0}</div><div class="lbl">Ejercicios completados (total)</div></div>
        <div class="admin-card"><div class="num">${t.preguntas ?? 0}</div><div class="lbl">Preguntas al tutor 🤖</div></div>
      </div>

      <div class="admin-section-title">Completados por ejercicio</div>
      <div class="ex-bars">${barras}</div>

      <div class="admin-section-title">Alumnos</div>
      <table class="admin-table">
        <thead><tr><th>Email</th><th>Completados</th><th>Preguntas 🤖</th><th>Última actividad</th><th>Registro</th><th>Acciones</th></tr></thead>
        <tbody>${filas || '<tr><td colspan="6" class="admin-loading">Sin alumnos.</td></tr>'}</tbody>
      </table>

      <div id="adminDetalle"></div>`;

    // Listeners de las acciones.
    body.querySelectorAll("[data-ver]").forEach((b) =>
      b.addEventListener("click", () => verDetalle(b.getAttribute("data-ver"))));
    body.querySelectorAll("[data-reset]").forEach((b) =>
      b.addEventListener("click", () => resetUsuario(b.getAttribute("data-reset"), b.getAttribute("data-email"))));
    body.querySelectorAll("[data-del]").forEach((b) =>
      b.addEventListener("click", () => borrarUsuario(b.getAttribute("data-del"), b.getAttribute("data-email"))));
  }

  function escapar(s) {
    return (s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  async function verDetalle(userId) {
    const cont = document.getElementById("adminDetalle");
    cont.innerHTML = '<div class="admin-detail admin-loading">Cargando detalle…</div>';
    let data;
    try {
      data = await llamar("user_detail", { user_id: userId });
    } catch (e) {
      cont.innerHTML = `<div class="admin-detail admin-loading">⚠️ ${e.message}</div>`;
      return;
    }
    const prog = data.progreso || [];
    const preguntas = data.preguntas || [];

    const items = prog.map((r) => `
      <details class="detail-ex">
        <summary>${r.completed ? "✅" : "⏳"} ${titulosEjercicios[r.exercise_id] || r.exercise_id}
          <span class="dim" style="margin-left:auto;color:var(--text-dim)">${fmtFecha(r.updated_at)}</span></summary>
        <pre>${escapar(r.code) || "(sin código)"}</pre>
      </details>`).join("") || '<p class="admin-loading">Este alumno todavía no tiene progreso.</p>';

    const preguntasHtml = preguntas.map((q) => `
      <details class="detail-ex">
        <summary>❓ ${escapar(q.question).slice(0, 90)}${q.question.length > 90 ? "…" : ""}
          <span class="dim" style="margin-left:auto;color:var(--text-dim)">${q.exercise_id ? (titulosEjercicios[q.exercise_id] || q.exercise_id) + " · " : ""}${fmtFecha(q.created_at)}</span></summary>
        <pre style="white-space:pre-wrap"><b>Pregunta:</b> ${escapar(q.question)}\n\n<b>Respuesta del tutor:</b> ${escapar(q.answer) || "—"}</pre>
      </details>`).join("") || '<p class="admin-loading">Este alumno no le hizo preguntas al tutor.</p>';

    cont.innerHTML = `<div class="admin-detail">
      <div class="admin-section-title" style="margin-top:0">Progreso y código</div>
      ${items}
      <div class="admin-section-title">Preguntas al tutor 🤖 (${preguntas.length})</div>
      ${preguntasHtml}
    </div>`;
    cont.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function resetUsuario(userId, email) {
    if (!confirm(`¿Borrar TODO el progreso de ${email}? El usuario sigue existiendo pero empieza de cero.`)) return;
    try {
      await llamar("reset_user", { user_id: userId });
      cargarOverview();
    } catch (e) { alert(e.message); }
  }

  async function borrarUsuario(userId, email) {
    if (!confirm(`¿Eliminar la cuenta de ${email} por completo? Esta acción no se puede deshacer.`)) return;
    try {
      await llamar("delete_user", { user_id: userId });
      cargarOverview();
    } catch (e) { alert(e.message); }
  }

  // --- Init ----------------------------------------------------------------
  function init() {
    indexarTitulos();
    chequearAdmin();
    if (window.AuthUI) window.AuthUI.onUsuario(() => chequearAdmin());
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
