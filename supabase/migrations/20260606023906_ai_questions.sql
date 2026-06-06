-- ============================================================================
--  Registro de preguntas al tutor de IA
--  Una fila por cada consulta que un alumno le hace al asistente. Sirve para
--  que el profe vea quién necesita más ayuda y sobre qué temas.
-- ============================================================================

create table if not exists public.ai_questions (
  id          bigint generated always as identity primary key,
  user_id     uuid        not null references auth.users (id) on delete cascade,
  exercise_id text,
  question    text        not null,
  answer      text,
  created_at  timestamptz not null default now()
);

create index if not exists ai_questions_user_idx on public.ai_questions (user_id, created_at desc);
create index if not exists ai_questions_created_idx on public.ai_questions (created_at desc);

alter table public.ai_questions enable row level security;

-- El alumno puede ver SUS propias preguntas (para un futuro "mi historial").
-- La inserción la hace la Edge Function ask-ai con service_role (bypassa RLS),
-- así nadie puede forjar filas directamente desde el cliente.
create policy "ai_questions_select_own"
  on public.ai_questions for select
  to authenticated
  using (auth.uid() = user_id);
