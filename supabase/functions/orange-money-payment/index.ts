import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ORANGE_API_BASE = 'https://api.orange.com';

// Cache the access token (valid ~90 days)
let cachedToken: { token: string; expiresAt: number } | null = null;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    console.log('[orange-money] Request:', JSON.stringify(body));

    const { action } = body;

    if (action === 'get_token') {
      return await handleGetToken();
    } else if (action === 'initialize') {
      return await handleInitialize(req, supabaseClient, body);
    } else if (action === 'verify') {
      return await handleVerify(req, supabaseClient, body);
    } else if (action === 'webhook') {
      return await handleWebhook(supabaseClient, body);
    } else {
      throw new Error('Invalid action. Use: get_token, initialize, verify, webhook');
    }
  } catch (err) {
    const error = err as Error;
    console.error('[orange-money] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// ============================================================
// ACTION: get_token — OAuth2 token from Orange API
// ============================================================
async function handleGetToken() {
  const token = await getAccessToken();
  return new Response(
    JSON.stringify({ success: true, access_token: token }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function getAccessToken(): Promise<string> {
  // Return cached token if still valid (with 1h buffer)
  if (cachedToken && cachedToken.expiresAt > Date.now() + 3600000) {
    return cachedToken.token;
  }

  const authHeader = Deno.env.get('ORANGE_MONEY_AUTH_HEADER');
  if (!authHeader) {
    throw new Error('ORANGE_MONEY_AUTH_HEADER not configured');
  }

  const response = await fetch(`${ORANGE_API_BASE}/oauth/v3/token`, {
    method: 'POST',
    headers: {
      'Authorization': authHeader, // "Basic base64(client_id:client_secret)"
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json',
    },
    body: 'grant_type=client_credentials',
  });

  const data = await response.json();
  console.log('[orange-money] Token response status:', response.status);

  if (!response.ok || !data.access_token) {
    console.error('[orange-money] Token error:', JSON.stringify(data));
    throw new Error(data.error_description || data.error || 'Failed to get Orange Money access token');
  }

  // Cache the token (expires_in is in seconds)
  const expiresIn = data.expires_in || 7776000; // default 90 days
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + expiresIn * 1000,
  };

  return data.access_token;
}

// ============================================================
// ACTION: initialize — Create a web payment session
// ============================================================
async function handleInitialize(req: Request, supabaseClient: any, body: any) {
  // Auth check
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    throw new Error('Authorization required');
  }

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
  if (authError || !user) {
    throw new Error('Invalid authentication');
  }

  const { 
    amount: clientAmount, 
    email, 
    payment_type, 
    related_id, 
    metadata,
    return_url,
    cancel_url,
  } = body;

  // For order_balance payments, use server-side amount
  let amount = clientAmount;
  if (payment_type === 'order_balance' && related_id) {
    const { data: order, error: orderError } = await supabaseClient
      .from('orders')
      .select('balance_amount')
      .eq('id', related_id)
      .single();
    
    if (orderError || !order) {
      throw new Error('Order not found for balance payment');
    }
    amount = order.balance_amount;
    console.log(`[orange-money] order_balance: server amount=${amount}, client sent=${clientAmount}`);
  }

  if (!amount || amount <= 0) {
    throw new Error('Invalid amount');
  }

  const merchantKey = Deno.env.get('ORANGE_MONEY_MERCHANT_KEY');
  if (!merchantKey) {
    throw new Error('ORANGE_MONEY_MERCHANT_KEY not configured');
  }

  // Generate unique order_id (max 30 chars)
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 6);
  const orderId = `FERE_${timestamp}_${random}`.substring(0, 30);

  // Get access token
  const accessToken = await getAccessToken();

  // Build URLs (max 120 chars each)
  const origin = return_url 
    ? new URL(return_url).origin 
    : (req.headers.get('origin') || 'https://jajfuajmkjulujnwfqen.lovable.app');
  
  const finalReturnUrl = (return_url || `${origin}/payment/callback`).substring(0, 120);
  const finalCancelUrl = (cancel_url || `${origin}/checkout`).substring(0, 120);
  
  // Webhook URL = edge function URL
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const notifUrl = `${supabaseUrl}/functions/v1/orange-money-payment`.substring(0, 120);

  // Sandbox uses OUV, production uses XOF
  const currency = 'OUV';

  // Call Orange Money Web Payment API
  const omResponse = await fetch(`${ORANGE_API_BASE}/orange-money-webpay/dev/v1/webpayment`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({
      merchant_key: merchantKey,
      currency,
      order_id: orderId,
      amount: amount, // Integer, no x100 conversion
      return_url: finalReturnUrl,
      cancel_url: finalCancelUrl,
      notif_url: notifUrl,
      lang: 'fr',
    }),
  });

  const omData = await omResponse.json();
  console.log('[orange-money] Initialize response:', JSON.stringify(omData));

  if (!omResponse.ok || !omData.payment_url) {
    // Save failed attempt
    await supabaseClient.from('payment_transactions').insert({
      user_id: user.id,
      reference: orderId,
      amount,
      currency,
      status: 'failed',
      payment_type,
      related_id: related_id || null,
      metadata: { ...metadata, payment_type, orange_money_error: omData },
    });

    throw new Error(omData.message || omData.description || 'Failed to initialize Orange Money payment');
  }

  // Save transaction with pay_token and notif_token
  const { error: insertError } = await supabaseClient.from('payment_transactions').insert({
    user_id: user.id,
    reference: orderId,
    amount,
    currency,
    status: 'pending',
    payment_type,
    related_id: related_id || null,
    metadata: {
      ...metadata,
      payment_type,
      pay_token: omData.pay_token,
      notif_token: omData.notif_token,
    },
  });

  if (insertError) {
    console.error('[orange-money] Insert error:', insertError);
  }

  return new Response(
    JSON.stringify({
      success: true,
      payment_url: omData.payment_url,
      pay_token: omData.pay_token,
      notif_token: omData.notif_token,
      order_id: orderId,
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

// ============================================================
// ACTION: verify — Check transaction status
// ============================================================
async function handleVerify(req: Request, supabaseClient: any, body: any) {
  const { order_id, pay_token } = body;

  if (!order_id) {
    throw new Error('order_id is required');
  }

  // Get the transaction to retrieve pay_token if not provided
  const { data: transaction } = await supabaseClient
    .from('payment_transactions')
    .select('*')
    .eq('reference', order_id)
    .single();

  const finalPayToken = pay_token || transaction?.metadata?.pay_token;
  const amount = transaction?.amount;

  if (!finalPayToken || !amount) {
    throw new Error('Missing pay_token or amount for verification');
  }

  const accessToken = await getAccessToken();

  const omResponse = await fetch(`${ORANGE_API_BASE}/orange-money-webpay/dev/v1/transactionstatus`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({
      order_id,
      amount,
      pay_token: finalPayToken,
    }),
  });

  const omData = await omResponse.json();
  console.log('[orange-money] Verify response:', JSON.stringify(omData));

  // Map Orange Money status to our status
  const statusMap: Record<string, string> = {
    'SUCCESS': 'success',
    'INITIATED': 'pending',
    'PENDING': 'pending',
    'EXPIRED': 'failed',
    'FAILED': 'failed',
  };

  const omStatus = omData.status?.toUpperCase() || 'FAILED';
  const paymentStatus = statusMap[omStatus] || 'failed';

  // Update transaction
  if (transaction) {
    await supabaseClient
      .from('payment_transactions')
      .update({
        status: paymentStatus,
        paystack_response: omData, // Reusing this column for Orange Money response
        paid_at: paymentStatus === 'success' ? new Date().toISOString() : null,
      })
      .eq('reference', order_id);
  }

  return new Response(
    JSON.stringify({
      success: true,
      status: paymentStatus,
      reference: order_id,
      amount: transaction?.amount,
      currency: transaction?.currency,
      txnid: omData.txnid,
      metadata: transaction?.metadata,
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

// ============================================================
// ACTION: webhook — Receive Orange Money notifications
// ============================================================
async function handleWebhook(supabaseClient: any, body: any) {
  const { status, notif_token, txnid } = body;

  console.log('[orange-money] Webhook received:', JSON.stringify({ status, notif_token, txnid }));

  if (!notif_token) {
    console.error('[orange-money] Webhook: missing notif_token');
    return new Response(
      JSON.stringify({ received: true, error: 'missing notif_token' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Find the transaction by notif_token in metadata
  const { data: transactions } = await supabaseClient
    .from('payment_transactions')
    .select('*')
    .eq('status', 'pending');

  // Find matching transaction
  const transaction = transactions?.find((t: any) => 
    t.metadata?.notif_token === notif_token
  );

  if (!transaction) {
    console.error('[orange-money] Webhook: no matching transaction for notif_token');
    return new Response(
      JSON.stringify({ received: true, error: 'no matching transaction' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Map status
  const paymentStatus = status?.toUpperCase() === 'SUCCESS' ? 'success' : 'failed';

  // Update transaction
  await supabaseClient
    .from('payment_transactions')
    .update({
      status: paymentStatus,
      paystack_response: { webhook: body, txnid },
      paid_at: paymentStatus === 'success' ? new Date().toISOString() : null,
    })
    .eq('id', transaction.id);

  console.log(`[orange-money] Webhook: transaction ${transaction.reference} → ${paymentStatus}`);

  return new Response(
    JSON.stringify({ received: true }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
