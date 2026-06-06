// ============================================================================
//  whiteboard.js — Pizarra flotante de código
//  Panel arrastrable, siempre disponible (no necesita ejercicio abierto).
//  - El tutor por voz escribe acá (escribir_codigo) y lee de acá (leer_codigo).
//  - El alumno también puede escribir y ejecutar el código.
//  Expone window.Pizarra = { abrir, cerrar, escribir, leer }.
// ============================================================================

(function () {
  "use strict";

  const STORAGE = "progra-uai-pizarra";
  let editor = null;
  let panel = null;
  let construido = false;

  function construir() {
    if (construido) return;
    construido = true;

    panel = document.createElement("div");
    panel.id = "pizarra";
    panel.className = "pizarra hidden";
    panel.innerHTML = `
      <div class="pizarra-head" id="pizHead">
        <span class="pizarra-title">🧑‍🏫 Pizarra</span>
        <div class="pizarra-head-btns">
          <button class="btn-mini" id="pizLimpiar" title="Limpiar">🧹</button>
          <button class="btn-mini" id="pizCerrar" title="Cerrar">✕</button>
        </div>
      </div>
      <div class="pizarra-editor"><textarea id="pizCode"></textarea></div>
      <div class="pizarra-actions">
        <button class="btn btn-secondary btn-sm" id="pizRun">▶️ Ejecutar</button>
        <span class="pizarra-hint">El tutor escribe acá y puede leer tu código.</span>
      </div>
      <pre class="output pizarra-out" id="pizOut">—</pre>`;
    document.body.appendChild(panel);

    editor = CodeMirror.fromTextArea(document.getElementById("pizCode"), {
      mode: "python", theme: "material-darker", lineNumbers: true,
      indentUnit: 4, tabSize: 4, autoCloseBrackets: true, lineWrapping: true,
      extraKeys: { Tab: (cm) => cm.replaceSelection("    ", "end") },
    });

    // Restaura contenido previo.
    const guardado = localStorage.getItem(STORAGE);
    editor.setValue(guardado != null ? guardado : "# Pizarra: escribí código o pedile al tutor que lo escriba\n");
    editor.on("change", () => localStorage.setItem(STORAGE, editor.getValue()));

    document.getElementById("pizCerrar").addEventListener("click", cerrar);
    document.getElementById("pizLimpiar").addEventListener("click", () => {
      editor.setValue("");
      setOut("—");
    });
    document.getElementById("pizRun").addEventListener("click", ejecutar);

    hacerArrastrable(panel, document.getElementById("pizHead"));
  }

  function setOut(txt) {
    document.getElementById("pizOut").textContent = txt;
  }

  async function ejecutar() {
    const out = document.getElementById("pizOut");
    out.textContent = "Ejecutando…";
    try {
      await window.PyRunner.load();
      const { output, error } = await window.PyRunner.run(editor.getValue(), "");
      out.textContent = error ? error : (output.trim() || "(sin salida)");
    } catch (e) {
      out.textContent = "Error: " + e;
    }
  }

  function abrir() {
    construir();
    panel.classList.remove("hidden");
    setTimeout(() => editor.refresh(), 0);
  }
  function cerrar() {
    if (panel) panel.classList.add("hidden");
  }

  // Resalta brevemente el editor para marcar un cambio del tutor.
  function destello() {
    try {
      const w = editor.getWrapperElement();
      w.style.transition = "box-shadow .3s";
      w.style.boxShadow = "0 0 0 2px var(--py-yellow)";
      setTimeout(() => { w.style.boxShadow = ""; }, 1300);
    } catch (_) {}
  }

  // --- Drag por el header --------------------------------------------------
  function hacerArrastrable(el, handle) {
    let sx, sy, ox, oy, drag = false;
    handle.style.cursor = "move";
    handle.addEventListener("mousedown", (e) => {
      if (e.target.closest("button")) return;
      drag = true;
      const r = el.getBoundingClientRect();
      sx = e.clientX; sy = e.clientY; ox = r.left; oy = r.top;
      el.style.right = "auto"; el.style.bottom = "auto";
      el.style.left = ox + "px"; el.style.top = oy + "px";
      e.preventDefault();
    });
    window.addEventListener("mousemove", (e) => {
      if (!drag) return;
      let nx = ox + (e.clientX - sx), ny = oy + (e.clientY - sy);
      nx = Math.max(0, Math.min(window.innerWidth - 60, nx));
      ny = Math.max(0, Math.min(window.innerHeight - 40, ny));
      el.style.left = nx + "px"; el.style.top = ny + "px";
    });
    window.addEventListener("mouseup", () => { drag = false; });
  }

  // --- API pública (la usa el tutor por voz vía voice-tools.js) ------------
  window.Pizarra = {
    abrir,
    cerrar,
    // El tutor escribe código en la pizarra.
    escribir(codigo) {
      if (!codigo || !String(codigo).trim()) return "No recibí código para escribir.";
      abrir();
      editor.setValue(String(codigo));
      setTimeout(() => editor.refresh(), 0);
      localStorage.setItem(STORAGE, String(codigo));
      destello();
      return "Listo, escribí el código en la pizarra.";
    },
    // El tutor lee lo que el alumno tiene en la pizarra.
    leer() {
      construir();
      const c = editor.getValue().trim();
      if (!c) return "La pizarra está vacía por ahora.";
      return c;
    },
  };

  // --- Botón lanzador en la topbar ----------------------------------------
  function pintarBoton() {
    if (document.getElementById("btnPizarra")) return;
    const btn = document.createElement("button");
    btn.id = "btnPizarra";
    btn.className = "btn-pizarra";
    btn.textContent = "🧑‍🏫 Pizarra";
    btn.title = "Abrir la pizarra de código";
    btn.addEventListener("click", () => {
      if (panel && !panel.classList.contains("hidden")) cerrar(); else abrir();
    });
    const area = document.getElementById("authArea");
    if (area) area.parentNode.insertBefore(btn, area);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", pintarBoton);
  } else {
    pintarBoton();
  }
})();
