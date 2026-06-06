-- ============================================================================
--  Progreso de alumnos — una fila por (usuario, ejercicio)
--  Guarda si el ejercicio está completado y el último código escrito.
--  Protegido con RLS: cada usuario solo ve y modifica su propio progreso.
-- ============================================================================

create table if not exists public.progress (
  user_id     uuid        not null references auth.users (id) on delete cascade,
  exercise_id text        not null,
  completed   boolean     not null default false,
  code        text,
  updated_at  timestamptz not null default now(),
  primary key (user_id, exercise_id)
);

alter table public.progress enable row level security;

-- Políticas: el usuario autenticado solo accede a sus propias filas.
create policy "progress_select_own"
  on public.progress for select
  to authenticated
  using (auth.uid() = user_id);

create policy "progress_insert_own"
  on public.progress for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "progress_update_own"
  on public.progress for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "progress_delete_own"
  on public.progress for delete
  to authenticated
  using (auth.uid() = user_id);

-- Mantiene updated_at fresco en cada modificación.
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger progress_touch_updated_at
  before update on public.progress
  for each row execute function public.touch_updated_at();
