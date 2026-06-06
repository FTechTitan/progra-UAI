-- ============================================================================
--  Resultados de pruebas predictivas
--  Una fila por intento de prueba. Guarda la versión rendida, el % de logro,
--  la nota predicha (escala chilena 1.0–7.0 al 60%) y el detalle por problema.
-- ============================================================================

create table if not exists public.exam_results (
  id          bigint generated always as identity primary key,
  user_id     uuid         not null references auth.users (id) on delete cascade,
  exam_id     text         not null,
  version     text         not null,
  logro       numeric(5,2) not null,
  nota        numeric(3,1) not null,
  detalle     jsonb,
  created_at  timestamptz  not null default now()
);

create index if not exists exam_results_user_idx on public.exam_results (user_id, created_at desc);

alter table public.exam_results enable row level security;

-- El alumno puede ver e insertar SUS propios resultados. No puede editarlos ni
-- borrarlos (historial inmutable). El admin lee todo vía la función `admin`.
create policy "exam_results_select_own"
  on public.exam_results for select
  to authenticated
  using (auth.uid() = user_id);

create policy "exam_results_insert_own"
  on public.exam_results for insert
  to authenticated
  with check (auth.uid() = user_id);
