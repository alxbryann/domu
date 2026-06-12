-- Call transcripts and eval results for Domu voice agent QA

create table if not exists public.calls (
  id text primary key,
  source text not null check (source in ('domu', 'vapi')),
  status text not null check (status in ('live', 'evaluating', 'completed')),
  metadata jsonb not null default '{}'::jsonb,
  turns jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.eval_results (
  id text primary key,
  transcript_id text not null references public.calls (id) on delete cascade,
  evaluated_at timestamptz not null,
  judge_version text not null,
  criteria_profile_id text,
  criteria jsonb not null default '[]'::jsonb,
  rule_violations jsonb not null default '[]'::jsonb,
  judge_disagreement boolean not null default false,
  weighted_score numeric(4, 1) not null,
  overall_pass boolean not null,
  compliance_pass boolean not null,
  summary text not null default '',
  flagged_quotes jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (transcript_id)
);

create index if not exists calls_status_idx on public.calls (status);
create index if not exists calls_updated_at_idx on public.calls (updated_at desc);
create index if not exists eval_results_evaluated_at_idx on public.eval_results (evaluated_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists calls_set_updated_at on public.calls;
create trigger calls_set_updated_at
before update on public.calls
for each row execute function public.set_updated_at();

drop trigger if exists eval_results_set_updated_at on public.eval_results;
create trigger eval_results_set_updated_at
before update on public.eval_results
for each row execute function public.set_updated_at();

alter table public.calls enable row level security;
alter table public.eval_results enable row level security;

-- Server uses service_role key; block anon/authenticated direct access by default.
revoke all on table public.calls from anon, authenticated;
revoke all on table public.eval_results from anon, authenticated;
