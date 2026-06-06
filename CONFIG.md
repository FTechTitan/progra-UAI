# CONFIG — Infraestructura de progra-UAI

Estado de despliegue y servicios del proyecto. Última actualización: 2026-06-05.

## 🌐 Dominios y URLs

| URL | Estado | Notas |
|-----|--------|-------|
| **https://progra-uai.pages.dev** | ✅ **Activo** (producción) | URL oficial de Cloudflare Pages. Funciona 100%. |
| **https://progra-uai.techforce.cl** | ✅ **Activo** (2026-06-05) | Custom domain. CNAME → `progra-uai.pages.dev`, proxied. Sirve con cert válido (HTTP 200). |

### Custom domain `progra-uai.techforce.cl` — configurado

Registro **CNAME** creado en la zona `techforce.cl` de Cloudflare:

```
Tipo:    CNAME
Nombre:  progra-uai
Destino: progra-uai.pages.dev
Proxy:   ✅ Proxied (naranja)
```

> Creado con `CLOUDFLARE_TECHFORCE_API_TOKEN` (token de DNS pasado en sesión).
> El dominio ya estaba registrado en el proyecto Pages; al crear el CNAME validó
> y empezó a servir con HTTP 200 / cert Google en ~1 min.

## ☁️ Cloudflare Pages

| Campo | Valor |
|-------|-------|
| Proyecto | `progra-uai` |
| Subdominio Pages | `progra-uai.pages.dev` |
| Account ID | `6a5395ca9b7e0beb96eddd1d5278f3d7` (TechForce) |
| Rama de producción | `main` |
| **Auto-deploy** | ✅ Conectado a GitHub — cada push a `main` re-publica solo |
| Tipo de build | Sitio estático, **sin build** (`build_command` y `destination_dir` vacíos) |
| Token usado | `CLOUDFLARE_TECHFORCE_PAGES_TOKEN` (en `~/.env.techforce`) |

Cada rama/PR distinta de `main` genera un **preview deployment** automático.

## 🐙 GitHub

| Campo | Valor |
|-------|-------|
| Repo | `FTechTitan/progra-UAI` |
| Cuenta `gh` | `FTechTitan` (cuenta personal de Francisco) |
| Remote | `git@github.com:FTechTitan/progra-UAI.git` |

## 🧱 Stack

