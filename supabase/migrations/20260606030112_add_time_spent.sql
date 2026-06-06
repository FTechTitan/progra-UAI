-- ============================================================================
--  Tiempo dedicado por alumno y ejercicio (segundos activos acumulados).
--  El frontend manda un "heartbeat" mientras el alumno está activo en un
--  ejercicio; acá se acumula. El panel admin lo usa para mostrar horas dedicadas.
-- ============================================================================

alter table public.progress
  add column if not exists time_spent_seconds integer not null default 0;

-- RPC para sumar tiempo activo al ejercicio del usuario AUTENTICADO.
-- SECURITY DEFINER + auth.uid() garantiza que cada quien solo suma a su propia
-- fila (nunca puede falsear user_id). Valida el rango para evitar abuso.
create or replace function public.add_time_spent(p_exercise_id text, p_seconds integer)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_seconds is null or p_seconds <= 0 or p_seconds > 3600 then
    return; -- ignora valores inválidos o sospechosos (más de 1h en un flush)
  end if;

  insert into public.progress (user_id, exercise_id, time_spent_seconds)
  values (auth.uid(), p_exercise_id, p_seconds)
  on conflict (user_id, exercise_id)
  do update set time_spent_seconds = public.progress.time_spent_seconds + excluded.time_spent_seconds;
end;
$$;

-- Solo usuarios autenticados pueden llamarla (no anon, no public).
revoke all on function public.add_time_spent(text, integer) from public;
revoke all on function public.add_time_spent(text, integer) from anon;
grant execute on function public.add_time_spent(text, integer) to authenticated;
