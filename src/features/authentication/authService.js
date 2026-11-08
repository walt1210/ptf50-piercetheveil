import { supabase } from "../../services/supabase";

// Only the shop admin signs in. Customers book as guests (no accounts, no sign-up).
// Admin accounts are created in the Supabase dashboard (see README > Admin accounts).

export async function signIn({ email, password }) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getProfile(userId) {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, phone, role")
    .eq("id", userId)
    .single();
  if (error) throw error;
  return data;
}
