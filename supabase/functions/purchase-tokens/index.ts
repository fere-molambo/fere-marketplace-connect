import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { user_id, email, amount, callback_url } = await req.json();

    console.log('[purchase-tokens] Request received:', { user_id, email, amount });

    if (!user_id || !email || !amount) {
      throw new Error("Paramètres manquants: user_id, email, amount requis");
    }

    if (amount < 1000) {
      throw new Error("Le montant minimum est de 1 000 FCFA");
    }

    // Use Orange Money via the orange-money-payment function
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    // Get user's auth token from the request
    const authHeader = req.headers.get('Authorization');

    // Call orange-money-payment function directly
    const omResponse = await fetch(`${supabaseUrl}/functions/v1/orange-money-payment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader || `Bearer ${supabaseAnonKey}`,
        'apikey': supabaseAnonKey,
      },
      body: JSON.stringify({
        action: 'initialize',
        amount,
        email,
        payment_type: 'tokens',
        metadata: { type: 'tokens', user_id, amount },
        return_url: callback_url || `${supabaseUrl.replace('.supabase.co', '.lovable.app')}/payment/callback`,
        cancel_url: callback_url ? new URL(callback_url).origin + '/dashboard/transactions' : undefined,
      }),
    });

    const omData = await omResponse.json();
    console.log('[purchase-tokens] Orange Money response:', omData);

    if (!omData.success) {
      throw new Error(omData.error || "Erreur d'initialisation du paiement Orange Money");
    }

    return new Response(
      JSON.stringify({
        success: true,
        payment_url: omData.payment_url,
        order_id: omData.order_id,
        pay_token: omData.pay_token,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error: any) {
    console.error('[purchase-tokens] Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});