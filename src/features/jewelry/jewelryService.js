import { supabase } from "../../services/supabase";

const BUCKET = "jewelry-images";

export async function listPiercingTypes() {
  const { data, error } = await supabase.from("piercing_types").select("id, name").order("name");
  if (error) throw error;
  return data;
}

// Database rules (RLS) already hide inactive items from visitors, but admins can read everything,
// including when they browse the public site while logged in. Public pages pass onlyActive: true
// so a hidden piece never shows to anyone there. The admin page leaves it off to see all items.
export async function listJewelry({ search, material, style, maxPrice, piercingTypeId, inStockOnly, onlyActive = false } = {}) {
  const byPlacement = Boolean(piercingTypeId);
  let q = supabase
    .from("jewelry")
    .select(
      byPlacement
        ? "*, jewelry_compatibility!inner(piercing_type_id, approved)"
        : "*, jewelry_compatibility(piercing_type_id, approved)"
    )
    .order("created_at", { ascending: false });

  if (byPlacement) {
    q = q.eq("jewelry_compatibility.piercing_type_id", piercingTypeId).eq("jewelry_compatibility.approved", true);
  }
  if (search?.trim() && /[^\s,()%._:*\\"'`]/.test(search)) {
    // Characters with a special meaning inside a PostgREST filter string are replaced by spaces,
    // so typed text can never add its own conditions to the query.
    const safe = search.trim().replace(/[,()%._:*\\"'`]/g, " ").replace(/\s+/g, " ").trim().slice(0, 80);
    q = q.or(`name.ilike.%${safe}%,description.ilike.%${safe}%`);
  }
  if (onlyActive) q = q.eq("is_active", true);
  if (material) q = q.eq("material", material);
  if (style) q = q.eq("style", style);
  if (maxPrice != null && maxPrice !== "") q = q.lte("price", Number(maxPrice));
  if (inStockOnly) q = q.gt("stock", 0);

  const { data, error } = await q;
  if (error) throw error;
  return data;
}

export async function getJewelry(id, { onlyActive = false } = {}) {
  let q = supabase
    .from("jewelry")
    .select("*, jewelry_compatibility(piercing_type_id, approved, piercing_types(name))")
    .eq("id", id);
  if (onlyActive) q = q.eq("is_active", true);
  const { data, error } = await q.single();
  if (error) throw error;
  return data;
}

/* ---------------- admin only (RLS rejects everyone else) ---------------- */

export async function createJewelry(item) {
  const { data, error } = await supabase.from("jewelry").insert(item).select().single();
  if (error) throw error;
  return data;
}

export async function updateJewelry(id, changes) {
  const { data, error } = await supabase.from("jewelry").update(changes).eq("id", id).select().single();
  if (error) throw error;
  return data;
}

// Prefer hiding over deleting so old records keep working.
export const setJewelryActive = (id, isActive) => updateJewelry(id, { is_active: isActive });

// Replace the approved placements for one item.
// Safe order: add/keep the wanted ones FIRST, then remove the rest. If something fails halfway,
// the item keeps its placements instead of ending up with none (the recommender filters on them).
export async function setCompatibility(jewelryId, piercingTypeIds) {
  if (piercingTypeIds.length) {
    const rows = piercingTypeIds.map((piercing_type_id) => ({
      jewelry_id: jewelryId,
      piercing_type_id,
      approved: true,
    }));
    const { error } = await supabase
      .from("jewelry_compatibility")
      .upsert(rows, { onConflict: "jewelry_id,piercing_type_id" });
    if (error) throw error;
  }
  let del = supabase.from("jewelry_compatibility").delete().eq("jewelry_id", jewelryId);
  if (piercingTypeIds.length) del = del.not("piercing_type_id", "in", `(${piercingTypeIds.join(",")})`);
  const { error: delErr } = await del;
  if (delErr) throw delErr;
}

// Returns the public URL to store in jewelry.image_url
export async function uploadJewelryImage(file) {
  // pick the extension from the verified MIME type, not the filename (names may have none)
  const EXT = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif" };
  const ext = EXT[file.type];
  if (!ext) throw new Error("Please upload a JPG, PNG, WebP or GIF image.");
  const path = `${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type });
  if (error) throw error;
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}
