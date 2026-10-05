import { supabase } from "./supabaseClient";

export async function fetchMyProfile(userId) {
  const { data, error } = await supabase
    .from("profiles")
    .select("first_name, last_name, phone, address, email")
    .eq("id", userId)
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function updateMyProfile(userId, updates) {
  const { data, error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", userId)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}
