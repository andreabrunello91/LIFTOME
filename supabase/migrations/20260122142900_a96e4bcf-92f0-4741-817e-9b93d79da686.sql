-- Drop and recreate get_public_profile to include location coordinates
DROP FUNCTION IF EXISTS public.get_public_profile(uuid);

CREATE FUNCTION public.get_public_profile(profile_user_id uuid)
 RETURNS TABLE(user_id uuid, full_name text, avatar_url text, rating numeric, total_reviews integer, is_kyc_verified boolean, is_available boolean, bio text, skills text[], location_lat numeric, location_lng numeric)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT 
    p.user_id,
    p.full_name,
    p.avatar_url,
    p.rating,
    p.total_reviews,
    p.is_kyc_verified,
    p.is_available,
    p.bio,
    p.skills,
    p.location_lat,
    p.location_lng
  FROM public.profiles p
  WHERE p.user_id = profile_user_id;
$function$;