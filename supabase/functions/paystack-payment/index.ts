import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PAYSTACK_SECRET_KEY = Deno.env.get('PAYSTACK_SECRET_KEY');
const PAYSTACK_BASE_URL = 'https://api.paystack.co';

interface InitializePaymentRequest {
  action: 'initialize';
  amount: number;
  email: string;
  payment_type: 'order' | 'service_booking' | 'subscription' | 'commission_payout' | 'tokens' | 'order_balance';
  related_id?: string;
  metadata?: Record<string, unknown>;
  callback_url?: string;
}

interface VerifyPaymentRequest {
  action: 'verify';
  reference: string;
}

interface WebhookRequest {
  action: 'webhook';
  event: string;
  data: Record<string, unknown>;
}

type PaymentRequest = InitializePaymentRequest | VerifyPaymentRequest | WebhookRequest;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json() as PaymentRequest;
    console.log('Paystack payment request:', JSON.stringify(body));

    if (body.action === 'initialize') {
      return await handleInitialize(req, supabaseClient, body);
    } else if (body.action === 'verify') {
      return await handleVerify(supabaseClient, body);
    } else if (body.action === 'webhook') {
      return await handleWebhook(req, supabaseClient);
    } else {
      throw new Error('Invalid action');
    }
  } catch (err) {
    const error = err as Error;
    console.error('Paystack payment error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

async function handleInitialize(
  req: Request,
  supabaseClient: any,
  body: InitializePaymentRequest
) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    throw new Error('Authorization required');
  }

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
  
  if (authError || !user) {
    throw new Error('Invalid authentication');
  }

  const { amount: clientAmount, email, payment_type, related_id, metadata, callback_url } = body;

  // For order_balance payments, use the server-side balance_amount from the order
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
    console.log(`order_balance: using server-side amount ${amount} (client sent ${clientAmount})`);
  }

  if (!amount || amount <= 0) {
    throw new Error('Invalid amount');
  }

  const reference = `FERE_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  const amountInKobo = Math.round(amount * 100);

  const { error: insertError } = await supabaseClient
    .from('payment_transactions')
    .insert({
      user_id: user.id,
      reference,
      amount,
      currency: 'XOF',
      status: 'pending',
      payment_type,
      related_id: related_id || null,
      metadata: { ...metadata, payment_type },
    });

  if (insertError) {
    console.error('Error creating transaction:', insertError);
    throw new Error('Failed to create transaction');
  }

  const paystackResponse = await fetch(`${PAYSTACK_BASE_URL}/transaction/initialize`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email,
      amount: amountInKobo,
      currency: 'XOF',
      reference,
      callback_url: callback_url || `${req.headers.get('origin')}/payment/callback`,
      metadata: {
        payment_type,
        related_id,
        user_id: user.id,
        ...metadata,
      },
    }),
  });

  const paystackData = await paystackResponse.json();
  console.log('Paystack initialize response:', JSON.stringify(paystackData));

  if (!paystackData.status) {
    await supabaseClient
      .from('payment_transactions')
      .update({ 
        status: 'failed',
        paystack_response: paystackData,
      })
      .eq('reference', reference);

    throw new Error(paystackData.message || 'Failed to initialize payment');
  }

  await supabaseClient
    .from('payment_transactions')
    .update({ paystack_response: paystackData })
    .eq('reference', reference);

  return new Response(
    JSON.stringify({
      success: true,
      reference,
      authorization_url: paystackData.data.authorization_url,
      access_code: paystackData.data.access_code,
    }),
    { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    }
  );
}

async function handleVerify(
  supabaseClient: any,
  body: VerifyPaymentRequest
) {
  const { reference } = body;

  if (!reference) {
    throw new Error('Reference is required');
  }

  const paystackResponse = await fetch(`${PAYSTACK_BASE_URL}/transaction/verify/${reference}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`,
    },
  });

  const paystackData = await paystackResponse.json();
  console.log('Paystack verify response:', JSON.stringify(paystackData));

  if (!paystackData.status) {
    throw new Error(paystackData.message || 'Failed to verify payment');
  }

  const transactionData = paystackData.data;
  const paymentStatus = transactionData.status === 'success' ? 'success' : 
                        transactionData.status === 'abandoned' ? 'abandoned' : 'failed';

  const { error: updateError } = await supabaseClient
    .from('payment_transactions')
    .update({
      status: paymentStatus,
      paystack_response: paystackData,
      paid_at: paymentStatus === 'success' ? new Date().toISOString() : null,
    })
    .eq('reference', reference);

  if (updateError) {
    console.error('Error updating transaction:', updateError);
  }

  return new Response(
    JSON.stringify({
      success: true,
      status: paymentStatus,
      reference,
      amount: transactionData.amount / 100,
      currency: transactionData.currency,
      paid_at: transactionData.paid_at,
      channel: transactionData.channel,
      metadata: transactionData.metadata,
    }),
    { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    }
  );
}

async function handleWebhook(
  req: Request,
  supabaseClient: any
) {
  const signature = req.headers.get('x-paystack-signature');
  const body = await req.text();
  
  const event = JSON.parse(body);
  console.log('Paystack webhook event:', JSON.stringify(event));

  if (event.event === 'charge.success') {
    const data = event.data;
    const reference = data.reference;

    await supabaseClient
      .from('payment_transactions')
      .update({
        status: 'success',
        paystack_response: event,
        paid_at: new Date().toISOString(),
      })
      .eq('reference', reference);

    console.log(`Payment ${reference} marked as successful via webhook`);
  }

  return new Response(
    JSON.stringify({ received: true }),
    { 
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    }
  );
}
