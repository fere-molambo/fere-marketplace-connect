import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PAYSTACK_SECRET_KEY = Deno.env.get("PAYSTACK_SECRET_KEY");
const PAYSTACK_BASE_URL = "https://api.paystack.co";

interface InitiateRefundRequest {
  action: "initiate";
  refund_id: string;
}

interface VerifyRefundRequest {
  action: "verify";
  refund_id: string;
}

interface WebhookRequest {
  action: "webhook";
  event: string;
  data: any;
}

type RefundRequest = InitiateRefundRequest | VerifyRefundRequest | WebhookRequest;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: RefundRequest = await req.json();

    if (body.action === "initiate") {
      return await handleInitiateRefund(supabase, body);
    } else if (body.action === "verify") {
      return await handleVerifyRefund(supabase, body);
    } else if (body.action === "webhook") {
      return await handleWebhook(supabase, body);
    }

    return new Response(
      JSON.stringify({ error: "Invalid action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error processing refund:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function handleInitiateRefund(supabase: any, body: InitiateRefundRequest) {
  // Get refund record
  const { data: refund, error: refundError } = await supabase
    .from("refunds")
    .select("*, order:orders(payment_reference)")
    .eq("id", body.refund_id)
    .single();

  if (refundError || !refund) {
    throw new Error("Refund not found");
  }

  if (!refund.original_payment_reference && !refund.order?.payment_reference) {
    throw new Error("No payment reference found for refund");
  }

  const paymentReference = refund.original_payment_reference || refund.order?.payment_reference;

  // Update refund status to processing
  await supabase
    .from("refunds")
    .update({ refund_status: "processing" })
    .eq("id", body.refund_id);

  // Call Paystack Refund API
  const response = await fetch(`${PAYSTACK_BASE_URL}/refund`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      transaction: paymentReference,
      amount: refund.net_refund * 100, // Convert to kobo
    }),
  });

  const result = await response.json();

  if (!result.status) {
    // Refund failed
    await supabase
      .from("refunds")
      .update({
        refund_status: "failed",
        failure_reason: result.message || "Paystack refund failed",
      })
      .eq("id", body.refund_id);

    throw new Error(result.message || "Paystack refund failed");
  }

  // Update refund with Paystack ID
  await supabase
    .from("refunds")
    .update({
      paystack_refund_id: result.data.id?.toString(),
      paystack_refund_reference: result.data.reference,
      refund_status: result.data.status === "processed" ? "processed" : "processing",
      processed_at: result.data.status === "processed" ? new Date().toISOString() : null,
    })
    .eq("id", body.refund_id);

  return new Response(
    JSON.stringify({
      success: true,
      refund_id: result.data.id,
      status: result.data.status,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

async function handleVerifyRefund(supabase: any, body: VerifyRefundRequest) {
  // Get refund record
  const { data: refund, error: refundError } = await supabase
    .from("refunds")
    .select("*")
    .eq("id", body.refund_id)
    .single();

  if (refundError || !refund || !refund.paystack_refund_id) {
    throw new Error("Refund not found or no Paystack ID");
  }

  // Call Paystack to verify refund status
  const response = await fetch(`${PAYSTACK_BASE_URL}/refund/${refund.paystack_refund_id}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
    },
  });

  const result = await response.json();

  if (!result.status) {
    throw new Error(result.message || "Failed to verify refund");
  }

  // Update refund status
  const newStatus = result.data.status === "processed" ? "processed" : 
                   result.data.status === "failed" ? "failed" : "processing";

  await supabase
    .from("refunds")
    .update({
      refund_status: newStatus,
      processed_at: newStatus === "processed" ? new Date().toISOString() : null,
      failure_reason: newStatus === "failed" ? result.data.message : null,
    })
    .eq("id", body.refund_id);

  return new Response(
    JSON.stringify({
      success: true,
      status: newStatus,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

async function handleWebhook(supabase: any, body: WebhookRequest) {
  // Handle Paystack refund webhooks
  if (body.event === "refund.processed") {
    const paystackRefundId = body.data.id?.toString();

    await supabase
      .from("refunds")
      .update({
        refund_status: "processed",
        processed_at: new Date().toISOString(),
      })
      .eq("paystack_refund_id", paystackRefundId);
  } else if (body.event === "refund.failed") {
    const paystackRefundId = body.data.id?.toString();

    await supabase
      .from("refunds")
      .update({
        refund_status: "failed",
        failure_reason: body.data.message || "Refund processing failed",
      })
      .eq("paystack_refund_id", paystackRefundId);
  }

  return new Response(
    JSON.stringify({ received: true }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}
