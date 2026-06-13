-- Second (cross-check) judge report for the double-judge eval pipeline.
-- Stores the independent secondary judge's verdict and its agreement with the
-- canonical primary judge. Nullable: single-judge runs leave it empty.

alter table public.eval_results
  add column if not exists cross_judge jsonb;
