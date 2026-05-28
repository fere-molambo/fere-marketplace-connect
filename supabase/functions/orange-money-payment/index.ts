import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ORANGE_API_BASE = 'https://api.orange.com';

// Cache the access token (valid ~90 days)
// Credentials rotated 2026-05-28 — bump to invalidate in-memory token cache on redeploy
let cachedToken: { token: string; expiresAt: number } | null = null;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    // Log only non-sensitive top-level fields for diagnostics
    console.log('[orange-money] Request received', JSON.stringify({
      action: body?.action,
      payment_type_top: body?.payment_type ?? null,
      payment_type_meta: body?.metadata?.payment_type ?? null,
      body_keys: Object.keys(body || {}),
      metadata_keys: Object.keys(body?.metadata || {}),
      amount: body?.amount,
      related_id: body?.related_id,
      has_return_url_top: !!body?.return_url,
      has_return_url_meta: !!body?.metadata?.return_url,
      has_cancel_url_top: !!body?.cancel_url,
      has_cancel_url_meta: !!body?.metadata?.cancel_url,
      origin: req.headers.get('origin') || null,
      user_agent: req.headers.get('user-agent') || null,
      app_version: req.headers.get('x-app-version') || null,
    }));

    const { action } = body;

    // Auto-detect Orange Money webhook (no `action` field, but has `notif_token` + `txnid`)
    const isOrangeWebhook = !action && !!body?.notif_token && !!body?.txnid;
    const ua = req.headers.get('user-agent') || '';
    const isOrangeUA = ua.toLowerCase().includes('mpayment');

    if (isOrangeWebhook || (isOrangeUA && !action)) {
      console.log('[orange-money] Webhook auto-detected', JSON.stringify({
        via: isOrangeWebhook ? 'body' : 'user_agent',
        has_notif_token: !!body?.notif_token,
        has_txnid: !!body?.txnid,
      }));
      return await handleWebhook(supabaseClient, body);
    }

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
    console.error('[orange-money] Error:', error?.message, error?.stack);
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
    console.log('[orange-money] OAuth: using cached token');
    return cachedToken.token;
  }

  // Prefer ORANGE_MONEY_AUTH_HEADER (copied verbatim from the Orange Developer
  // portal — guaranteed correct). Fall back to rebuilding from CLIENT_ID +
  // CLIENT_SECRET only if the env header is missing.
  const envAuthHeader = Deno.env.get('ORANGE_MONEY_AUTH_HEADER');
  const clientId = Deno.env.get('ORANGE_MONEY_CLIENT_ID');
  const clientSecret = Deno.env.get('ORANGE_MONEY_CLIENT_SECRET');
  let authHeader: string;
  let authSource: string;
  if (envAuthHeader && envAuthHeader.trim().length > 0) {
    const trimmed = envAuthHeader.trim();
    authHeader = trimmed.startsWith('Basic ') ? trimmed : `Basic ${trimmed}`;
    authSource = 'env_auth_header';
  } else if (clientId && clientSecret) {
    authHeader = 'Basic ' + btoa(`${clientId}:${clientSecret}`);
    authSource = 'rebuilt_from_client_id_secret';
  } else {
    throw new Error('Orange Money credentials missing: set ORANGE_MONEY_AUTH_HEADER or ORANGE_MONEY_CLIENT_ID + ORANGE_MONEY_CLIENT_SECRET');
  }
  console.log('[orange-money] OAuth: requesting new token', JSON.stringify({
    auth_source: authSource,
    auth_header_length: authHeader.length,
    client_id_present: !!clientId,
  }));

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
    console.error('[orange-money] OAuth failed', JSON.stringify({
      http_status: response.status,
      error: data?.error,
      error_description: data?.error_description,
      message: data?.message,
      auth_source: authSource,
    }));
    // User-friendly message: don't leak the raw Orange JSON to the UI
    if (data?.error === 'invalid_client' || response.status === 401) {
      throw new Error('Configuration Orange Money invalide (identifiants OAuth refusés). Vérifiez ORANGE_MONEY_CLIENT_ID et ORANGE_MONEY_CLIENT_SECRET.');
    }
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
    console.error('[orange-money] Auth: missing Authorization header');
    throw new Error('Authorization required');
  }

  const token = authHeader.replace('Bearer ', '');

  // Non-sensitive diagnostics: only metadata, never the full token
  const segments = token.split('.');
  let payloadInfo: Record<string, unknown> = { decodable: false };
  if (segments.length === 3) {
    try {
      const padded = segments[1] + '='.repeat((4 - segments[1].length % 4) % 4);
      const json = JSON.parse(atob(padded.replace(/-/g, '+').replace(/_/g, '/')));
      const now = Math.floor(Date.now() / 1000);
      payloadInfo = {
        decodable: true,
        has_sub: !!json.sub,
        role: json.role || null,
        iss: json.iss || null,
        exp: json.exp || null,
        expired: typeof json.exp === 'number' ? json.exp < now : null,
        aud: json.aud || null,
      };
    } catch (_e) {
      payloadInfo = { decodable: false, decode_error: true };
    }
  }
  console.log('[orange-money] Auth: token received', JSON.stringify({
    token_length: token.length,
    token_prefix: token.substring(0, 8),
    segments: segments.length,
    ...payloadInfo,
  }));

  const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
  if (authError || !user) {
    console.error('[orange-money] Auth: getUser failed', JSON.stringify({
      error_message: authError?.message || null,
      error_status: (authError as any)?.status || null,
      error_code: (authError as any)?.code || null,
      user_present: !!user,
    }));
    throw new Error('Invalid authentication');
  }
  console.log('[orange-money] Auth: user verified', JSON.stringify({ user_id: user.id }));

  const {
    amount: clientAmount,
    email,
    related_id,
    metadata,
  } = body;

  // Defensive read: accept payment_type / return_url / cancel_url either
  // at the top level of the body OR nested inside metadata. Some mobile
  // bundles may package them differently.
  const payment_type = body.payment_type ?? metadata?.payment_type ?? null;
  const return_url = body.return_url ?? metadata?.return_url ?? null;
  const cancel_url = body.cancel_url ?? metadata?.cancel_url ?? null;

  // Validate payment_type BEFORE calling Orange Money — otherwise the INSERT
  // into payment_transactions fails (NOT NULL constraint) and we end up with
  // an orphan payment at Orange Money that we can never track.
  const validTypes = ['order', 'order_balance', 'service_booking', 'tokens', 'subscription', 'commission_payout'];
  if (!payment_type || !validTypes.includes(payment_type)) {
    console.error('[orange-money] Invalid payment_type', JSON.stringify({
      received: payment_type,
      user_agent: req.headers.get('user-agent') || null,
    }));
    throw new Error(`payment_type is required and must be one of: ${validTypes.join(', ')}`);
  }

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

  // Build URLs (max 120 chars each).
  // Orange Money only accepts http(s) — deep links like `fere://` are rejected
  // with "Invalid body field" (code 24). When the mobile client sends a custom
  // scheme, fall back to canonical HTTPS URLs that the WebView can intercept
  // via onNavigationStateChange.
  const isHttp = (u: string | null) =>
    typeof u === 'string' && /^https?:\/\//i.test(u);

  const httpsOrigin = (() => {
    const reqOrigin = req.headers.get('origin');
    if (isHttp(reqOrigin)) return reqOrigin!;
    return 'https://fere.app';
  })();

  const returnScheme = typeof return_url === 'string' ? return_url.split(':')[0] : null;
  const cancelScheme = typeof cancel_url === 'string' ? cancel_url.split(':')[0] : null;

  const finalReturnUrl = (isHttp(return_url)
    ? return_url!
    : `${httpsOrigin}/payment/return.html?ref=${orderId}`
  ).substring(0, 120);

  const finalCancelUrl = (isHttp(cancel_url)
    ? cancel_url!
    : `${httpsOrigin}/payment/return.html?ref=${orderId}&cancel=1`
  ).substring(0, 120);

  if (!isHttp(return_url) || !isHttp(cancel_url)) {
    console.log('[orange-money] Sanitized non-http URLs', JSON.stringify({
      return_scheme: returnScheme,
      cancel_scheme: cancelScheme,
      using_origin: httpsOrigin,
    }));
  }
  
  // Webhook URL = edge function URL
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const notifUrl = `${supabaseUrl}/functions/v1/orange-money-payment`.substring(0, 120);

  // Production Mali: XOF currency, /ml/v1/ endpoints
  const currency = 'XOF';

  console.log('[orange-money] WebPay request', JSON.stringify({
    order_id: orderId,
    amount,
    currency,
    return_url_len: finalReturnUrl.length,
    cancel_url_len: finalCancelUrl.length,
    notif_url_len: notifUrl.length,
  }));

  // Call Orange Money Web Payment API (LIVE Mali)
  const omResponse = await fetch(`${ORANGE_API_BASE}/orange-money-webpay/ml/v1/webpayment`, {
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
  console.log('[orange-money] WebPay response', JSON.stringify({
    http_status: omResponse.status,
    has_payment_url: !!omData?.payment_url,
    pay_token_present: !!omData?.pay_token,
    notif_token_present: !!omData?.notif_token,
    message: omData?.message,
    description: omData?.description,
    code: omData?.code,
  }));

  if (!omResponse.ok || !omData.payment_url) {
    console.error('[orange-money] WebPay failed — saving transaction as failed', JSON.stringify({
      order_id: orderId,
      user_id: user.id,
      payment_type,
      amount,
    }));
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

  console.log('[orange-money] WebPay OK', JSON.stringify({
    order_id: orderId,
    user_id: user.id,
    payment_type,
  }));

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

  console.log('[orange-money] Verify start', JSON.stringify({
    order_id,
    pay_token_provided: !!pay_token,
  }));

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

  const omResponse = await fetch(`${ORANGE_API_BASE}/orange-money-webpay/ml/v1/transactionstatus`, {
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
  console.log('[orange-money] Verify response', JSON.stringify({
    http_status: omResponse.status,
    om_status: omData?.status,
    txnid: omData?.txnid,
    message: omData?.message,
  }));

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
