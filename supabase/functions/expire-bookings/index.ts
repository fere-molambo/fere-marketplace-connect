import { corsHeaders } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Find pending bookings past their auto_cancel_at
    const { data: expiredBookings, error: fetchError } = await supabase
      .from("service_bookings")
      .select("id, customer_id, travel_fee, travel_fee_paid")
      .eq("status", "pending")
      .lt("auto_cancel_at", new Date().toISOString())
      .not("auto_cancel_at", "is", null);

    if (fetchError) throw fetchError;

    let expiredCount = 0;

    for (const booking of expiredBookings || []) {
      // Update to expired
      const { error: updateError } = await supabase
        .from("service_bookings")
        .update({ status: "expired", updated_at: new Date().toISOString() })
        .eq("id", booking.id);

      if (updateError) {
        console.error(`Error expiring booking ${booking.id}:`, updateError);
        continue;
      }

      // Create refund if travel fee was paid
      if (booking.travel_fee_paid && booking.travel_fee > 0) {
        await supabase.from("refunds").insert({
          user_id: booking.customer_id,
          booking_id: booking.id,
          amount: booking.travel_fee,
          net_refund: booking.travel_fee,
          status: "pending",
          refund_status: "pending_manual",
        });
      }

      expiredCount++;
    }

    return new Response(
      JSON.stringify({ success: true, expired_count: expiredCount }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in expire-bookings:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});