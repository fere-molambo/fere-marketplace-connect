import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { user_id, email, amount, callback_url } = await req.json();

    console.log('[purchase-tokens] Request received:', { user_id, email, amount, callback_url });

    // Validate inputs
    if (!user_id || !email || !amount) {
      throw new Error("Paramètres manquants: user_id, email, amount requis");
    }

    if (amount < 1000) {
      throw new Error("Le montant minimum est de 1 000 FCFA");
    }

    const paystackSecretKey = Deno.env.get('PAYSTACK_SECRET_KEY');
    if (!paystackSecretKey) {
      throw new Error("Clé Paystack non configurée");
    }

    // Generate unique reference
    const reference = `TOK-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    // Use callback URL from frontend (more reliable) or fallback to default
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const defaultCallbackUrl = `${supabaseUrl?.replace('.supabase.co', '.lovable.app') || 'https://jajfuajmkjulujnwfqen.lovable.app'}/payment/callback`;
    const callbackUrl = callback_url || defaultCallbackUrl;

    console.log('[purchase-tokens] Initializing Paystack payment:', { reference, amount, callbackUrl });

    // Initialize Paystack transaction
    const paystackResponse = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${paystackSecretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        amount: amount * 100, // Convert to kobo/pesewas
        currency: 'XOF',
        reference,
        callback_url: callbackUrl,
        metadata: {
          type: 'tokens',
          user_id,
          amount,
          custom_fields: [
            {
              display_name: "Type",
              variable_name: "payment_type",
              value: "tokens"
            },
            {
              display_name: "Montant Tokens",
              variable_name: "token_amount",
              value: amount.toString()
            }
          ]
        }
      }),
    });

    const paystackData = await paystackResponse.json();

    console.log('[purchase-tokens] Paystack response:', paystackData);

    if (!paystackData.status) {
      throw new Error(paystackData.message || "Erreur Paystack");
    }

    // Create payment transaction record
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { error: insertError } = await supabaseClient
      .from('payment_transactions')
      .insert({
        user_id,
        amount,
        currency: 'XOF',
        reference,
        payment_type: 'tokens',
        status: 'pending',
        metadata: { type: 'tokens' }
      });

    if (insertError) {
      console.error('[purchase-tokens] Error creating transaction:', insertError);
      // Continue anyway - payment can still work
    }

    return new Response(
      JSON.stringify({
        success: true,
        authorization_url: paystackData.data.authorization_url,
        access_code: paystackData.data.access_code,
        reference: paystackData.data.reference,
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
