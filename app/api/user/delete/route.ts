import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    
    // Service Role Client to bypass RLS and perform admin actions
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get user from the Authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return NextResponse.json({ error: "Unauthorized (No header)" }, { status: 401 });
    
    const token = authHeader.replace("Bearer ", "");
    // Verify the token to get the user ID
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      console.error("Auth error:", authError);
      return NextResponse.json({ error: "Unauthorized (Invalid token)" }, { status: 401 });
    }

    console.log(`Deleting user: ${user.id} (${user.email})`);

    // Delete user from Supabase Auth
    // This will also cascade delete rows if foreign keys are set to ON DELETE CASCADE
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id);
    
    if (deleteError) {
      console.error("Delete user error:", deleteError);
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("User deletion error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
