
ALTER TABLE public.comments ALTER COLUMN author_id DROP NOT NULL;
ALTER TABLE public.comments ADD COLUMN IF NOT EXISTS guest_name text;

DROP POLICY IF EXISTS "Auth users insert comments" ON public.comments;

CREATE POLICY "Anyone can insert comments"
ON public.comments
FOR INSERT
TO public
WITH CHECK (
  (auth.uid() IS NULL AND author_id IS NULL)
  OR (auth.uid() IS NOT NULL AND author_id = auth.uid())
);
