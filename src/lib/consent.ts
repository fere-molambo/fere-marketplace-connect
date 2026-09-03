import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type LegalDocument = "cgu" | "privacy";

/** Documents consultables : le reglement cookies s'affiche mais ne se signe pas. */
export type LegalDocKey = LegalDocument | "cookies";

export interface ConsentState {
  cgu_version: string;
  privacy_version: string;
  cgu_accepted: boolean;
  privacy_accepted: boolean;
}

export interface LegalTexts {
  cgu: string;
  privacy: string;
  cookies: string;
}

/**
 * integrations/supabase/types.ts est genere automatiquement et ne connait pas
 * encore user_consents ni les RPC de consentement. Cast local en attendant la
 * prochaine regeneration des types.
 */
const db = supabase as unknown as SupabaseClient;

/**
 * Etat du consentement de l'utilisateur connecte compare aux versions en
 * vigueur. Retourne null en cas d'erreur : on laisse passer plutot que de
 * bloquer le site sur un probleme reseau.
 */
export async function fetchConsentState(): Promise<ConsentState | null> {
  const { data, error } = await db.rpc("get_consent_state");
  if (error) {
    console.error("[consent] get_consent_state:", error.message);
    return null;
  }
  return (data as ConsentState) ?? null;
}

export function isConsentComplete(state: ConsentState | null): boolean {
  if (!state) return true;
  return state.cgu_accepted && state.privacy_accepted;
}

/** Les versions sont lues en base par la RPC, le client ne peut pas les forcer. */
export async function acceptConsents(): Promise<boolean> {
  const { error } = await db.rpc("accept_current_consents", {
    p_source: "web",
    p_app_version: null,
  });
  if (error) {
    console.error("[consent] accept_current_consents:", error.message);
    return false;
  }
  return true;
}

/** Textes affiches dans les modales : meme source que l'application mobile. */
export async function fetchLegalTexts(): Promise<LegalTexts> {
  const { data, error } = await db
    .from("platform_settings")
    .select("cgu, privacy_policy, cookies")
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[consent] fetchLegalTexts:", error.message);
  }

  return {
    cgu: data?.cgu || "",
    privacy: data?.privacy_policy || "",
    cookies: data?.cookies || "",
  };
}

/** Consentement recueilli avant que la session existe (formulaire d'inscription). */
export function buildSignupConsents() {
  return {
    cgu: true,
    privacy: true,
    source: "web" as const,
    app_version: null,
    accepted_at: new Date().toISOString(),
  };
}
