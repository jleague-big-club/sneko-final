import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return NextResponse.json({ isPremium: false });

    const token = authHeader.replace("Bearer ", "");
    const { data: { user } } = await supabaseAdmin.auth.getUser(token);
    if (!user) return NextResponse.json({ isPremium: false });

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("is_premium")
      .eq("id", user.id)
      .single();

    return NextResponse.json({ isPremium: profile?.is_premium || false });
  } catch {
    return NextResponse.json({ isPremium: false });
  }
}
