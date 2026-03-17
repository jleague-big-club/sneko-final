import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the subscription ID from profiles
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("raw_subscription_id, is_premium")
      .eq("id", user.id)
      .single();

    if (!profile?.is_premium) {
      return NextResponse.json({ error: "スポンサーではありません" }, { status: 400 });
    }

    // Cancel the PayPal subscription via PayPal API
    if (profile.raw_subscription_id) {
      const paypalClientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;
      const paypalSecret = process.env.PAYPAL_SECRET;

      if (paypalClientId && paypalSecret) {
        try {
          // Get PayPal access token
          const tokenRes = await fetch("https://api-m.paypal.com/v1/oauth2/token", {
            method: "POST",
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
              "Authorization": "Basic " + Buffer.from(`${paypalClientId}:${paypalSecret}`).toString("base64"),
            },
            body: "grant_type=client_credentials",
          });
          const tokenData = await tokenRes.json();

          if (tokenData.access_token) {
            // Cancel the subscription
            await fetch(`https://api-m.paypal.com/v1/billing/subscriptions/${profile.raw_subscription_id}/cancel`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${tokenData.access_token}`,
              },
              body: JSON.stringify({ reason: "User requested cancellation" }),
            });
          }
        } catch (paypalErr) {
          console.error("PayPal cancellation error:", paypalErr);
          // Continue even if PayPal API fails - still update DB
        }
      }
    }

    // Update DB to remove premium status
    await supabaseAdmin
      .from("profiles")
      .update({ is_premium: false, raw_subscription_id: null })
      .eq("id", user.id);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Cancel subscription error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
