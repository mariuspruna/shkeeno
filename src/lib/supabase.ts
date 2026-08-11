import { createClient } from "@supabase/supabase-js";

export type Product = {
  id: string;
  slug: string;
  created_at?: string;
  name: string;
  brand: string | null;
  origin_country: string | null;
  short_description: string;
  editorial_description: string | null;
  price_gbp: number;
  compare_at_price_gbp: number | null;
  weight_grams: number;
  category: string;
  tags: string[];
  materials: string[];
  stock_quantity: number;
  low_stock_threshold: number;
  badge: "new" | "limited" | "staff_pick" | "sale" | "low_stock" | null;
  is_featured: boolean;
  product_images: {
    id: string;
    url: string;
    alt: string;
    sort_order: number;
  }[];
};

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;
const hasSupabaseConfig = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = hasSupabaseConfig ? createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
  },
}) : null;

export async function getPublishedProducts() {
  if (!supabase) {
    return [] as Product[];
  }

  const { data, error } = await supabase
    .from("products")
    .select(
      "id, created_at, slug, name, brand, origin_country, short_description, editorial_description, price_gbp, compare_at_price_gbp, weight_grams, category, tags, materials, stock_quantity, low_stock_threshold, badge, is_featured, product_images(id,url,alt,sort_order)",
    )
    .eq("is_published", true)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return data as Product[];
}

export async function getPublishedProductBySlug(slug: string) {
  if (!supabase) {
    throw new Error(`Supabase is not configured. Cannot load product: ${slug}`);
  }

  const { data, error } = await supabase
    .from("products")
    .select(
      "id, created_at, slug, name, brand, origin_country, short_description, editorial_description, price_gbp, compare_at_price_gbp, weight_grams, category, tags, materials, stock_quantity, low_stock_threshold, badge, is_featured, product_images(id,url,alt,sort_order)",
    )
    .eq("is_published", true)
    .eq("slug", slug)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as Product;
}
