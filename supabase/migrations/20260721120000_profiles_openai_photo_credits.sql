-- Cupo de fotos OpenAI: testers reciben 1; el resto permanece en 0.
alter table public.profiles
  add column if not exists openai_photo_credits integer not null default 0;

comment on column public.profiles.openai_photo_credits is
  'Generaciones de foto OpenAI restantes. Testers: 1 al activar. Usuarios normales: 0.';

-- Testers ya existentes: 1 crédito si aún no tienen.
update public.profiles
set openai_photo_credits = 1
where is_tester = true
  and openai_photo_credits < 1;

-- Administradora Sandra: siempre tester con al menos 1 crédito.
update public.profiles p
set
  is_tester = true,
  openai_photo_credits = greatest(coalesce(p.openai_photo_credits, 0), 1)
from auth.users u
where p.id = u.id
  and lower(u.email) = lower('sandralu317@hotmail.com');