- **Frontend**: HTML/CSS/JS estático, sin framework ni build.
- **Ejecución de Python**: [Pyodide](https://pyodide.org) (Python en WebAssembly), corre 100% en el navegador.
- **Editor**: CodeMirror 5 (CDN).
- **Progreso**: por ahora en `localStorage`. → *En migración a Supabase (login + progreso multi-dispositivo).*

## 🗄️ Supabase

| Campo | Valor |
|-------|-------|
| Proyecto | **Progra UAI** |
| Project ref | `bipsvhxsvfzfwzufucfg` |
| Org | `owtxxifoypdiebisgqbk` (org "Progra UAI", token CLI dedicado) |
| URL API | `https://bipsvhxsvfzfwzufucfg.supabase.co` |
| Región | East US (North Virginia) |
| Publishable key (frontend, pública por RLS) | `sb_publishable_nsfpKRfcdisP31bYOAumeg_DimCZ5tC` |
| Estado | ✅ Login + progreso funcionando (verificado end-to-end) |
| Acceso Supabase CLI | ✅ Confirmado — proyecto **LINKED** y operable desde este PC |

**Acceso del Supabase CLI** (verificado 2026-06-05): este equipo tiene el CLI
autenticado con acceso a la org `owtxxifoypdiebisgqbk` y el proyecto vinculado
(`supabase projects list` muestra **Progra UAI** como LINKED ●). El access token
**no vive en `~/.supabase/access-token`** sino en el **keyring del sistema**, por
eso un `ls` de ese archivo no lo encuentra aunque el acceso funcione. No hace falta
`supabase login` ni `SUPABASE_ACCESS_TOKEN` en este PC; el deploy de funciones y el
push de config funcionan directo.

**Auth**: email + contraseña, **sin confirmación de email** (auto-confirm), signup abierto.
Site URL → `https://progra-uai.pages.dev`.

**Tabla `public.progress`** (una fila por usuario+ejercicio):

| Columna | Tipo | |
|---------|------|--|
| `user_id` | uuid | FK a `auth.users`, on delete cascade |
| `exercise_id` | text | id del ejercicio (ej. `cond-01`) |
| `completed` | boolean | |
| `code` | text | último código del alumno |
| `updated_at` | timestamptz | trigger lo refresca |
| PK | (user_id, exercise_id) | |

**RLS**: activado. 4 políticas (`select/insert/update/delete`) restringidas a
`auth.uid() = user_id`. Verificado: escribir con otro `user_id` → 403.

**Migración**: `supabase/migrations/20260606015816_init_progress.sql`.

### Comandos útiles

```bash
# correr SQL contra el proyecto remoto (vía Management API, sin password de DB)
supabase db query --linked "select count(*) from public.progress;"

# aplicar cambios de config de auth
supabase config push --yes
```

> El progreso de invitado (localStorage) se **migra a la nube** automáticamente
> la primera vez que el alumno inicia sesión.

## 🤖 Asistente de IA (tutor de Python)

| Campo | Valor |
|-------|-------|
| Edge Function | `ask-ai` (Deno) — proxy a OpenAI |
| Modelo | `gpt-4o-mini` |
| Secreto | `OPENAI_API_KEY` (Supabase secret, **nunca** en frontend ni repo) |
| Seguridad | `verify_jwt = true` → **requiere sesión iniciada** (anónimo → 401) |
| CORS | restringido a los dominios del sitio |
| Prompt | tutor en español que da pistas y guía, no la solución completa |

El frontend (`js/assistant.js`) llama a la función con `functions.invoke("ask-ai", ...)`
mandando la pregunta + contexto del ejercicio actual (título, enunciado, código).

**Registro de preguntas**: cada consulta se guarda en `public.ai_questions`
(`user_id`, `exercise_id`, `question`, `answer`, `created_at`). La inserción la
hace la función con `service_role` (RLS activo; el alumno solo puede leer las
suyas). El panel admin usa esto para ver **quién necesita más ayuda y sobre qué**.

```bash
# re-deploy de la función tras editarla
supabase functions deploy ask-ai
# rotar la key de OpenAI
supabase secrets set OPENAI_API_KEY='sk-...'
```

> ⚠️ La API key de OpenAI usada inicialmente fue compartida en chat → **rotar**.

## 🛠 Panel de superadmin

| Campo | Valor |
|-------|-------|
| Edge Function | `admin` (Deno) — `verify_jwt = true` |
| Autorización | doble: gateway (JWT válido) + chequeo server-side de `app_metadata.role === "admin"` |
| Acceso a datos | `service_role` (inyectada por Supabase, **solo** en la función) — bypassa RLS |
| Frontend | `js/admin.js` — el botón "🛠 Admin" solo aparece si tu sesión es admin |

**Acciones**: `overview` (stats + alumnos + completados por ejercicio),
`user_detail` (progreso + código de un alumno), `reset_user` (borra su progreso),
`delete_user` (elimina la cuenta).

**Admin actual**: `fraanciscoponce@gmail.com`.

```sql
-- dar/quitar admin a un usuario (rol en app_metadata, NO en user_metadata)
update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data,'{}'::jsonb) || '{"role":"admin"}'::jsonb
where email = 'alguien@mail.com';
```

> Verificado: alumno normal → **403**; admin → ve todo. La `service_role` nunca
> sale del backend.

## 📝 Pruebas predictivas (predicción de nota)

Modo examen para estimar la nota que el alumno sacaría en la prueba real en papel,
hecho **sin tutor ni pistas**.

| Aspecto | Detalle |
|---------|---------|
| Datos | `js/exams.js` — `Prueba 2` con 3 versiones paralelas **A/B/C** (al azar) |
| Materia | ciclos, ciclos anidados, listas, matrices (4 problemas c/u) |
| Desbloqueo | solo al **completar los módulos** requeridos |
| Modo | sin tutor (se oculta), sin pistas, sin "Comprobar" por problema; timer |
| Corrección | crédito parcial = `puntos × casos_ok / casos_total` (Pyodide en el browser) |
| Nota | escala chilena **1.0–7.0 al 60%** (`logroANota`) |
| Frontend | `js/exam-ui.js` (botón "📝 Prueba" en la topbar) |

**Tabla `public.exam_results`**: `user_id`, `exam_id`, `version`, `logro`,
`nota`, `detalle` (jsonb por problema), `created_at`. RLS: el alumno **inserta y
lee solo lo suyo**, no puede editar ni borrar (historial inmutable). Verificado:
falsear `user_id` → 403.

**En el panel admin**: tarjeta "Nota predicha promedio", columna de nota por
alumno (última + mejor + intentos) y el detalle de cada prueba rendida.

> ⚠️ La corrección corre en el navegador (como todo el resto de la app). Es una
> herramienta de **autoevaluación/predicción**, no una prueba calificada oficial.

Validado: soluciones de referencia de los 12 problemas → 100% → nota 7.0.

## 🎙️ Tutor por voz (ElevenLabs Conversational AI — la "pelota")

Orbe animado que conversa por **voz en tiempo real** (escucha y responde hablando).

| Aspecto | Detalle |
|---------|---------|
| Tecnología | ElevenLabs Conversational AI (widget embebible) |
| Agente | `agent_5101ktde7saxeews5gr563y7pyfq` ("Tutor Python · progra-UAI") |
| Voz | `6Gr4AVmTax1pMJO0lHRK` (**Catalina — español chileno**, premade/biblioteca, free) · modelo `eleven_flash_v2_5` |
| LLM | `gpt-4o-mini` |
| Embed | `<elevenlabs-convai agent-id="...">` + `@elevenlabs/convai-widget-embed` (en `index.html`) |
| Posición | abajo-izquierda (la "pelota") · orbe azul/púrpura |
| Materia | mismas restricciones que el tutor de texto (solo lo visto en el curso) |

**Seguridad**: el widget usa **solo el `agent-id` (público)**. La **API key de
ElevenLabs NUNCA va al frontend ni al repo** — se usó una sola vez para crear y
configurar el agente. Allowlist de orígenes seteada a los dominios del sitio.

```bash
# gestionar el agente (requiere la API key vía header xi-api-key, NO en el repo)
curl https://api.elevenlabs.io/v1/convai/agents/agent_5101ktde7saxeews5gr563y7pyfq \
  -H "xi-api-key: $ELEVENLABS_KEY"
```

> ⚠️ La API key de ElevenLabs se compartió en chat → **rotar** en elevenlabs.io.
> Cuenta **free** (incluye minutos limitados de ConvAI).

## 🚀 Flujo de actualización

```bash
# editar archivos (ej. js/data.js para nuevos ejercicios)
git add -A && git commit -m "feat: ..." && git push
# ~1 min después se actualiza solo en progra-uai.pages.dev
```
