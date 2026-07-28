-- Perfil nutricional: antropometría, actividad, objetivo y overrides manuales.
alter table public.profiles
  add column if not exists weight_kg numeric(5, 1),
  add column if not exists height_cm numeric(5, 1),
  add column if not exists age_years integer,
  add column if not exists biological_sex text,
  add column if not exists activity_level text,
  add column if not exists nutrition_goal text,
  add column if not exists calorie_goal_override integer,
  add column if not exists protein_goal_override integer;

alter table public.profiles
  drop constraint if exists profiles_biological_sex_check;
alter table public.profiles
  add constraint profiles_biological_sex_check
  check (
    biological_sex is null
    or biological_sex in ('female', 'male')
  );

alter table public.profiles
  drop constraint if exists profiles_activity_level_check;
alter table public.profiles
  add constraint profiles_activity_level_check
  check (
    activity_level is null
    or activity_level in (
      'sedentary',
      'light',
      'moderate',
      'active',
      'very_active'
    )
  );

alter table public.profiles
  drop constraint if exists profiles_nutrition_goal_check;
alter table public.profiles
  add constraint profiles_nutrition_goal_check
  check (
    nutrition_goal is null
    or nutrition_goal in ('deficit', 'maintenance', 'surplus')
  );

alter table public.profiles
  drop constraint if exists profiles_age_years_check;
alter table public.profiles
  add constraint profiles_age_years_check
  check (age_years is null or (age_years >= 14 and age_years <= 100));

alter table public.profiles
  drop constraint if exists profiles_weight_kg_check;
alter table public.profiles
  add constraint profiles_weight_kg_check
  check (weight_kg is null or (weight_kg >= 30 and weight_kg <= 300));

alter table public.profiles
  drop constraint if exists profiles_height_cm_check;
alter table public.profiles
  add constraint profiles_height_cm_check
  check (height_cm is null or (height_cm >= 120 and height_cm <= 230));

alter table public.profiles
  drop constraint if exists profiles_calorie_goal_override_check;
alter table public.profiles
  add constraint profiles_calorie_goal_override_check
  check (
    calorie_goal_override is null
    or (calorie_goal_override >= 1000 and calorie_goal_override <= 5000)
  );

alter table public.profiles
  drop constraint if exists profiles_protein_goal_override_check;
alter table public.profiles
  add constraint profiles_protein_goal_override_check
  check (
    protein_goal_override is null
    or (protein_goal_override >= 30 and protein_goal_override <= 300)
  );

comment on column public.profiles.weight_kg is 'Peso corporal en kg para BMR/TDEE.';
comment on column public.profiles.height_cm is 'Estatura en cm para BMR/TDEE.';
comment on column public.profiles.age_years is 'Edad en años para Mifflin-St Jeor.';
comment on column public.profiles.biological_sex is 'Sexo biológico (female|male) para Mifflin-St Jeor.';
comment on column public.profiles.activity_level is 'Factor de actividad para TDEE.';
comment on column public.profiles.nutrition_goal is 'Meta: deficit|maintenance|surplus.';
comment on column public.profiles.calorie_goal_override is 'Meta kcal manual (opcional).';
comment on column public.profiles.protein_goal_override is 'Meta proteína g manual (opcional).';
