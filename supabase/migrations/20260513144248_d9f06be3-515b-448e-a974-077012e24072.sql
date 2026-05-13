
CREATE TABLE public.osnovni_corrections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id text NOT NULL,
  field text NOT NULL CHECK (field IN ('word','definition')),
  original text NOT NULL,
  corrected text NOT NULL,
  reason text,
  confidence numeric,
  approved_by uuid NOT NULL,
  approved_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(entry_id, field)
);

ALTER TABLE public.osnovni_corrections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Corrections are publicly viewable"
  ON public.osnovni_corrections FOR SELECT USING (true);

CREATE POLICY "Admins insert corrections"
  ON public.osnovni_corrections FOR INSERT
  WITH CHECK (has_role(auth.uid(),'admin') AND approved_by = auth.uid());

CREATE POLICY "Admins update corrections"
  ON public.osnovni_corrections FOR UPDATE
  USING (has_role(auth.uid(),'admin'));

CREATE POLICY "Admins delete corrections"
  ON public.osnovni_corrections FOR DELETE
  USING (has_role(auth.uid(),'admin'));

CREATE TABLE public.osnovni_review_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id text NOT NULL UNIQUE,
  scanned_at timestamptz NOT NULL DEFAULT now(),
  suggestions_count int NOT NULL DEFAULT 0
);

ALTER TABLE public.osnovni_review_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read progress"
  ON public.osnovni_review_progress FOR SELECT
  USING (has_role(auth.uid(),'admin'));

CREATE POLICY "Admins insert progress"
  ON public.osnovni_review_progress FOR INSERT
  WITH CHECK (has_role(auth.uid(),'admin'));

CREATE POLICY "Admins update progress"
  ON public.osnovni_review_progress FOR UPDATE
  USING (has_role(auth.uid(),'admin'));

CREATE POLICY "Admins delete progress"
  ON public.osnovni_review_progress FOR DELETE
  USING (has_role(auth.uid(),'admin'));

CREATE INDEX idx_osnovni_corrections_entry_id ON public.osnovni_corrections(entry_id);
