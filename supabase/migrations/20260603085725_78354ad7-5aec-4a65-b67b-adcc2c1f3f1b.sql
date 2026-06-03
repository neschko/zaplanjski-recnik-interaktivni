
-- Attach triggers to auth.users (were missing)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

DROP TRIGGER IF EXISTS on_auth_user_created_grant_admin ON auth.users;
CREATE TRIGGER on_auth_user_created_grant_admin
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.grant_admin_to_special_email();

-- Backfill profiles for any auth.users that don't have one
INSERT INTO public.profiles (id, display_name)
SELECT u.id,
       COALESCE(
         u.raw_user_meta_data->>'display_name',
         split_part(u.email, '@', 1)
       )
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL;
