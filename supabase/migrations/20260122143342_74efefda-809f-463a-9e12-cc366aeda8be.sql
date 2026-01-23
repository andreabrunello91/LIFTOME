-- Store real-time lifter position on the task itself (client can read their tasks; lifter can update accepted tasks)
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS lifter_location_lat numeric,
  ADD COLUMN IF NOT EXISTS lifter_location_lng numeric,
  ADD COLUMN IF NOT EXISTS lifter_location_updated_at timestamp with time zone;

CREATE INDEX IF NOT EXISTS idx_tasks_lifter_location_updated_at
  ON public.tasks (lifter_location_updated_at DESC);