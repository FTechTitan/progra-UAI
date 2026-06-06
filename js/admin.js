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
  let modulosInfo = [];       // [{ id, titulo, emoji, ids:[...] }]
  let totalEjercicios = 0;    // total de ejercicios del curso

  // Mapa id->título y estructura de módulos desde el currículo.
  function indexarTitulos() {
    modulosInfo = [];
    totalEjercicios = 0;
    (window.CURRICULUM || []).forEach((m) => {
      const ids = (m.ejercicios || []).map((e) => {
        titulosEjercicios[e.id] = e.titulo;
        return e.id;
      });
      totalEjercicios += ids.length;
      modulosInfo.push({ id: m.id, titulo: m.titulo, emoji: m.emoji || "📦", ids });
    });
  }

  // Cuántos módulos tiene 100% completo este alumno (todos sus ejercicios).
  function modulosCompletos(completadosIds) {
    const hechos = new Set(completadosIds || []);
    let n = 0;
    modulosInfo.forEach((m) => {
      if (m.ids.length && m.ids.every((id) => hechos.has(id))) n++;
    });
    return n;
  }

  // Formatea segundos como "Xh Ym" / "Ym" / "—".
  function fmtDuracion(seg) {
    seg = Math.round(Number(seg) || 0);
    if (seg <= 0) return '<span style="color:var(--text-dim)">—</span>';
    const h = Math.floor(seg / 3600);
    const m = Math.round((seg % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m`;
    return `${seg}s`;
  }

  // Barra de % de avance (completados / total del curso).
  function avanceCell(u) {
    const hechos = (u.completados_ids || []).length || u.completados || 0;
    const pct = totalEjercicios ? Math.round((hechos / totalEjercicios) * 100) : 0;
    const color = pct >= 100 ? "var(--green)" : pct >= 50 ? "var(--accent, #4a9)" : "var(--text)";
    return `<div class="avance-cell">
      <span class="avance-track"><span class="avance-fill" style="width:${pct}%;background:${color}"></span></span>
      <span class="avance-num">${pct}% <span style="color:var(--text-dim)">(${hechos}/${totalEjercicios})</span></span>
    </div>`;
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

  // Celda de nota: muestra la última, con color según aprobado, y mejor/intentos.
  function notaCell(u) {
    if (u.nota_ultima == null) return '<span class="dim" style="color:var(--text-dim)">—</span>';
    const n = Number(u.nota_ultima);
    const color = n >= 4 ? "var(--green)" : "var(--red)";
    const extra = u.intentos_prueba > 1 ? ` <span class="dim" style="color:var(--text-dim);font-size:11px">(mejor ${Number(u.nota_mejor).toFixed(1)}, ${u.intentos_prueba} int.)</span>` : "";
    return `<b style="color:${color}">${n.toFixed(1)}</b>${extra}`;
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

    // Filas de usuarios (ordenadas por % de avance desc).
    const filas = usuarios
      .sort((a, b) => ((b.completados_ids || []).length || b.completados || 0) - ((a.completados_ids || []).length || a.completados || 0))
      .map((u) => `
        <tr>
          <td>${u.email || "—"} ${u.es_admin ? '<span class="tag-admin">admin</span>' : ""}</td>
          <td>${avanceCell(u)}</td>
          <td>${modulosCompletos(u.completados_ids)}/${modulosInfo.length}</td>
          <td>${fmtDuracion(u.segundos)}</td>
          <td>${u.preguntas || 0}</td>
          <td>${notaCell(u)}</td>
          <td>${fmtFecha(u.ultima_actividad)}</td>
          <td class="acciones">
            <button class="btn-row" data-ver="${u.id}">Ver</button>
            <button class="btn-row danger" data-reset="${u.id}" data-email="${u.email}">Reset</button>
            <button class="btn-row danger" data-del="${u.id}" data-email="${u.email}">Borrar</button>
          </td>
        </tr>`).join("");

    // Avance promedio del curso entre los alumnos (no admins).
    const alumnosReales = usuarios.filter((u) => !u.es_admin);
    const avancePromedio = alumnosReales.length && totalEjercicios
      ? Math.round(
          (alumnosReales.reduce((a, u) => a + ((u.completados_ids || []).length || u.completados || 0), 0) /
            (alumnosReales.length * totalEjercicios)) * 100
        )
      : 0;
    const segundosTotales = usuarios.reduce((a, u) => a + (u.segundos || 0), 0);

    body.innerHTML = `
      <div class="admin-cards">
        <div class="admin-card"><div class="num">${t.alumnos ?? 0}</div><div class="lbl">Alumnos registrados</div></div>
        <div class="admin-card"><div class="num">${avancePromedio}%</div><div class="lbl">Avance promedio del curso 📈</div></div>
        <div class="admin-card"><div class="num">${fmtDuracion(segundosTotales)}</div><div class="lbl">Tiempo total dedicado ⏱</div></div>
        <div class="admin-card"><div class="num">${t.preguntas ?? 0}</div><div class="lbl">Preguntas al tutor 🤖</div></div>
        <div class="admin-card"><div class="num">${t.promedio_notas != null ? t.promedio_notas.toFixed(1) : "—"}</div><div class="lbl">Nota predicha promedio 📝</div></div>
      </div>

      <div class="admin-section-title">Completados por ejercicio</div>
      <div class="ex-bars">${barras}</div>

      <div class="admin-section-title">Alumnos</div>
      <table class="admin-table">
        <thead><tr><th>Email</th><th>Avance</th><th>Módulos</th><th>Tiempo ⏱</th><th>Preguntas 🤖</th><th>Nota predicha 📝</th><th>Última actividad</th><th>Acciones</th></tr></thead>
        <tbody>${filas || '<tr><td colspan="8" class="admin-loading">Sin alumnos.</td></tr>'}</tbody>
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
    const examenes = data.examenes || [];

    // Mapas auxiliares: tiempo y completado por ejercicio.
    const tiempoPorEj = {};
    const completadoPorEj = {};
    prog.forEach((r) => {
      tiempoPorEj[r.exercise_id] = r.time_spent_seconds || 0;
      completadoPorEj[r.exercise_id] = !!r.completed;
    });
    const completadosIds = prog.filter((r) => r.completed).map((r) => r.exercise_id);
    const tiempoTotal = prog.reduce((a, r) => a + (r.time_spent_seconds || 0), 0);
    const pctAvance = totalEjercicios ? Math.round((completadosIds.length / totalEjercicios) * 100) : 0;

    // Resumen arriba del todo.
    const resumenHtml = `
      <div class="admin-cards" style="margin-bottom:14px">
        <div class="admin-card"><div class="num">${pctAvance}%</div><div class="lbl">Avance (${completadosIds.length}/${totalEjercicios})</div></div>
        <div class="admin-card"><div class="num">${modulosCompletos(completadosIds)}/${modulosInfo.length}</div><div class="lbl">Módulos completos</div></div>
        <div class="admin-card"><div class="num">${fmtDuracion(tiempoTotal)}</div><div class="lbl">Tiempo dedicado ⏱</div></div>
      </div>`;

    // Desglose por módulo: hechos/total y tiempo del módulo.
    const modulosHtml = modulosInfo.map((m) => {
      const hechos = m.ids.filter((id) => completadoPorEj[id]).length;
      const seg = m.ids.reduce((a, id) => a + (tiempoPorEj[id] || 0), 0);
      const pct = m.ids.length ? Math.round((hechos / m.ids.length) * 100) : 0;
      const color = pct >= 100 ? "var(--green)" : pct >= 50 ? "var(--accent, #4a9)" : "var(--text)";
      return `<div class="ex-bar-row">
        <span>${m.emoji} ${m.titulo}</span>
        <span class="ex-bar-track"><span class="ex-bar-fill" style="width:${pct}%;background:${color}"></span></span>
        <span>${hechos}/${m.ids.length} · ${fmtDuracion(seg)}</span>
      </div>`;
    }).join("");

    const items = prog.map((r) => `
      <details class="detail-ex">
        <summary>${r.completed ? "✅" : "⏳"} ${titulosEjercicios[r.exercise_id] || r.exercise_id}
          <span class="dim" style="margin-left:auto;color:var(--text-dim)">⏱ ${fmtDuracion(r.time_spent_seconds)} · ${fmtFecha(r.updated_at)}</span></summary>
        <pre>${escapar(r.code) || "(sin código)"}</pre>
      </details>`).join("") || '<p class="admin-loading">Este alumno todavía no tiene progreso.</p>';

    const preguntasHtml = preguntas.map((q) => `
      <details class="detail-ex">
        <summary>❓ ${escapar(q.question).slice(0, 90)}${q.question.length > 90 ? "…" : ""}
          <span class="dim" style="margin-left:auto;color:var(--text-dim)">${q.exercise_id ? (titulosEjercicios[q.exercise_id] || q.exercise_id) + " · " : ""}${fmtFecha(q.created_at)}</span></summary>
        <pre style="white-space:pre-wrap"><b>Pregunta:</b> ${escapar(q.question)}\n\n<b>Respuesta del tutor:</b> ${escapar(q.answer) || "—"}</pre>
      </details>`).join("") || '<p class="admin-loading">Este alumno no le hizo preguntas al tutor.</p>';

    const examenesHtml = examenes.map((e) => {
      const n = Number(e.nota);
      const color = n >= 4 ? "var(--green)" : "var(--red)";
      const det = (e.detalle || []).map((d) =>
        `${d.tema}: ${d.ganados}/${d.puntos} (${d.casos})`).join(" · ");
      return `<details class="detail-ex">
        <summary>📝 ${e.exam_id} v${e.version} — <b style="color:${color}">nota ${n.toFixed(1)}</b>
          <span class="dim" style="margin-left:auto;color:var(--text-dim)">logro ${Number(e.logro).toFixed(0)}% · ${fmtFecha(e.created_at)}</span></summary>
        <pre style="white-space:pre-wrap">${escapar(det) || "(sin detalle)"}</pre>
      </details>`;
    }).join("") || '<p class="admin-loading">Todavía no rindió ninguna prueba.</p>';

    cont.innerHTML = `<div class="admin-detail">
      ${resumenHtml}
      <div class="admin-section-title" style="margin-top:0">Avance por módulo</div>
      <div class="ex-bars">${modulosHtml}</div>
      <div class="admin-section-title">Pruebas rendidas 📝 (${examenes.length})</div>
      ${examenesHtml}
      <div class="admin-section-title">Progreso y código</div>
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
