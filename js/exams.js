// ============================================================================
//  exams.js — Pruebas predictivas (modo examen, sin ayuda ni pistas)
//
//  Cada prueba tiene 3 versiones paralelas (A/B/C): misma materia y dificultad,
//  enunciados distintos. El alumno recibe una al azar. Al entregar, se corrige
//  con los mismos casos de prueba que los ejercicios y se predice la NOTA
//  (escala chilena 1.0–7.0 al 60%).
//
//  Cada problema: { id, titulo, tema, puntos, enunciado, starter, tests }
//  - puntos: peso del problema (crédito parcial = puntos × casos_ok / casos_total)
//  - SIN pista (es una prueba).
// ============================================================================

const PRUEBAS = [
  {
    id: "prueba2",
    titulo: "Prueba 2",
    descripcion:
      "Cubre <b>ciclos</b>, <b>ciclos anidados</b>, <b>listas</b> y <b>matrices</b>. " +
      "Se hace <b>sin tutor y sin pistas</b>, como la prueba real en papel. " +
      "Al entregar, predecimos tu nota.",
    // Módulos que hay que completar para desbloquearla.
    requiere: ["ciclos", "anidados", "listas", "matrices"],
    tiempoMin: 50, // minutos sugeridos (informativo)
    versiones: {
      // ====================== VERSIÓN A ======================
      A: [
        {
          id: "p2a-1", tema: "Ciclos", puntos: 2,
          titulo: "Suma de múltiplos de 3",
          enunciado: `<p>Pide un entero <b>N</b> y calcula la suma de los primeros N múltiplos de 3
            (es decir <code>3 + 6 + 9 + ...</code>). Muestra <code>Suma: X</code>.</p>`,
          starter: `n = int(input())\n`,
          tests: [
            { stdin: ["4"], expect: ["Suma: 30"] },
            { stdin: ["1"], expect: ["Suma: 3"] },
            { stdin: ["5"], expect: ["Suma: 45"] },
          ],
        },
        {
          id: "p2a-2", tema: "Ciclos anidados", puntos: 3,
          titulo: "Rectángulo de asteriscos",
          enunciado: `<p>Pide el <b>alto</b> y el <b>ancho</b> (enteros) y dibuja un rectángulo de
            <code>*</code> de ese tamaño (alto filas, cada una con ancho asteriscos).</p>`,
          starter: `alto = int(input())\nancho = int(input())\n`,
          tests: [
            { stdin: ["2", "3"], expect: ["***", "***"] },
            { stdin: ["3", "4"], expect: ["****", "****", "****"] },
          ],
        },
        {
          id: "p2a-3", tema: "Listas", puntos: 2,
          titulo: "Contar pares",
          enunciado: `<p>Con esta lista ya creada:</p>
            <pre><code>lista = [4, 7, 2, 9, 6, 3, 8]</code></pre>
            <p>Cuenta cuántos números son <b>pares</b> y muestra <code>Pares: X</code>.</p>`,
          starter: `lista = [4, 7, 2, 9, 6, 3, 8]\n`,
          tests: [{ stdin: [], expect: ["Pares: 4"] }],
        },
        {
          id: "p2a-4", tema: "Matrices", puntos: 3,
          titulo: "Suma de la diagonal",
          enunciado: `<p>Con esta matriz:</p>
            <pre><code>M = [[1, 2, 3], [4, 5, 6], [7, 8, 9]]</code></pre>
            <p>Suma los elementos de la <b>diagonal principal</b> (M[0][0], M[1][1], M[2][2])
            y muestra <code>Diagonal: X</code>.</p>`,
          starter: `M = [[1, 2, 3], [4, 5, 6], [7, 8, 9]]\n`,
          tests: [{ stdin: [], expect: ["Diagonal: 15"] }],
        },
      ],
      // ====================== VERSIÓN B ======================
      B: [
        {
          id: "p2b-1", tema: "Ciclos", puntos: 2,
          titulo: "Cuenta regresiva",
          enunciado: `<p>Pide un entero <b>N</b> y muestra los números desde N hasta 1, uno por línea
            (cuenta regresiva).</p>`,
          starter: `n = int(input())\n`,
          tests: [
            { stdin: ["4"], expect: ["4", "3", "2", "1"] },
            { stdin: ["2"], expect: ["2", "1"] },
          ],
        },
        {
          id: "p2b-2", tema: "Ciclos anidados", puntos: 3,
          titulo: "Triángulo de numeral",
          enunciado: `<p>Pide un entero <b>n</b> y dibuja un triángulo de <code>#</code>: la fila 1 tiene
            un <code>#</code>, la fila 2 tiene dos, ... la fila n tiene n.</p>`,
          starter: `n = int(input())\n`,
          tests: [
            { stdin: ["4"], expect: ["#", "##", "###", "####"] },
            { stdin: ["2"], expect: ["#", "##"] },
          ],
        },
        {
          id: "p2b-3", tema: "Listas", puntos: 2,
          titulo: "El mayor de la lista",
          enunciado: `<p>Con esta lista:</p>
            <pre><code>lista = [3, 9, 2, 15, 7]</code></pre>
            <p>Encuentra el número <b>mayor</b> y muestra <code>Maximo: X</code>.
            (No uses <code>max()</code>, recórrela con un ciclo.)</p>`,
          starter: `lista = [3, 9, 2, 15, 7]\n`,
          tests: [{ stdin: [], expect: ["Maximo: 15"] }],
        },
        {
          id: "p2b-4", tema: "Matrices", puntos: 3,
          titulo: "Suma de toda la matriz",
          enunciado: `<p>Con esta matriz:</p>
            <pre><code>M = [[1, 2], [3, 4], [5, 6]]</code></pre>
            <p>Suma <b>todos</b> los elementos y muestra <code>Total: X</code>.</p>`,
          starter: `M = [[1, 2], [3, 4], [5, 6]]\n`,
          tests: [{ stdin: [], expect: ["Total: 21"] }],
        },
      ],
      // ====================== VERSIÓN C ======================
      C: [
        {
          id: "p2c-1", tema: "Ciclos", puntos: 2,
          titulo: "Tabla de multiplicar",
          enunciado: `<p>Pide un entero <b>N</b> y muestra su tabla de multiplicar del 1 al 10, con el
            formato <code>N x i = R</code> (una línea por cada i de 1 a 10).</p>`,
          starter: `n = int(input())\n`,
          tests: [
            { stdin: ["5"], expect: ["5 x 1 = 5", "5 x 5 = 25", "5 x 10 = 50"] },
            { stdin: ["3"], expect: ["3 x 1 = 3", "3 x 10 = 30"] },
          ],
        },
        {
          id: "p2c-2", tema: "Ciclos anidados", puntos: 3,
          titulo: "Cuadro de números",
          enunciado: `<p>Pide un entero <b>n</b> y dibuja un cuadrado de n filas, donde cada fila muestra
            los números del 1 al n pegados. Ej. n=3 → cada fila es <code>123</code>.</p>`,
          starter: `n = int(input())\n`,
          tests: [
            { stdin: ["3"], expect: ["123", "123", "123"] },
            { stdin: ["4"], expect: ["1234", "1234", "1234", "1234"] },
          ],
        },
        {
          id: "p2c-3", tema: "Listas", puntos: 2,
          titulo: "Promedio de la lista",
          enunciado: `<p>Con esta lista:</p>
            <pre><code>lista = [10, 20, 30, 40]</code></pre>
            <p>Calcula el <b>promedio</b> y muestra <code>Promedio: X</code>.</p>`,
          starter: `lista = [10, 20, 30, 40]\n`,
          tests: [{ stdin: [], expect: ["Promedio: 25"] }],
        },
        {
          id: "p2c-4", tema: "Matrices", puntos: 3,
          titulo: "El mayor de la matriz",
          enunciado: `<p>Con esta matriz:</p>
            <pre><code>M = [[3, 8], [5, 1], [9, 2]]</code></pre>
            <p>Encuentra el elemento <b>mayor</b> de toda la matriz y muestra <code>Mayor: X</code>.</p>`,
          starter: `M = [[3, 8], [5, 1], [9, 2]]\n`,
          tests: [{ stdin: [], expect: ["Mayor: 9"] }],
        },
      ],
    },
  },
];

// Convierte porcentaje de logro (0–100) a nota chilena 1.0–7.0 al 60%.
function logroANota(logro) {
  let nota;
  if (logro >= 60) nota = 4.0 + ((logro - 60) / 40) * 3.0;
  else nota = 1.0 + (logro / 60) * 3.0;
  return Math.round(Math.max(1, Math.min(7, nota)) * 10) / 10;
}

window.PRUEBAS = PRUEBAS;
window.logroANota = logroANota;
