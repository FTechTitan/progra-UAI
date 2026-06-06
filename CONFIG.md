# CONFIG — Infraestructura de progra-UAI

Estado de despliegue y servicios del proyecto. Última actualización: 2026-06-05.

## 🌐 Dominios y URLs

| URL | Estado | Notas |
|-----|--------|-------|
| **https://progra-uai.pages.dev** | ✅ **Activo** (producción) | URL oficial de Cloudflare Pages. Funciona 100%. |
| https://progra-uai.techforce.cl | ⏳ **Pendiente** | Dominio registrado en el proyecto Pages, falta el CNAME en DNS para activarlo. |

### Pendiente para activar `progra-uai.techforce.cl`

Falta crear el registro **CNAME** en la zona `techforce.cl` de Cloudflare:

```
Tipo:    CNAME
Nombre:  progra-uai
Destino: progra-uai.pages.dev
Proxy:   ✅ Proxied (naranja)
```

> Bloqueo actual: no hay token de DNS de Cloudflare (`CLOUDFLARE_TECHFORCE_API_TOKEN`)
> en `~/.env.techforce` y el Belt no era alcanzable (Tailscale detenido). El dominio
> ya está registrado en Pages (`status: pending`, validación por HTTP); en cuanto exista
> el CNAME, valida y queda activo solo.

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

## 🚀 Flujo de actualización

```bash
# editar archivos (ej. js/data.js para nuevos ejercicios)
git add -A && git commit -m "feat: ..." && git push
# ~1 min después se actualiza solo en progra-uai.pages.dev
```
