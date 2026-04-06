import { FunctionsHttpError, FunctionsRelayError, FunctionsFetchError } from "@supabase/supabase-js";

/**
 * Parse a Supabase Edge Function error to extract the real backend message.
 * 
 * When an edge function returns a non-2xx status, supabase-js wraps it in a
 * FunctionsHttpError whose `.message` is just "Edge Function returned a non-2xx status code".
 * The actual JSON body is accessible via `error.context.json()`.
 */
export async function parseFunctionError(error: unknown): Promise<string> {
  if (error instanceof FunctionsHttpError) {
    try {
      const payload = await error.context.json();
      // Build a user-friendly message from the backend response
      if (payload.remaining_seconds) {
        return `${payload.error || payload.message || "Compte temporairement bloqué"}. Réessayez dans ${Math.ceil(payload.remaining_seconds / 60)} minute(s).`;
      }
      if (payload.support_phone || payload.support_email) {
        const contact = payload.support_phone || payload.support_email;
        return `${payload.error || payload.message || "Erreur"}. Contactez le support : ${contact}`;
      }
      return payload.error || payload.message || "Erreur du serveur";
    } catch {
      return "Erreur du serveur (réponse illisible)";
    }
  }

  if (error instanceof FunctionsRelayError) {
    return "Erreur de connexion au serveur. Vérifiez votre connexion internet.";
  }

  if (error instanceof FunctionsFetchError) {
    return "Impossible de contacter le serveur. Vérifiez votre connexion internet.";
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Une erreur inattendue est survenue";
}

/**
 * Invoke a Supabase edge function and handle errors uniformly.
 * Returns the response data on success, throws a user-friendly error string on failure.
 */
export async function invokeFunction(
  supabase: { functions: { invoke: (name: string, options: any) => Promise<any> } },
  functionName: string,
  body: Record<string, unknown>
): Promise<any> {
  const { data, error } = await supabase.functions.invoke(functionName, { body });

  if (error) {
    const message = await parseFunctionError(error);
    throw new Error(message);
  }

  if (data && !data.success) {
    throw new Error(data.error || "Erreur inattendue");
  }

  return data;
}
