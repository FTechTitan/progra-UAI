// ============================================================================
//  auth-ui.js — UI de autenticación (modal login/registro + chip de usuario)
//  Expone window.AuthUI con:
//    - onUsuario(cb)  -> se llama cada vez que cambia la sesión (user | null)
//    - abrir()        -> abre el modal de login
// ============================================================================

(function () {
  "use strict";

  const $ = (s) => document.querySelector(s);
  const suscriptores = [];
  let modo = "login"; // "login" | "registro"

  // Referencias
  const modal = $("#authModal");
  const form = $("#authForm");
  const emailIn = $("#authEmail");
  const passIn = $("#authPassword");
  const errorEl = $("#authError");
  const submitBtn = $("#authSubmit");
  const titulo = $("#authTitulo");
  const toggle = $("#authToggle");
  const toggleText = $("#authToggleText");

  function abrir() {
    errorEl.classList.add("hidden");
    modal.classList.remove("hidden");
    setTimeout(() => emailIn.focus(), 50);
  }
  function cerrar() {
    modal.classList.add("hidden");
  }

  function setModo(nuevo) {
    modo = nuevo;
    errorEl.classList.add("hidden");
    if (modo === "login") {
      titulo.textContent = "Entrá a tu cuenta";
      submitBtn.textContent = "Entrar";
      passIn.setAttribute("autocomplete", "current-password");
      toggleText.textContent = "¿No tenés cuenta?";
      toggle.textContent = "Registrate";
    } else {
      titulo.textContent = "Creá tu cuenta";
      submitBtn.textContent = "Registrarme";
      passIn.setAttribute("autocomplete", "new-password");
      toggleText.textContent = "¿Ya tenés cuenta?";
      toggle.textContent = "Entrá";
    }
  }

  function mostrarError(msg) {
    errorEl.textContent = msg;
    errorEl.classList.remove("hidden");
  }

  // Traduce errores comunes de Supabase a español claro.
  function traducirError(e) {
    const m = (e && e.message) || String(e);
    if (/invalid login credentials/i.test(m)) return "Email o contraseña incorrectos.";
    if (/user already registered/i.test(m)) return "Ese email ya está registrado. Probá entrar.";
    if (/password should be at least/i.test(m)) return "La contraseña debe tener al menos 6 caracteres.";
    if (/unable to validate email/i.test(m)) return "Revisá el email, parece inválido.";
    if (/rate limit/i.test(m)) return "Demasiados intentos. Esperá un momento.";
    return m;
  }

  // Actualiza el chip de usuario en la topbar.
  function pintarSesion(user) {
    const chip = $("#userChip");
    const btnLogin = $("#btnLogin");
    if (user) {
      $("#userEmail").textContent = user.email || "Mi cuenta";
      chip.classList.remove("hidden");
      btnLogin.classList.add("hidden");
    } else {
      chip.classList.add("hidden");
      btnLogin.classList.remove("hidden");
    }
  }

  function notificar(user) {
    pintarSesion(user);
    suscriptores.forEach((cb) => {
      try { cb(user); } catch (e) { console.error(e); }
    });
  }

  // --- Eventos -------------------------------------------------------------
  function wire() {
    $("#btnLogin").addEventListener("click", abrir);
    $("#authClose").addEventListener("click", cerrar);
    $("#authSkip").addEventListener("click", (e) => { e.preventDefault(); cerrar(); });
    modal.addEventListener("click", (e) => { if (e.target === modal) cerrar(); });

    toggle.addEventListener("click", (e) => {
      e.preventDefault();
      setModo(modo === "login" ? "registro" : "login");
    });

    $("#btnLogout").addEventListener("click", async () => {
      await window.Auth.salir();
      // onCambio dispara notificar(null)
    });

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      errorEl.classList.add("hidden");
      const email = emailIn.value.trim();
      const pass = passIn.value;
      submitBtn.disabled = true;
      const textoPrevio = submitBtn.textContent;
      submitBtn.textContent = modo === "login" ? "Entrando…" : "Creando…";
      try {
        if (modo === "registro") {
          await window.Auth.registrar(email, pass);
        } else {
          await window.Auth.entrar(email, pass);
        }
        cerrar();
        form.reset();
        // onCambio dispara notificar(user)
      } catch (err) {
        mostrarError(traducirError(err));
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = textoPrevio;
      }
    });

    // Sesión inicial + cambios.
    window.Auth.onCambio((user) => notificar(user));
    window.Auth.usuarioActual().then((user) => pintarSesion(user));
  }

  window.AuthUI = {
    onUsuario(cb) { suscriptores.push(cb); },
    abrir,
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", wire);
  } else {
    wire();
  }
})();
