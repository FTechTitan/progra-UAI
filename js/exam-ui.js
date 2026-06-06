// ============================================================================
//  exam-ui.js — Modo prueba predictiva
//  - Botón "📝 Prueba" en la topbar.
//  - Se desbloquea solo al completar los módulos requeridos.
//  - Sin tutor, sin pistas, sin "Comprobar" por problema (solo Ejecutar para
//    autoprobarse, como en papel).
//  - Versión A/B/C al azar. Al entregar, corrige y predice la NOTA (1.0–7.0).
// ============================================================================

(function () {
  "use strict";

  const $ = (s) => document.querySelector(s);
  const sb = window.Auth.cliente;
  let editores = [];      // CodeMirror por problema
  let versionActual = null;
  let pruebaActual = null;
  let timerId = null;

  // --- ¿Qué módulos están completos? --------------------------------------
  function modulosCompletos() {
    const comp = (window.ProgresoApp && window.ProgresoApp.completados()) || {};
    const set = new Set();
    (window.CURRICULUM || []).forEach((m) => {
      const todos = m.ejercicios.every((e) => comp[e.id]);
      if (todos && m.ejercicios.length) set.add(m.id);
    });
    return set;
  }

  function tituloModulo(id) {
    const m = (window.CURRICULUM || []).find((x) => x.id === id);
    return m ? m.titulo : id;
  }

  // --- Botón en la topbar --------------------------------------------------
  function pintarBoton() {
    if (document.getElementById("btnPrueba")) return;
    const btn = document.createElement("button");
    btn.id = "btnPrueba";
    btn.className = "btn-prueba";
    btn.textContent = "📝 Prueba";
    btn.title = "Rendí una prueba predictiva";
    btn.addEventListener("click", abrirIntro);
    const area = document.getElementById("authArea");
    area.parentNode.insertBefore(btn, area);
  }

  // --- Modal de introducción / requisitos ---------------------------------
  async function abrirIntro() {
    const prueba = (window.PRUEBAS || [])[0];
    if (!prueba) return;

    const completos = modulosCompletos();
    const faltan = prueba.requiere.filter((m) => !completos.has(m));
    const user = await window.Auth.usuarioActual();

    // Última nota previa (si está logueado).
    let previa = "";
    if (user) {
      try {
        const { data } = await sb
          .from("exam_results")
          .select("nota, version, created_at")
          .eq("exam_id", prueba.id)
          .order("created_at", { ascending: false })
          .limit(1);
        if (data && data[0]) {
          previa = `<p class="prueba-previa">Tu último intento: <b>nota ${data[0].nota}</b> (versión ${data[0].version})</p>`;
        }
      } catch (_) {}
    }

    const reqHtml = prueba.requiere
      .map((m) => `<li>${completos.has(m) ? "✅" : "🔒"} ${tituloModulo(m)}</li>`)
      .join("");

    let cta, aviso = "";
    if (!user) {
      aviso = `<p class="prueba-aviso">🔑 Iniciá sesión para rendir y guardar tu nota.</p>`;
      cta = `<button class="btn btn-secondary btn-block" id="pruebaLogin">Iniciar sesión</button>`;
    } else if (faltan.length) {
      aviso = `<p class="prueba-aviso">Completá estos módulos para desbloquear la prueba.</p>`;
      cta = `<button class="btn btn-block" id="pruebaComenzar" disabled>🔒 Bloqueada</button>`;
    } else {
      cta = `<button class="btn btn-primary btn-block" id="pruebaComenzar">Comenzar prueba →</button>`;
    }

    let ov = document.getElementById("pruebaIntro");
    if (ov) ov.remove();
    ov = document.createElement("div");
    ov.id = "pruebaIntro";
    ov.className = "modal-overlay";
    ov.innerHTML = `
      <div class="modal">
        <button class="modal-close" id="pruebaIntroClose">✕</button>
        <h2>📝 ${prueba.titulo}</h2>
        <p class="modal-sub">${prueba.descripcion}</p>
        ${previa}
        <div class="prueba-reqs">
          <div class="prueba-reqs-title">Requisitos (módulos completos):</div>
          <ul>${reqHtml}</ul>
        </div>
        <ul class="prueba-rules">
          <li>⏱️ Tiempo sugerido: <b>${prueba.tiempoMin} min</b></li>
          <li>🚫 Sin tutor ni pistas (como la prueba real).</li>
          <li>🎲 Te toca una versión al azar (A, B o C).</li>
          <li>🎯 Al entregar, predecimos tu nota (1.0–7.0).</li>
        </ul>
        ${aviso}
        ${cta}
      </div>`;
    document.body.appendChild(ov);
    $("#pruebaIntroClose").addEventListener("click", () => ov.remove());
    ov.addEventListener("click", (e) => { if (e.target === ov) ov.remove(); });
    const bLogin = $("#pruebaLogin");
    if (bLogin) bLogin.addEventListener("click", () => { ov.remove(); window.AuthUI.abrir(); });
    const bGo = $("#pruebaComenzar");
    if (bGo && !bGo.disabled) bGo.addEventListener("click", () => { ov.remove(); comenzar(prueba); });
  }

  // --- Comenzar la prueba (versión al azar) -------------------------------
  function comenzar(prueba) {
    const versiones = Object.keys(prueba.versiones);
    versionActual = versiones[Math.floor(Math.random() * versiones.length)];
    pruebaActual = prueba;
    const problemas = prueba.versiones[versionActual];

    const ov = document.createElement("div");
    ov.id = "pruebaOverlay";
    ov.className = "exam-overlay";
    ov.innerHTML = `
      <div class="exam-top">
        <div>
          <h2>${prueba.titulo} · versión ${versionActual}</h2>
          <span class="exam-sub">Sin ayuda · ${problemas.length} problemas</span>
        </div>
        <div class="exam-top-right">
          <span class="exam-timer" id="examTimer">--:--</span>
          <button class="btn btn-primary" id="examEntregar">Entregar prueba</button>
        </div>
      </div>
      <div class="exam-body" id="examBody"></div>`;
    document.body.appendChild(ov);

    // Oculta el asistente de IA durante la prueba.
    const fab = document.getElementById("aiFab");
    if (fab) fab.style.display = "none";

    const body = $("#examBody");
    editores = [];
    problemas.forEach((p, i) => {
      const card = document.createElement("div");
      card.className = "exam-card";
      card.innerHTML = `
        <div class="exam-card-head">
          <span class="exam-num">Problema ${i + 1}</span>
          <span class="badge">${p.tema}</span>
          <span class="badge nivel">${p.puntos} pts</span>
        </div>
        <h3>${p.titulo}</h3>
        <div class="statement">${p.enunciado}</div>
        <div class="exam-editor-wrap"><textarea id="examEd${i}"></textarea></div>
        <div class="exam-actions">
          <button class="btn btn-secondary btn-sm" data-run="${i}">▶️ Ejecutar</button>
          <span class="exam-hint-text">Probá tu código con tus propios datos (no cuenta para la nota hasta entregar).</span>
        </div>
        <pre class="output exam-out" id="examOut${i}">—</pre>`;
      body.appendChild(card);

      const ed = CodeMirror.fromTextArea(document.getElementById(`examEd${i}`), {
        mode: "python", theme: "material-darker", lineNumbers: true,
        indentUnit: 4, tabSize: 4, autoCloseBrackets: true, lineWrapping: true,
        extraKeys: { Tab: (cm) => cm.replaceSelection("    ", "end") },
      });
      ed.setValue(p.starter || "");
      setTimeout(() => ed.refresh(), 0);
      editores.push(ed);
    });

    // Ejecutar por problema (autoprueba, con prompt para input()).
    body.querySelectorAll("[data-run]").forEach((b) =>
      b.addEventListener("click", () => ejecutarProblema(parseInt(b.getAttribute("data-run"), 10))));

    $("#examEntregar").addEventListener("click", () => entregar(prueba, problemas));

    iniciarTimer(prueba.tiempoMin, () => entregar(prueba, problemas, true));
    window.scrollTo(0, 0);
  }

  async function ejecutarProblema(i) {
    const out = document.getElementById(`examOut${i}`);
    out.textContent = "Ejecutando…";
    try {
      const { output, error } = await window.PyRunner.run(editores[i].getValue(), "");
      out.textContent = error ? error : (output.trim() || "(sin salida)");
    } catch (e) {
      out.textContent = "Error: " + e;
    }
  }

  // --- Timer ---------------------------------------------------------------
  function iniciarTimer(minutos, alAgotar) {
    let restante = minutos * 60;
    const el = $("#examTimer");
    const tick = () => {
      const mm = String(Math.floor(restante / 60)).padStart(2, "0");
      const ss = String(restante % 60).padStart(2, "0");
      el.textContent = `${mm}:${ss}`;
      if (restante <= 60) el.classList.add("urgente");
      if (restante <= 0) { clearInterval(timerId); alAgotar(); return; }
      restante--;
    };
    tick();
    timerId = setInterval(tick, 1000);
  }

  // --- Entregar y corregir -------------------------------------------------
  async function entregar(prueba, problemas, automatico) {
    if (!automatico && !confirm("¿Entregar la prueba? No vas a poder seguir editando.")) return;
    if (timerId) { clearInterval(timerId); timerId = null; }

    const btn = $("#examEntregar");
    if (btn) { btn.disabled = true; btn.textContent = "Corrigiendo…"; }

    await window.PyRunner.load();

    const detalle = [];
    let ganadosTotal = 0;
    let puntosTotal = 0;

    for (let i = 0; i < problemas.length; i++) {
      const p = problemas[i];
      puntosTotal += p.puntos;
      let pasados = 0, total = p.tests.length;
      try {
        const res = await window.PyRunner.check(editores[i].getValue(), p.tests);
        pasados = res.pasados;
        total = res.total;
      } catch (_) {}
      const ganados = total ? (p.puntos * pasados) / total : 0;
      ganadosTotal += ganados;
      detalle.push({
        id: p.id, titulo: p.titulo, tema: p.tema,
        puntos: p.puntos, ganados: Math.round(ganados * 100) / 100,
        casos: `${pasados}/${total}`,
      });
    }

    const logro = puntosTotal ? (ganadosTotal / puntosTotal) * 100 : 0;
    const nota = window.logroANota(logro);

    // Guarda el resultado (si está logueado).
    const user = await window.Auth.usuarioActual();
    if (user) {
      try {
        await sb.from("exam_results").insert({
          user_id: user.id, exam_id: prueba.id, version: versionActual,
          logro: Math.round(logro * 100) / 100, nota, detalle,
        });
      } catch (e) { console.warn("No se pudo guardar el resultado:", e.message || e); }
    }

    mostrarResultado(prueba, nota, logro, detalle);
  }

  // --- Pantalla de resultado ----------------------------------------------
  function mostrarResultado(prueba, nota, logro, detalle) {
    const body = $("#examBody");
    const aprobado = nota >= 4.0;
    const filas = detalle.map((d) => `
      <tr>
        <td>${d.titulo} <span class="badge" style="margin-left:6px">${d.tema}</span></td>
        <td>${d.casos}</td>
        <td>${d.ganados} / ${d.puntos}</td>
      </tr>`).join("");

    body.innerHTML = `
      <div class="exam-result">
        <div class="nota-circle ${aprobado ? "ok" : "fail"}">
          <div class="nota-num">${nota.toFixed(1)}</div>
          <div class="nota-lbl">nota predicha</div>
        </div>
        <p class="nota-msg">${aprobado
          ? "🎉 ¡Vas bien! Con este nivel aprobarías la prueba en papel."
          : "💪 Todavía no alcanza para aprobar. Repasá los temas flojos y volvé a intentar."}</p>
        <p class="nota-logro">Logro: <b>${logro.toFixed(0)}%</b> · versión ${versionActual}</p>
        <table class="admin-table" style="margin-top:18px">
          <thead><tr><th>Problema</th><th>Casos</th><th>Puntos</th></tr></thead>
          <tbody>${filas}</tbody>
        </table>
        <p class="nota-disclaimer">📌 Es una <b>predicción</b> basada en tu desempeño sin ayuda. La prueba real puede variar.</p>
        <div class="exam-result-actions">
          <button class="btn btn-secondary" id="examOtra">Intentar otra versión</button>
          <button class="btn btn-ghost" id="examCerrar">Cerrar</button>
        </div>
      </div>`;

    $("#examCerrar").addEventListener("click", cerrarExamen);
    $("#examOtra").addEventListener("click", () => { cerrarExamen(); comenzar(prueba); });
    window.scrollTo(0, 0);
  }

  function cerrarExamen() {
    const ov = document.getElementById("pruebaOverlay");
    if (ov) ov.remove();
    const fab = document.getElementById("aiFab");
    if (fab) fab.style.display = "";
    editores = [];
  }

  // --- Init ----------------------------------------------------------------
  function init() {
    pintarBoton();
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
