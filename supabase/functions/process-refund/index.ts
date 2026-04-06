import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Orange Money does NOT have an automated refund API.
// Refunds are tracked in the database and processed manually by admins.

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();

    if (body.action === "initiate") {
      return await handleInitiateRefund(supabase, body);
    } else if (body.action === "verify") {
      return await handleVerifyRefund(supabase, body);
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

async function handleInitiateRefund(supabase: any, body: any) {
  const { refund_id } = body;

  // Get refund record
  const { data: refund, error: refundError } = await supabase
    .from("refunds")
    .select("*")
    .eq("id", refund_id)
    .single();

  if (refundError || !refund) {
    throw new Error("Refund not found");
  }

  // Orange Money has no automated refund API
  // Mark refund as pending_manual - admin will process it manually
  await supabase
    .from("refunds")
    .update({ 
      refund_status: "pending_manual",
    })
    .eq("id", refund_id);

  return new Response(
    JSON.stringify({
      success: true,
      status: "pending_manual",
      message: "Le remboursement a été enregistré. L'équipe le traitera manuellement.",
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

async function handleVerifyRefund(supabase: any, body: any) {
  const { refund_id } = body;

  const { data: refund, error: refundError } = await supabase
    .from("refunds")
    .select("*")
    .eq("id", refund_id)
    .single();

  if (refundError || !refund) {
    throw new Error("Refund not found");
  }

  return new Response(
    JSON.stringify({
      success: true,
      status: refund.refund_status,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}