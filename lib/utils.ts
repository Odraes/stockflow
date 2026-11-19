import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Kept for the starter pages that still import it; new code should import
// `hasSupabaseEnv` from "@/lib/supabase/env" directly.
export { hasSupabaseEnv as hasEnvVars } from "./supabase/env";
