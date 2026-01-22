-- Drop the existing overly permissive SELECT policy
DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON public.profiles;

-- Create policy for users to view their OWN full profile
CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = user_id);

-- Create a security definer function to get public profile info for other users
-- This returns only non-sensitive data: name, avatar, rating, total_reviews
CREATE OR REPLACE FUNCTION public.get_public_profile(profile_user_id uuid)
RETURNS TABLE (
  user_id uuid,
  full_name text,
  avatar_url text,
  rating numeric,
  total_reviews integer,
  is_kyc_verified boolean,
  is_available boolean,
  bio text,
  skills text[]
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    p.user_id,
    p.full_name,
    p.avatar_url,
    p.rating,
    p.total_reviews,
    p.is_kyc_verified,
    p.is_available,
    p.bio,
    p.skills
  FROM public.profiles p
  WHERE p.user_id = profile_user_id;
$$;

-- Create a function to get multiple public profiles (for task listings)
CREATE OR REPLACE FUNCTION public.get_public_profiles(profile_user_ids uuid[])
RETURNS TABLE (
  user_id uuid,
  full_name text,
  avatar_url text,
  rating numeric,
  total_reviews integer,
  is_kyc_verified boolean,
  is_available boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    p.user_id,
    p.full_name,
    p.avatar_url,
    p.rating,
    p.total_reviews,
    p.is_kyc_verified,
    p.is_available
  FROM public.profiles p
  WHERE p.user_id = ANY(profile_user_ids);
$$;