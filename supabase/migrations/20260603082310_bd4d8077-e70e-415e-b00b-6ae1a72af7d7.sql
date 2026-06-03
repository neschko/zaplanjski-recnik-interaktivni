-- 1) Restrict user_roles SELECT
DROP POLICY IF EXISTS "Roles are viewable by everyone" ON public.user_roles;

CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Admins can view all roles"
ON public.user_roles
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- 2) Restrict analyses SELECT — keep guest (owner_id IS NULL) public, owner-only otherwise
DROP POLICY IF EXISTS "Analyses are publicly viewable" ON public.analyses;

CREATE POLICY "Analyses visible to owner or guest"
ON public.analyses
FOR SELECT
USING (
  owner_id IS NULL
  OR owner_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin')
);