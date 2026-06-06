// ============================================================================
//  data.js — Currículo de ejercicios
//  Cada módulo agrupa ejercicios de menos a más. Cada ejercicio se corrige
//  automáticamente alimentando líneas de entrada (stdin) y verificando que
//  la salida contenga ciertos textos clave (en orden).
//
//  Estructura de un test:
//    { stdin: ["10", "20"], expect: ["30"] }
//  -> El programa recibe esas líneas en cada input() y su salida debe
//     contener cada string de `expect`, apareciendo en ese orden.
//  El emparejado es "tolerante": ignora mayúsculas/acentos y espacios extra,
//  así el alumno no pierde por escribir "Es Positivo" vs "es positivo".
// ============================================================================

const CURRICULUM = [
  // ==========================================================================
  // MÓDULO 1 — CONDICIONALES
  // ==========================================================================
  {
    id: "condicionales",
    titulo: "Condicionales",
    emoji: "🔀",
    intro:
      "Los condicionales le dan <b>inteligencia</b> al programa: permiten decidir " +
      "qué instrucciones ejecutar según una condición lógica (<code>if</code>, " +
      "<code>elif</code>, <code>else</code>).",
    teoria: `
<p>La forma básica de un condicional en Python:</p>
<pre><code>if condicion:
    # se ejecuta si la condición es VERDADERA
else:
    # se ejecuta si la condición es FALSA</code></pre>
<p>Solo el <code>if</code> lleva una condición explícita. El <code>else</code> es
"todo lo demás". Para varias decisiones usamos <code>elif</code>:</p>
<pre><code>if nota &gt;= 4.0:
    print("Aprobado")
elif nota &gt;= 3.0:
    print("En riesgo")
else:
    print("Reprobado")</code></pre>
<p>Operadores de comparación: <code>==  !=  &lt;  &gt;  &lt;=  &gt;=</code>.
Operadores lógicos para combinar condiciones: <code>and</code>, <code>or</code>,
<code>not</code>.</p>`,
    ejercicios: [
      {
        id: "cond-01",
        titulo: "¿Mayor de edad?",
        nivel: 1,
        enunciado: `
<p>Pide al usuario su <b>edad</b> (un número entero). Si es <b>menor de 18</b>,
muestra el mensaje <code>Eres menor de edad</code>. Si tiene 18 o más, muestra
<code>Eres mayor de edad</code>.</p>`,
        pista: "Usá int(input()) para leer la edad como número, después un if/else.",
        starter: `edad = int(input("Ingresa tu edad: "))
# Tu código acá:
`,
        tests: [
          { stdin: ["15"], expect: ["menor de edad"] },
          { stdin: ["18"], expect: ["mayor de edad"] },
          { stdin: ["40"], expect: ["mayor de edad"] },
        ],
      },
      {
        id: "cond-02",
        titulo: "Promedio de dos notas",
        nivel: 1,
        enunciado: `
<p>Pide <b>dos notas</b> (números, pueden tener decimales), calcula el promedio y
muestra:</p>
<ul>
<li><code>Felicitaciones, vas camino a aprobar</code> si el promedio es ≥ 4.0</li>
<li><code>Atencion, vas camino a reprobar</code> si está entre 3.0 y 4.0</li>
<li><code>Pocas posibilidades de aprobar</code> si es menor a 3.0</li>
</ul>`,
        pista: "Leé con float(input()). Promedio = (n1+n2)/2. Usá if / elif / else.",
        starter: `n1 = float(input("Nota 1: "))
n2 = float(input("Nota 2: "))
# Tu código acá:
`,
        tests: [
          { stdin: ["5", "6"], expect: ["camino a aprobar"] },
          { stdin: ["3.5", "3.5"], expect: ["camino a reprobar"] },
          { stdin: ["2", "1"], expect: ["pocas posibilidades"] },
        ],
      },
      {
        id: "cond-03",
        titulo: "¿B divide a A?",
        nivel: 2,
        enunciado: `
<p>Pide dos enteros <b>A</b> y <b>B</b>. Si la división <code>A / B</code> es
exacta (el resto es 0), muestra <code>B divide exactamente a A</code>. En caso
contrario, muestra <code>B no divide a A</code>.</p>`,
        pista: "El resto se obtiene con el operador módulo %. Si A % B == 0, divide exacto.",
        starter: `A = int(input("A: "))
B = int(input("B: "))
# Tu código acá:
`,
        tests: [
          { stdin: ["10", "5"], expect: ["divide exactamente"] },
          { stdin: ["10", "3"], expect: ["no divide"] },
          { stdin: ["20", "4"], expect: ["divide exactamente"] },
        ],
      },
      {
        id: "cond-04",
        titulo: "Tres números ordenados",
        nivel: 2,
        enunciado: `
<p>Pide <b>tres números</b> y muéstralos ordenados de <b>mayor a menor</b>,
separados por espacios en una sola línea. Ej: para 3, 9, 5 debe imprimir
<code>9 5 3</code>.</p>`,
        pista: "Podés usar muchos if/else, o crear una lista y usar sorted(lista, reverse=True).",
        starter: `a = int(input())
b = int(input())
c = int(input())
# Tu código acá:
`,
        tests: [
          { stdin: ["3", "9", "5"], expect: ["9 5 3"] },
          { stdin: ["1", "2", "3"], expect: ["3 2 1"] },
          { stdin: ["7", "7", "1"], expect: ["7 7 1"] },
        ],
      },
      {
        id: "cond-05",
        titulo: "Sensor de temperatura",
        nivel: 3,
        enunciado: `
<p>Un sensor mide la temperatura en <b>grados Fahrenheit</b>. Pide el valor en
Fahrenheit, conviértelo a Celsius con la fórmula:</p>
<pre><code>Celsius = (Fahrenheit - 32) / 1.8</code></pre>
<p>Luego muestra el valor en Celsius y un mensaje:</p>
<ul>
<li><code>Hace frio</code> si Celsius &lt; 15</li>
<li><code>Temperatura agradable</code> si está entre 15 y 25</li>
<li><code>Hace calor</code> si Celsius &gt; 25</li>
</ul>`,
        pista: "Primero calculá celsius, imprimilo, y después decidí el mensaje con if/elif/else.",
        starter: `f = float(input("Temperatura en Fahrenheit: "))
# Tu código acá:
`,
        tests: [
          { stdin: ["50"], expect: ["10", "frio"] },     // 10°C
          { stdin: ["68"], expect: ["20", "agradable"] }, // 20°C
          { stdin: ["95"], expect: ["35", "calor"] },     // 35°C
        ],
      },
    ],
  },

  // ==========================================================================
  // MÓDULO 2 — CICLOS
  // ==========================================================================
  {
    id: "ciclos",
    titulo: "Ciclos",
    emoji: "🔁",
    intro:
      "Un ciclo permite <b>repetir</b> instrucciones. Python tiene dos: " +
      "<code>while</code> (repite mientras se cumpla una condición) y " +
      "<code>for</code> (recorre un rango o una secuencia).",
    teoria: `
<p><b>while</b> — repite mientras la condición sea verdadera:</p>
<pre><code>contador = 0
while contador &lt; 5:
    print(contador)
    contador = contador + 1</code></pre>
<p><b>for</b> con <code>range</code> — más compacto cuando sabés cuántas veces:</p>
<pre><code>for i in range(1, 6):      # genera 1, 2, 3, 4, 5
    print(i)

range(inicio, fin, paso)   # fin NO se incluye</code></pre>
<p>Ojo con el <b>caso de borde</b>: si la condición del while es falsa desde el
inicio, el bloque no se ejecuta nunca.</p>`,
    ejercicios: [
      {
        id: "ciclo-01",
        titulo: "Los primeros 10 pares",
        nivel: 1,
        enunciado: `
<p>Muestra por pantalla los <b>primeros 10 números pares</b> (empezando del 2),
cada uno en una línea: 2, 4, 6, ... 20.</p>`,
        pista: "for i in range(1, 11): el par es i*2. O recorré range(2, 21, 2).",
        starter: `# Tu código acá:
`,
        tests: [
          { stdin: [], expect: ["2", "4", "6", "8", "10", "12", "14", "16", "18", "20"] },
        ],
      },
      {
        id: "ciclo-02",
        titulo: "Los primeros N pares",
        nivel: 2,
        enunciado: `
<p>Pide un número <b>N</b> al usuario y muestra los <b>primeros N números
pares</b>, uno por línea.</p>`,
        pista: "for i in range(1, N+1): imprimí i*2.",
        starter: `n = int(input("¿Cuántos pares? "))
# Tu código acá:
`,
        tests: [
          { stdin: ["3"], expect: ["2", "4", "6"] },
          { stdin: ["5"], expect: ["2", "4", "6", "8", "10"] },
        ],
      },
      {
        id: "ciclo-03",
        titulo: "Del A al B",
        nivel: 2,
        enunciado: `
<p>Pide dos enteros <b>A</b> y <b>B</b> y muestra todos los números entre ellos
(ambos incluidos), uno por línea. Si A &lt; B en orden <b>creciente</b>; si
A &gt; B en orden <b>decreciente</b>.</p>`,
        pista: "Si A<=B usá range(A, B+1). Si A>B usá range(A, B-1, -1).",
        starter: `A = int(input("A: "))
B = int(input("B: "))
# Tu código acá:
`,
        tests: [
          { stdin: ["1", "4"], expect: ["1", "2", "3", "4"] },
          { stdin: ["3", "1"], expect: ["3", "2", "1"] },
        ],
      },
      {
        id: "ciclo-04",
        titulo: "Suma hasta el -1",
        nivel: 2,
        enunciado: `
<p>Pide números enteros al usuario, uno por uno, y ve sumándolos. Cuando el
usuario ingresa <b>-1</b>, deja de pedir y muestra la suma total con el formato
<code>Suma: X</code>. El -1 <b>no</b> se suma. Si el primer número es -1, la suma
es 0.</p>`,
        pista: "Usá while: leé un número, mientras sea distinto de -1 sumá y leé otro.",
        starter: `suma = 0
n = int(input("Número (-1 para terminar): "))
# Tu código acá (usá un while):
`,
        tests: [
          { stdin: ["5", "10", "3", "-1"], expect: ["Suma: 18"] },
          { stdin: ["-1"], expect: ["Suma: 0"] },
          { stdin: ["100", "-1"], expect: ["Suma: 100"] },
        ],
      },
      {
        id: "ciclo-05",
        titulo: "Factorial",
        nivel: 3,
        enunciado: `
<p>Pide un entero <b>n</b> y calcula su <b>factorial</b>:
<code>n! = n × (n-1) × ... × 2 × 1</code>. Muestra <code>Factorial: X</code>.
Recordá que <code>0! = 1</code>.</p>`,
        pista: "Empezá con resultado=1 y multiplicá por cada i de 1 a n con un for.",
        starter: `n = int(input("n: "))
# Tu código acá:
`,
        tests: [
          { stdin: ["5"], expect: ["Factorial: 120"] },
          { stdin: ["0"], expect: ["Factorial: 1"] },
          { stdin: ["6"], expect: ["Factorial: 720"] },
        ],
      },
      {
        id: "ciclo-06",
        titulo: "¿Es primo?",
        nivel: 3,
        enunciado: `
<p>Pide un entero positivo <b>P</b> y determina si es <b>primo</b> (solo divisible
por 1 y por sí mismo). Muestra <code>Es primo</code> o <code>No es primo</code>.</p>`,
        pista: "Contá cuántos divisores tiene entre 1 y P. Si tiene exactamente 2, es primo. Ojo: 1 no es primo.",
        starter: `P = int(input("P: "))
# Tu código acá:
`,
        tests: [
          { stdin: ["7"], expect: ["es primo"] },
          { stdin: ["10"], expect: ["no es primo"] },
          { stdin: ["1"], expect: ["no es primo"] },
          { stdin: ["13"], expect: ["es primo"] },
        ],
      },
      {
        id: "ciclo-07",
        titulo: "Número palíndromo",
        nivel: 4,
        enunciado: `
<p>Pide un número entero y determina si es <b>palíndromo</b> (se lee igual al
derecho y al revés, ej: 131, 7887). Muestra <code>Es palindromo</code> o
<code>No es palindromo</code>.</p>`,
        pista: "Convertí el número a texto con str(numero) y comparalo con su reverso texto[::-1].",
        starter: `n = input("Número: ")
# Tu código acá:
`,
        tests: [
          { stdin: ["131"], expect: ["es palindromo"] },
          { stdin: ["123"], expect: ["no es palindromo"] },
          { stdin: ["7887"], expect: ["es palindromo"] },
        ],
      },
    ],
  },

  // ==========================================================================
  // MÓDULO 3 — LISTAS
  // ==========================================================================
  {
    id: "listas",
    titulo: "Listas",
    emoji: "📋",
    intro:
      "Una <b>lista</b> agrupa muchos valores en una sola variable. Se accede a " +
      "cada elemento por su <b>índice</b> (empezando en 0).",
    teoria: `
<p>Crear y acceder:</p>
<pre><code>numeros = [10, 20, 30]
print(numeros[0])     # 10  (primer elemento)
print(numeros[-1])    # 30  (último elemento)
print(len(numeros))   # 3   (cantidad de elementos)</code></pre>
<p>Modificar:</p>
<pre><code>numeros.append(40)    # agrega al final -> [10,20,30,40]
numeros[0] = 99       # cambia un elemento
</code></pre>
<p>Recorrer:</p>
<pre><code>for x in numeros:
    print(x)

suma = 0
for x in numeros:
    suma = suma + x</code></pre>`,
    ejercicios: [
      {
        id: "lista-01",
        titulo: "Guardar 5 números",
        nivel: 1,
        enunciado: `
<p>Pide al usuario <b>5 números</b>, guárdalos en una lista y al final muestra la
lista completa con <code>print(lista)</code>.</p>`,
        pista: "Creá una lista vacía []. Con un for de 5 vueltas, leé un número y usá .append().",
        starter: `numeros = []
# Tu código acá:
`,
        tests: [
          { stdin: ["1", "2", "3", "4", "5"], expect: ["[1, 2, 3, 4, 5]"] },
        ],
      },
      {
        id: "lista-02",
        titulo: "Promedio de N números",
        nivel: 2,
        enunciado: `
<p>Pide un número <b>N</b>, luego pide N números, guárdalos en una lista, calcula
el <b>promedio</b> y muéstralo con el formato <code>Promedio: X</code>.</p>`,
        pista: "Sumá todos con sum(lista) y dividí por len(lista). O sumá dentro del for.",
        starter: `n = int(input("¿Cuántos números? "))
numeros = []
# Tu código acá:
`,
        tests: [
          { stdin: ["3", "10", "20", "30"], expect: ["Promedio: 20"] },
          { stdin: ["2", "4", "6"], expect: ["Promedio: 5"] },
        ],
      },
      {
        id: "lista-03",
        titulo: "¿Dónde está el número?",
        nivel: 2,
        enunciado: `
<p>Tenés esta lista ya creada:</p>
<pre><code>lista = [4, 8, 2, 8, 5, 8, 1]</code></pre>
<p>Pide un número al usuario y muestra <b>todas las posiciones (índices)</b> donde
aparece, una por línea con el formato <code>Posicion: i</code>. Si no aparece,
muestra <code>No se encuentra</code>.</p>`,
        pista: "Recorré con índice: for i in range(len(lista)). Llevá una bandera de 'encontrado'.",
        starter: `lista = [4, 8, 2, 8, 5, 8, 1]
buscado = int(input("Número a buscar: "))
# Tu código acá:
`,
        tests: [
          { stdin: ["8"], expect: ["Posicion: 1", "Posicion: 3", "Posicion: 5"] },
          { stdin: ["7"], expect: ["no se encuentra"] },
          { stdin: ["4"], expect: ["Posicion: 0"] },
        ],
      },
      {
        id: "lista-04",
        titulo: "Producto punto",
        nivel: 3,
        enunciado: `
<p>Tenés dos listas (vectores) del mismo largo:</p>
<pre><code>a = [2, 9, 3, 10, 10]
b = [3, 7, 5, 1, 6]</code></pre>
<p>Calcula el <b>producto punto</b>: suma de los productos elemento a elemento
(<code>a[0]*b[0] + a[1]*b[1] + ...</code>) y muestra
<code>Producto punto: X</code>. (Para el ejemplo da 154.)</p>`,
        pista: "Acumulá en una variable: for i in range(len(a)): suma += a[i]*b[i].",
        starter: `a = [2, 9, 3, 10, 10]
b = [3, 7, 5, 1, 6]
# Tu código acá:
`,
        tests: [{ stdin: [], expect: ["Producto punto: 154"] }],
      },
      {
        id: "lista-05",
        titulo: "Contar frecuencias",
        nivel: 4,
        enunciado: `
<p>Tenés esta lista de números entre 0 y 5:</p>
<pre><code>lista = [2, 1, 2, 1, 3, 2, 2, 5, 3, 2, 3, 0, 1, 2, 3]</code></pre>
<p>Muestra, para cada número del 0 al 5, cuántas veces aparece, con el formato
<code>Numero N: veces</code> (una línea por número, incluso si aparece 0 veces).</p>`,
        pista: "for n in range(6): contá cuántas veces n está en la lista con lista.count(n).",
        starter: `lista = [2, 1, 2, 1, 3, 2, 2, 5, 3, 2, 3, 0, 1, 2, 3]
# Tu código acá:
`,
        tests: [
          {
            stdin: [],
            expect: [
              "Numero 0: 1",
              "Numero 1: 3",
              "Numero 2: 6",
              "Numero 3: 4",
              "Numero 4: 0",
              "Numero 5: 1",
            ],
          },
        ],
      },
      {
        id: "lista-06",
        titulo: "Ordenar con Bubble Sort",
        nivel: 5,
        enunciado: `
<p>Tenés esta lista desordenada:</p>
<pre><code>lista = [5, 1, 4, 2, 8]</code></pre>
<p>Ordénala de <b>menor a mayor</b> implementando vos mismo el algoritmo
<b>bubble sort</b> (¡sin usar <code>sorted()</code> ni <code>.sort()</code>!) y
muestra la lista ordenada con <code>print(lista)</code>.</p>`,
        pista: "Dos for anidados: comparás pares vecinos lista[j] y lista[j+1], si están al revés los intercambiás.",
        starter: `lista = [5, 1, 4, 2, 8]
# Tu código acá (bubble sort):
`,
        tests: [{ stdin: [], expect: ["[1, 2, 4, 5, 8]"] }],
      },
    ],
  },

  // ==========================================================================
  // MÓDULO 4 — CICLOS ANIDADOS  (Guía 05)
  // ==========================================================================
  {
    id: "anidados",
    titulo: "Ciclos anidados",
    emoji: "🔳",
    intro:
      "Un <b>ciclo anidado</b> es un ciclo dentro de otro. El ciclo externo " +
      "repite líneas; el interno repite elementos dentro de cada línea. Sirve " +
      "para dibujar patrones, tablas y recorrer dos dimensiones.",
    teoria: `
<p>Un <code>for</code> dentro de otro <code>for</code>. Por cada vuelta del ciclo
externo, el interno hace <b>todas</b> sus vueltas:</p>
<pre><code>for i in range(1, 4):       # externo: 3 filas
    for j in range(1, 6):   # interno: 5 columnas
        print("#", end="")  # end="" -> no salta de línea
    print("")               # salta a la línea siguiente</code></pre>
<p>Imprime:</p>
<pre><code>#####
#####
#####</code></pre>
<p>La clave: <code>print("algo", end="")</code> escribe <b>sin</b> saltar de línea,
y un <code>print("")</code> al final del ciclo interno cierra la fila.</p>`,
    ejercicios: [
      {
        id: "anid-01",
        titulo: "Rectángulo de #",
        nivel: 1,
        enunciado: `
<p>Pide al usuario el número de <b>filas</b> y de <b>columnas</b> y dibuja un
rectángulo de símbolos <code>#</code> de ese tamaño. Para 3 filas y 5 columnas:</p>
<pre><code>#####
#####
#####</code></pre>`,
        pista: 'Ciclo externo = filas, interno = columnas. Usá print("#", end="") y un print("") al cerrar cada fila.',
        starter: `filas = int(input("Filas: "))
columnas = int(input("Columnas: "))
# Tu código acá:
`,
        tests: [
          { stdin: ["3", "5"], expect: ["#####", "#####", "#####"] },
          { stdin: ["2", "2"], expect: ["##", "##"] },
        ],
      },
      {
        id: "anid-02",
        titulo: "Triángulo creciente",
        nivel: 2,
        enunciado: `
<p>Pide un número <b>N</b> y dibuja un triángulo donde la fila <code>i</code> tiene
<code>i</code> asteriscos. Para N = 4:</p>
<pre><code>*
**
***
****</code></pre>`,
        pista: "La fila i tiene i asteriscos: el ciclo interno debe ir de 1 a i.",
        starter: `n = int(input("N: "))
# Tu código acá:
`,
        tests: [
          { stdin: ["3"], expect: ["*", "**", "***"] },
          { stdin: ["4"], expect: ["*", "**", "***", "****"] },
        ],
      },
      {
        id: "anid-03",
        titulo: "Escalera de asteriscos",
        nivel: 2,
        enunciado: `
<p>Pide el número de <b>escalones</b> y dibújalos: el escalón <code>i</code> tiene
<code>2 × i</code> asteriscos. Para 4 escalones:</p>
<pre><code>**
****
******
********</code></pre>`,
        pista: "Para el escalón i (de 1 a escalones), imprimí 2*i asteriscos con end=''.",
        starter: `escalones = int(input("Escalones: "))
# Tu código acá:
`,
        tests: [
          { stdin: ["4"], expect: ["**", "****", "******", "********"] },
          { stdin: ["2"], expect: ["**", "****"] },
        ],
      },
      {
        id: "anid-04",
        titulo: "Patrón de números",
        nivel: 3,
        enunciado: `
<p>Pide un número <b>N</b> y muestra este patrón (la fila <code>i</code> lista los
números de 1 a <code>i</code>, separados por un espacio). Para N = 3:</p>
<pre><code>1
1 2
1 2 3</code></pre>`,
        pista: 'En la fila i, recorré j de 1 a i e imprimí print(j, end=" "). Cerrá con print("").',
        starter: `n = int(input("N: "))
# Tu código acá:
`,
        tests: [
          { stdin: ["3"], expect: ["1", "1 2", "1 2 3"] },
          { stdin: ["4"], expect: ["1", "1 2", "1 2 3", "1 2 3 4"] },
        ],
      },
      {
        id: "anid-05",
        titulo: "Tabla de f(x) = suma de k²",
        nivel: 3,
        enunciado: `
<p>Pide un valor <b>inferior</b> y uno <b>superior</b> de x. Para cada x en ese
rango (ambos incluidos), calcula <code>f(x) = 0² + 1² + ... + x²</code> y muestra
una línea <code>x f(x)</code>. Ejemplo con inferior 2 y superior 5:</p>
<pre><code>2 5
3 14
4 30
5 55</code></pre>`,
        pista: "Ciclo externo recorre x; ciclo interno suma k*k para k de 0 a x. Imprimí print(x, suma).",
        starter: `inferior = int(input("Inferior: "))
superior = int(input("Superior: "))
# Tu código acá:
`,
        tests: [
          { stdin: ["2", "5"], expect: ["2 5", "3 14", "4 30", "5 55"] },
          { stdin: ["0", "1"], expect: ["0 0", "1 1"] },
        ],
      },
      {
        id: "anid-06",
        titulo: "Suma de factoriales",
        nivel: 4,
        enunciado: `
<p>Pide un entero <b>N</b> y calcula la serie
<code>1! + 2! + 3! + ... + N!</code>. Muestra <code>Suma: X</code>.
(Para N = 3 da 1 + 2 + 6 = 9.)</p>`,
        pista: "Ciclo externo i de 1 a N; ciclo interno calcula i! multiplicando de 1 a i; acumulá esos factoriales.",
        starter: `n = int(input("N: "))
# Tu código acá:
`,
        tests: [
          { stdin: ["3"], expect: ["Suma: 9"] },
          { stdin: ["4"], expect: ["Suma: 33"] },
          { stdin: ["1"], expect: ["Suma: 1"] },
        ],
      },
    ],
  },

  // ==========================================================================
  // MÓDULO 5 — MATRICES (listas 2D)
  // ==========================================================================
  {
    id: "matrices",
    titulo: "Matrices",
    emoji: "🔢",
    intro:
      "Una <b>matriz</b> es una lista de listas (2 dimensiones): tiene filas y " +
      "columnas. Se accede a cada dato con dos índices: <code>M[i][j]</code> " +
      "(fila <code>i</code>, columna <code>j</code>).",
    teoria: `
<p>Crear y acceder:</p>
<pre><code>M = [[1, 2, 3],
     [4, 5, 6]]
print(M[0][0])   # 1   (fila 0, columna 0)
print(M[1][2])   # 6   (fila 1, columna 2)
M[0][1] = 99     # modifica un elemento</code></pre>
<p>Tamaño:</p>
<pre><code>len(M)      # 2  -> número de filas
len(M[0])   # 3  -> número de columnas de la fila 0</code></pre>
<p>Recorrer con <b>ciclos dobles</b>:</p>
<pre><code>for i in range(len(M)):
    for j in range(len(M[i])):
        print(M[i][j])</code></pre>`,
    ejercicios: [
      {
        id: "mat-01",
        titulo: "Dimensiones de la matriz",
        nivel: 1,
        enunciado: `
<p>Tenés esta matriz ya creada:</p>
<pre><code>M = [[1, 2, 3], [4, 5, 6]]</code></pre>
<p>Muestra cuántas filas y columnas tiene, con el formato:</p>
<pre><code>Filas: 2
Columnas: 3</code></pre>`,
        pista: "len(M) son las filas; len(M[0]) son las columnas de la primera fila.",
        starter: `M = [[1, 2, 3], [4, 5, 6]]
# Tu código acá:
`,
        tests: [{ stdin: [], expect: ["Filas: 2", "Columnas: 3"] }],
      },
      {
        id: "mat-02",
        titulo: "Suma de todos los elementos",
        nivel: 2,
        enunciado: `
<p>Suma <b>todos</b> los elementos de esta matriz y muestra <code>Suma: X</code>:</p>
<pre><code>M = [[1, 2], [3, 4], [5, 6]]</code></pre>
<p>(El resultado es 21.)</p>`,
        pista: "Acumulá en una variable recorriendo con dos for: suma = suma + M[i][j].",
        starter: `M = [[1, 2], [3, 4], [5, 6]]
# Tu código acá:
`,
        tests: [{ stdin: [], expect: ["Suma: 21"] }],
      },
      {
        id: "mat-03",
        titulo: "Promedio por fila",
        nivel: 2,
        enunciado: `
<p>Para esta matriz de notas, calcula el <b>promedio de cada fila</b> y muéstralo
con el formato <code>Fila i promedio: X</code> (una línea por fila):</p>
<pre><code>notas = [[7, 6, 5], [4, 5, 6], [1, 2, 3]]</code></pre>
<p>Por ejemplo, la primera fila debe mostrar <code>Fila 0 promedio: 6.0</code>.</p>`,
        pista: 'Para cada fila i (que es la lista notas[i]) usá sum(notas[i]) / len(notas[i]). Imprimí con print("Fila", i, "promedio:", promedio).',
        starter: `notas = [[7, 6, 5], [4, 5, 6], [1, 2, 3]]
# Tu código acá:
`,
        tests: [
          {
            stdin: [],
            expect: [
              "Fila 0 promedio: 6.0",
              "Fila 1 promedio: 5.0",
              "Fila 2 promedio: 2.0",
            ],
          },
        ],
      },
      {
        id: "mat-04",
        titulo: "El número mayor",
        nivel: 3,
        enunciado: `
<p>Encuentra el <b>elemento más grande</b> de esta matriz y muéstralo como
<code>Maximo: X</code>:</p>
<pre><code>M = [[3, 8, 1], [9, 2, 7]]</code></pre>`,
        pista: "Guardá un 'mayor' con el primer elemento y comparalo con cada M[i][j] recorriendo la matriz.",
        starter: `M = [[3, 8, 1], [9, 2, 7]]
# Tu código acá:
`,
        tests: [{ stdin: [], expect: ["Maximo: 9"] }],
      },
      {
        id: "mat-05",
        titulo: "Suma de la diagonal",
        nivel: 3,
        enunciado: `
<p>En esta matriz <b>cuadrada</b>, suma la <b>diagonal principal</b> (los elementos
<code>M[0][0]</code>, <code>M[1][1]</code>, <code>M[2][2]</code>) y muestra
<code>Diagonal: X</code>:</p>
<pre><code>M = [[1, 2, 3], [4, 5, 6], [7, 8, 9]]</code></pre>
<p>(La diagonal suma 1 + 5 + 9 = 15.)</p>`,
        pista: "La diagonal son los M[i][i]: un solo for con range(len(M)) y sumás M[i][i].",
        starter: `M = [[1, 2, 3], [4, 5, 6], [7, 8, 9]]
# Tu código acá:
`,
        tests: [{ stdin: [], expect: ["Diagonal: 15"] }],
      },
      {
        id: "mat-06",
        titulo: "Matriz identidad",
        nivel: 4,
        enunciado: `
<p>Pide un entero <b>N</b> y construí la <b>matriz identidad</b> de N×N (1 en la
diagonal, 0 en el resto), guardándola en una lista de listas. Muéstrala con
<code>print(M)</code>. Para N = 3:</p>
<pre><code>[[1, 0, 0], [0, 1, 0], [0, 0, 1]]</code></pre>`,
        pista: "Por cada fila i creá una lista de N ceros y poné un 1 en la posición i (fila[i] = 1); luego append a M.",
        starter: `n = int(input("N: "))
M = []
# Tu código acá:
`,
        tests: [
          { stdin: ["3"], expect: ["[[1, 0, 0], [0, 1, 0], [0, 0, 1]]"] },
          { stdin: ["2"], expect: ["[[1, 0], [0, 1]]"] },
        ],
      },
    ],
  },
];

// Expuesto globalmente para los otros scripts (sin módulos ES, todo via <script>)
window.CURRICULUM = CURRICULUM;
