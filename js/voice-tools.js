// ============================================================================
//  voice-tools.js — Conecta las "client tools" del tutor por voz (ConvAI)
//  con la página. Cuando el agente llama a `escribir_codigo`, el código se
//  escribe en el editor del alumno (window.EscribirEnEditor, definida en app.js).
// ============================================================================

(function () {
  "use strict";

  function registrar() {
    const widget = document.querySelector("elevenlabs-convai");
    if (!widget) return;

    // El widget pide la config de client tools justo antes de iniciar la llamada.
    widget.addEventListener("elevenlabs-convai:call", (event) => {
      try {
        event.detail.config.clientTools = {
          // Escribe código en la pizarra flotante.
          escribir_codigo: async (params) => {
            const codigo = params && (params.codigo ?? params.code ?? "");
            if (window.Pizarra) return window.Pizarra.escribir(codigo);
            return "No encontré la pizarra en la página.";
          },
          // Lee lo que el alumno escribió en la pizarra.
          leer_codigo: async () => {
            if (window.Pizarra) return window.Pizarra.leer();
            return "No encontré la pizarra en la página.";
          },
        };
      } catch (e) {
        console.warn("No se pudieron registrar las client tools de voz:", e);
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", registrar);
  } else {
    registrar();
  }
})();
