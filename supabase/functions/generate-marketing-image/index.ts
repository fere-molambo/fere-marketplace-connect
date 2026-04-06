import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt, shopId } = await req.json();

    if (!prompt || !shopId) {
      return new Response(
        JSON.stringify({ error: "prompt and shopId are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get auth user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const supabaseClient = createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid user" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Generating image for shop ${shopId} by user ${user.id}`);
    console.log(`Prompt: ${prompt}`);

    // Call Pollinations.ai - free, no API key needed
    const encodedPrompt = encodeURIComponent(
      `Professional marketing poster: ${prompt}. Modern, visually appealing, suitable for social media marketing.`
    );
    const pollinationsUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=1024&nologo=true&seed=${Date.now()}`;

    console.log(`Calling Pollinations.ai...`);
    const imageResponse = await fetch(pollinationsUrl);

    if (!imageResponse.ok) {
      console.error("Pollinations error:", imageResponse.status);
      return new Response(
        JSON.stringify({ error: "Erreur lors de la génération de l'image. Veuillez réessayer." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const imageBytes = new Uint8Array(await imageResponse.arrayBuffer());
    console.log(`Image received: ${imageBytes.length} bytes`);

    // Upload to Supabase Storage
    const fileName = `${shopId}/${Date.now()}.png`;
    const { error: uploadError } = await supabase.storage
      .from("generated-images")
      .upload(fileName, imageBytes, {
        contentType: "image/png",
        upsert: false,
      });

    if (uploadError) {
      console.error("Storage upload error:", uploadError);
      return new Response(
        JSON.stringify({ error: "Erreur lors de la sauvegarde de l'image" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from("generated-images")
      .getPublicUrl(fileName);

    const imageUrl = publicUrlData.publicUrl;

    // Save to database
    const { data: insertedImage, error: dbError } = await supabase
      .from("generated_images")
      .insert({
        shop_id: shopId,
        prompt: prompt,
        image_url: imageUrl,
        model_used: "pollinations-flux",
        created_by: user.id,
      })
      .select()
      .single();

    if (dbError) {
      console.error("Database insert error:", dbError);
      return new Response(
        JSON.stringify({ error: "Erreur lors de la sauvegarde des métadonnées" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Image generated and saved: ${imageUrl}`);

    return new Response(
      JSON.stringify({ success: true, image: insertedImage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in generate-marketing-image:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
