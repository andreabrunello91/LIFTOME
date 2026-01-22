import { supabase } from "@/integrations/supabase/client";

type MinimalUser = {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, any> | null;
};

/**
 * Ensures the current authenticated user has a row in `profiles`.
 * This is required so other users can see public data (name/photo) via the secure RPC functions.
 */
export async function ensureProfileForUser(user: MinimalUser) {
  try {
    const meta = user.user_metadata ?? {};
    const fullName: string | null =
      meta.full_name ||
      meta.name ||
      (user.email ? user.email.split("@")[0] : null) ||
      null;

    const avatarUrl: string | null = meta.avatar_url || null;

    const { error } = await supabase
      .from("profiles")
      .upsert(
        {
          user_id: user.id,
          full_name: fullName,
          avatar_url: avatarUrl,
        },
        { onConflict: "user_id" }
      );

    if (error) {
      console.error("ensureProfileForUser error:", error);
    }
  } catch (e) {
    console.error("ensureProfileForUser unexpected error:", e);
  }
}
