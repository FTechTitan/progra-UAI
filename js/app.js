// ============================================================================
//  app.js — Lógica de la interfaz
//  Construye la barra lateral, gestiona el progreso (localStorage), conecta el
//  editor (CodeMirror) con el runner (Pyodide) y maneja el desbloqueo de
//  ejercicios de menos a más.
// ============================================================================

(function () {
  "use strict";

  const STORAGE_KEY = "progra-uai-progreso-v1";
  const modulos = window.CURRICULUM;

  // Lista plana de ejercicios en orden, con referencia a su módulo.
  const ejerciciosPlanos = [];
  modulos.forEach((m) => {
    m.ejercicios.forEach((e) => ejerciciosPlanos.push({ ...e, moduloId: m.id, moduloTitulo: m.titulo }));
  });

  // --- Estado persistente --------------------------------------------------
  function cargarProgreso() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return { completados: {}, codigo: {} };
      const data = JSON.parse(raw);
      return { completados: data.completados || {}, codigo: data.codigo || {} };
    } catch {
      return { completados: {}, codigo: {} };
    }
  }

  function guardarProgreso() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(estado));
  }

  const estado = cargarProgreso();

  // Usuario logueado (null = invitado, progreso solo local).
  let usuarioActual = null;
  // Debounce por ejercicio para no spamear la DB al tipear código.
  const debouncersCodigo = {};

  // Empuja una fila de progreso a Supabase si hay sesión (silencioso si no).
  function pushRemoto(exerciseId, payload) {
    if (!usuarioActual) return;
    window.ProgresoRemoto
      .guardar(usuarioActual.id, exerciseId, payload)
      .catch((e) => console.warn("No se pudo guardar en la nube:", e.message || e));
  }

  // Guarda el código de un ejercicio en la nube, con debounce de 1.2s.
  function pushCodigoDebounced(exerciseId, code) {
    if (!usuarioActual) return;
    clearTimeout(debouncersCodigo[exerciseId]);
    debouncersCodigo[exerciseId] = setTimeout(() => {
      pushRemoto(exerciseId, { code });
    }, 1200);
  }

  // Al iniciar/cerrar sesión: fusiona el progreso local con el de la nube.
  async function sincronizarConRemoto(user) {
    usuarioActual = user;
    if (!user) {
      // Logout: el progreso local queda como "invitado" en este dispositivo.
      renderSidebar();
      return;
    }
    let remoto;
    try {
      remoto = await window.ProgresoRemoto.cargar();
    } catch (e) {
      console.warn("No se pudo cargar progreso de la nube:", e.message || e);
      return;
    }

    // Detecta progreso local que aún no está en la nube (para migrarlo).
    const subirCompletados = Object.keys(estado.completados).filter(
      (id) => estado.completados[id] && !remoto.completados[id]
    );
    const subirCodigo = Object.keys(estado.codigo).filter(
      (id) => estado.codigo[id] != null && remoto.codigo[id] === undefined
    );

    // Fusiona: la nube gana donde tiene datos; lo local-only se conserva.
    estado.completados = { ...estado.completados, ...remoto.completados };
    estado.codigo = { ...estado.codigo, ...remoto.codigo };
    guardarProgreso();

    // Sube lo que estaba solo en local (progreso de invitado).
    const idsASubir = new Set([...subirCompletados, ...subirCodigo]);
    idsASubir.forEach((id) => {
      pushRemoto(id, { completed: !!estado.completados[id], code: estado.codigo[id] });
    });

    renderSidebar();
    // Si hay un ejercicio abierto, refresca su editor con el código fusionado.
    if (ejercicioActual && indiceActual >= 0) abrirEjercicio(indiceActual);
  }

  // Un ejercicio está desbloqueado si es el primero o si el anterior ya se
  // completó. Así se avanza "de a poco".
  function estaDesbloqueado(index) {
    if (index === 0) return true;
    const anterior = ejerciciosPlanos[index - 1];
    return !!estado.completados[anterior.id];
  }

  // --- Referencias al DOM --------------------------------------------------
  const $ = (sel) => document.querySelector(sel);
  const sidebar = $("#sidebar");
  const welcome = $("#welcome");
  const exercise = $("#exercise");
  const outputEl = $("#output");
  const pyStatus = $("#pyStatus");

  let editor = null;       // instancia de CodeMirror
  let ejercicioActual = null;
  let indiceActual = -1;

  // --- Inicializa el editor CodeMirror -------------------------------------
  function initEditor() {
    editor = CodeMirror.fromTextArea(document.getElementById("editor"), {
      mode: "python",
      theme: "material-darker",
      lineNumbers: true,
      indentUnit: 4,
      tabSize: 4,
      indentWithTabs: false,
      autoCloseBrackets: true,
      lineWrapping: true,
      extraKeys: {
        Tab: (cm) => cm.replaceSelection("    ", "end"),
      },
    });
  }

  // --- Construye la barra lateral ------------------------------------------
  function renderSidebar() {
    sidebar.innerHTML = "";
    let globalIndex = 0;

    modulos.forEach((modulo) => {
      const completadosModulo = modulo.ejercicios.filter((e) => estado.completados[e.id]).length;

      const divMod = document.createElement("div");
      divMod.className = "modulo";

      const header = document.createElement("div");
      header.className = "modulo-header";
      header.innerHTML = `<span class="emoji">${modulo.emoji}</span> ${modulo.titulo}
        <span class="modulo-progress">${completadosModulo}/${modulo.ejercicios.length}</span>`;
      divMod.appendChild(header);

      modulo.ejercicios.forEach((ej) => {
        const idx = globalIndex++;
        const desbloqueado = estaDesbloqueado(idx);
        const completado = !!estado.completados[ej.id];

        const item = document.createElement("div");
        item.className = "ej-item";
        if (!desbloqueado) item.classList.add("bloqueado");
        if (ejercicioActual && ej.id === ejercicioActual.id) item.classList.add("activo");

        const estadoIcon = completado ? "✅" : desbloqueado ? "⚪" : "🔒";
        const dots = "●".repeat(ej.nivel || 1);

        item.innerHTML = `
          <span class="estado">${estadoIcon}</span>
          <span class="nombre">${ej.titulo}</span>
          <span class="nivel-dots">${dots}</span>`;

        if (desbloqueado) {
          item.addEventListener("click", () => abrirEjercicio(idx));
        }
        divMod.appendChild(item);
      });

      sidebar.appendChild(divMod);
    });

    actualizarProgresoGlobal();
  }

  function actualizarProgresoGlobal() {
    const total = ejerciciosPlanos.length;
    const hechos = ejerciciosPlanos.filter((e) => estado.completados[e.id]).length;
    const pct = total ? Math.round((hechos / total) * 100) : 0;
    $("#progresoGlobal").style.width = pct + "%";
    $("#progresoTexto").textContent = `${hechos} / ${total}`;
  }

  // --- Abre un ejercicio en el workspace -----------------------------------
  function abrirEjercicio(index) {
    const ej = ejerciciosPlanos[index];
    if (!estaDesbloqueado(index)) return;

    ejercicioActual = ej;
    indiceActual = index;

    welcome.classList.add("hidden");
    exercise.classList.remove("hidden");

    $("#exModulo").textContent = ej.moduloTitulo;
    $("#exNivel").textContent = "Nivel " + (ej.nivel || 1);
    $("#exTitulo").textContent = ej.titulo;
    $("#exEnunciado").innerHTML = ej.enunciado;
    $("#exPista").textContent = ej.pista || "Pensá el problema paso a paso.";

    // Restaura el código guardado del alumno o el starter del ejercicio.
    const guardado = estado.codigo[ej.id];
    editor.setValue(guardado != null ? guardado : ej.starter || "");

    $("#stdin").value = "";
    outputEl.className = "output";
    outputEl.textContent = "Tocá «Ejecutar» o «Comprobar» para ver la salida.";

    // El botón Siguiente se habilita solo si ya está completado.
    $("#btnNext").disabled = !estado.completados[ej.id];

    renderSidebar();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // --- Guarda el código del alumno mientras escribe ------------------------
  function guardarCodigoActual() {
    if (!ejercicioActual) return;
    estado.codigo[ejercicioActual.id] = editor.getValue();
    guardarProgreso();
  }

  // --- Pyodide listo? ------------------------------------------------------
  let pyListo = false;
  async function asegurarPython() {
    if (pyListo) return;
    setOutput('<span class="dim"><span class="spinner"></span>Cargando Python (primera vez, ~5s)…</span>', "");
    await window.PyRunner.load();
    pyListo = true;
  }

  function setOutput(html, cls) {
    outputEl.className = "output" + (cls ? " " + cls : "");
    outputEl.innerHTML = html;
  }

  function escaparHtml(s) {
    return (s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  // --- Botón Ejecutar ------------------------------------------------------
  async function onRun() {
    guardarCodigoActual();
    await asegurarPython();
    const codigo = editor.getValue();
    const entrada = $("#stdin").value;
    try {
      const { output, error } = await window.PyRunner.run(codigo, entrada);
      if (error) {
        setOutput('<span class="err-line">' + escaparHtml(error) + "</span>", "fail");
      } else {
        setOutput(
          output.trim() === ""
            ? '<span class="dim">(tu programa no imprimió nada)</span>'
            : escaparHtml(output),
          ""
        );
      }
    } catch (e) {
      setOutput('<span class="err-line">Error inesperado: ' + escaparHtml(String(e)) + "</span>", "fail");
    }
  }

  // --- Botón Comprobar -----------------------------------------------------
  async function onCheck() {
    guardarCodigoActual();
    await asegurarPython();
    const codigo = editor.getValue();
    setOutput('<span class="dim"><span class="spinner"></span>Corriendo casos de prueba…</span>', "");

    const ej = ejercicioActual;
    let res;
    try {
      res = await window.PyRunner.check(codigo, ej.tests);
    } catch (e) {
      setOutput('<span class="err-line">Error al correr: ' + escaparHtml(String(e)) + "</span>", "fail");
      return;
    }

    // Construye el reporte por caso.
    let html = "";
    res.resultados.forEach((r, i) => {
      const icono = r.pasa ? "✅" : "❌";
      const cls = r.pasa ? "ok-line" : "fail-line";
      const entrada = r.stdin.length ? r.stdin.join(", ") : "(sin entrada)";
      html += `<span class="${cls}">${icono} Caso ${i + 1}</span>  `;
      html += `<span class="dim">entrada: ${escaparHtml(entrada)}</span>\n`;
      if (!r.pasa) {
        if (r.error) {
          html += '   <span class="err-line">' + escaparHtml(r.error.split("\n").slice(-2).join(" ").trim()) + "</span>\n";
        } else {
          html += '   <span class="dim">' + escaparHtml(r.detalle) + "</span>\n";
          const salida = r.output.trim() || "(nada)";
          html += '   <span class="dim">tu salida: ' + escaparHtml(salida.replace(/\n/g, " ⏎ ")) + "</span>\n";
        }
      }
    });

    html += `\n<b>${res.pasados} de ${res.total} casos correctos.</b>`;

    if (res.exito) {
      setOutput(html, "ok");
      marcarCompletado(ej);
    } else {
      setOutput(html, "fail");
    }
  }

  // --- Marca completado y desbloquea el siguiente --------------------------
  function marcarCompletado(ej) {
    const eraNuevo = !estado.completados[ej.id];
    estado.completados[ej.id] = true;
    guardarProgreso();
    pushRemoto(ej.id, { completed: true, code: editor.getValue() });
    renderSidebar();
    $("#btnNext").disabled = indiceActual >= ejerciciosPlanos.length - 1;

    if (eraNuevo) {
      mostrarToast("🎉 ¡Ejercicio completado!");
    }
  }

  function mostrarToast(texto) {
    const t = document.createElement("div");
    t.className = "toast";
    t.textContent = texto;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 2200);
  }

  // --- Botón Siguiente -----------------------------------------------------
  function onNext() {
    const sig = indiceActual + 1;
    if (sig < ejerciciosPlanos.length && estaDesbloqueado(sig)) {
      abrirEjercicio(sig);
    }
  }

  // --- Botón Reiniciar código ----------------------------------------------
  function onReset() {
    if (!ejercicioActual) return;
    if (confirm("¿Volver al código inicial? Se perderá lo que escribiste en este ejercicio.")) {
      editor.setValue(ejercicioActual.starter || "");
      guardarCodigoActual();
    }
  }

  // --- Carga inicial de Pyodide en segundo plano ---------------------------
  async function precargarPython() {
    try {
      await window.PyRunner.load();
      pyListo = true;
      pyStatus.innerHTML = "✅ Python listo. ¡Elegí un ejercicio para empezar!";
      pyStatus.style.background = "var(--green-soft)";
    } catch (e) {
      pyStatus.innerHTML = "⚠️ No se pudo cargar Python. Revisá tu conexión y recargá.";
      pyStatus.style.background = "var(--red-soft)";
    }
  }

  // --- Arranque ------------------------------------------------------------
  function init() {
    initEditor();
    renderSidebar();

    editor.on("change", () => {
      // Guardado liviano del código mientras escribe (local + nube con debounce).
      if (ejercicioActual) {
        const code = editor.getValue();
        estado.codigo[ejercicioActual.id] = code;
        pushCodigoDebounced(ejercicioActual.id, code);
      }
    });
    editor.on("blur", () => {
      guardarProgreso();
      if (ejercicioActual) pushRemoto(ejercicioActual.id, { code: editor.getValue() });
    });

    // Sincroniza con la nube cuando cambia la sesión (login/logout).
    if (window.AuthUI) window.AuthUI.onUsuario(sincronizarConRemoto);

    $("#btnRun").addEventListener("click", onRun);
    $("#btnCheck").addEventListener("click", onCheck);
    $("#btnNext").addEventListener("click", onNext);
    $("#btnReset").addEventListener("click", onReset);

    precargarPython();
  }

  // Espera a que el DOM y los scripts (CodeMirror, data) estén disponibles.
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
