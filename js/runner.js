// ============================================================================
//  runner.js — Ejecuta Python en el navegador con Pyodide (WebAssembly)
//  Expone window.PyRunner con:
//    - load()                      -> carga Pyodide (una sola vez)
//    - run(code, onStdin)          -> ejecución libre, input() interactivo
//    - check(code, tests)          -> corre los casos de prueba y devuelve veredicto
// ============================================================================

const PYODIDE_URL = "https://cdn.jsdelivr.net/pyodide/v0.26.4/full/";

let pyodide = null;
let loadingPromise = null;

async function load() {
  if (pyodide) return pyodide;
  if (loadingPromise) return loadingPromise;
  loadingPromise = (async () => {
    // loadPyodide viene del <script> de pyodide.js cargado en index.html
    pyodide = await loadPyodide({ indexURL: PYODIDE_URL });
    return pyodide;
  })();
  return loadingPromise;
}

// --- Normalización para comparar salidas de forma tolerante --------------
// Quita acentos, pasa a minúsculas y colapsa espacios. Así "Es Primo" y
// "es primo" se consideran equivalentes.
function normalize(text) {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // quita tildes
    .toLowerCase()
    .replace(/[ \t]+/g, " ");
}

// Harness en Python: redirige stdin/stdout y ejecuta el código del alumno.
// Recibe el código y la entrada como variables globales para evitar problemas
// de escape de comillas.
const HARNESS = `
import sys, io, builtins

_entrada = io.StringIO(__ENTRADA__)

def _input(prompt=""):
    linea = _entrada.readline()
    if linea == "":
        raise EOFError("El programa pidió más datos de los disponibles (input).")
    return linea.rstrip("\\n")

builtins.input = _input
_salida = io.StringIO()
_old_stdout = sys.stdout
sys.stdout = _salida
_error = None
try:
    exec(compile(__CODIGO__, "<ejercicio>", "exec"), {"__name__": "__main__"})
except Exception as e:
    import traceback
    _error = traceback.format_exc()
finally:
    sys.stdout = _old_stdout

_resultado = (_salida.getvalue(), _error)
`;

// Ejecuta el código con una entrada fija (string con líneas separadas por \n).
// Devuelve { output, error }.
async function execWithInput(code, inputText) {
  const py = await load();
  py.globals.set("__CODIGO__", code);
  py.globals.set("__ENTRADA__", inputText);
  await py.runPythonAsync(HARNESS);
  const res = py.globals.get("_resultado");
  const output = res.get(0);
  const error = res.get(1);
  res.destroy();
  return { output: output ?? "", error: error ?? null };
}

// --- Ejecución libre (botón Ejecutar) ------------------------------------
// Para input() interactivo usamos window.prompt (bloqueante y síncrono).
// onStdin opcional permite inyectar entradas desde un textarea.
async function run(code, providedInput) {
  // Si el alumno ya escribió entradas en el textarea, las usamos; si no,
  // pediremos por prompt sobre la marcha vía un harness especial.
  if (providedInput && providedInput.trim() !== "") {
    return execWithInput(code, providedInput.endsWith("\n") ? providedInput : providedInput + "\n");
  }
  // Sin entrada precargada: input() abre un window.prompt del navegador.
  const py = await load();
  py.globals.set("__CODIGO_LIBRE__", code);
  py.globals.set("__PROMPT_JS__", (msg) => {
    const r = window.prompt(msg || "Entrada:");
    return r === null ? "" : r;
  });
  const LIVE_HARNESS = `
import sys, io, builtins
def _input(prompt=""):
    return __PROMPT_JS__(prompt)
builtins.input = _input
_salida = io.StringIO()
_old = sys.stdout
sys.stdout = _salida
_err = None
try:
    exec(compile(__CODIGO_LIBRE__, "<ejercicio>", "exec"), {"__name__": "__main__"})
except Exception:
    import traceback
    _err = traceback.format_exc()
finally:
    sys.stdout = _old
_res_libre = (_salida.getvalue(), _err)
`;
  await py.runPythonAsync(LIVE_HARNESS);
  const res = py.globals.get("_res_libre");
  const out = { output: res.get(0) ?? "", error: res.get(1) ?? null };
  res.destroy();
  return out;
}

// --- Corrección automática (botón Comprobar) -----------------------------
// Para cada test: corre el código, normaliza la salida y verifica que cada
// string esperado aparezca, en orden. Devuelve un resumen.
async function check(code, tests) {
  const resultados = [];
  for (const test of tests) {
    const inputText = (test.stdin || []).join("\n") + "\n";
    let res;
    try {
      res = await execWithInput(code, inputText);
    } catch (e) {
      res = { output: "", error: String(e) };
    }

    let pasa = false;
    let detalle = "";
    if (res.error) {
      detalle = "Tu código lanzó un error.";
    } else {
      const salidaNorm = normalize(res.output);
      let idx = 0;
      let todos = true;
      let faltante = null;
      for (const esperado of test.expect) {
        const objetivo = normalize(esperado);
        const encontrado = salidaNorm.indexOf(objetivo, idx);
        if (encontrado === -1) {
          todos = false;
          faltante = esperado;
          break;
        }
        idx = encontrado + objetivo.length;
      }
      pasa = todos;
      if (!pasa) detalle = `Esperaba encontrar: "${faltante}"`;
    }

    resultados.push({
      stdin: test.stdin || [],
      expect: test.expect,
      output: res.output,
      error: res.error,
      pasa,
      detalle,
    });
  }

  const total = resultados.length;
  const pasados = resultados.filter((r) => r.pasa).length;
  return { resultados, total, pasados, exito: pasados === total };
}

window.PyRunner = { load, run, check };
