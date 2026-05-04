ALTER TABLE public.comments DROP CONSTRAINT IF EXISTS comments_entry_id_fkey;
ALTER TABLE public.analysis_word_hits DROP CONSTRAINT IF EXISTS analysis_word_hits_entry_id_fkey;
ALTER TABLE public.comments ALTER COLUMN entry_id TYPE text USING entry_id::text;
ALTER TABLE public.analysis_word_hits ALTER COLUMN entry_id TYPE text USING entry_id::text;
CREATE INDEX IF NOT EXISTS comments_entry_id_idx ON public.comments(entry_id);
CREATE INDEX IF NOT EXISTS hits_entry_id_idx ON public.analysis_word_hits(entry_id);