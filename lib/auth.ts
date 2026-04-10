import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function requireUser() {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.getClaims();

  const userId = data?.claims?.sub;

  if (error || !userId) {
    redirect("/login");
  }

  return { id: userId };
}
