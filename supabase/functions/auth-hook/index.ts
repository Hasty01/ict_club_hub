import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    console.log("Auth Hook Payload:", JSON.stringify(payload, null, 2));

    const { user, email_data } = payload;
    const { token, token_hash, type, redirect_to } = email_data;

    // We only care about recovery (password reset) for now
    if (type !== "recovery") {
      // For other types, we can either return nothing (let Supabase send) 
      // or implement them here.
      return new Response(JSON.stringify({}), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Call our existing send-email function logic
    // Or just fetch directly to Resend to be faster
    const res = await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({
        to: user.email,
        templateId: "password_reset_otp",
        templateData: {
          code: token, // This is the 6-digit code for 'recovery' type
          url: redirect_to
        }
      })
    });

    if (!res.ok) {
        const error = await res.text();
        console.error("Failed to send email via hook:", error);
        throw new Error("Email sending failed");
    }

    // Return 200 to tell Supabase we handled the email
    return new Response(JSON.stringify({ status: "sent" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Auth Hook Error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
